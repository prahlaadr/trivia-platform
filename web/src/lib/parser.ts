import mammoth from "mammoth";
import type { Quiz, Round, Question, MiniGame } from "./types";

export async function parseDocx(buffer: Buffer): Promise<Quiz> {
  const result = await mammoth.extractRawText({ buffer });
  const paragraphs = result.value.split("\n").map((l) => l.trim());

  // Extract quiz number and date from first non-empty line
  let quizNumber = 0;
  let date = "";
  for (const p of paragraphs) {
    const m = p.match(/^Pub Quiz (\d+)\s*[–-]\s*(.+)/);
    if (m) {
      quizNumber = parseInt(m[1]);
      date = m[2].trim();
      break;
    }
  }

  const quiz: Quiz = {
    quiz_number: quizNumber,
    date,
    rounds: [],
    mini_games: [],
    tie_breaker_question: "",
    tie_breaker_answer: "",
  };

  // Find all section starts
  type Section = ["round" | "minigame" | "tiebreaker", number, number, string];
  const sections: Section[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const rm = p.match(/^Round\s+(\d+)\s*[–-]\s*(.+)/);
    if (rm) {
      sections.push(["round", i, parseInt(rm[1]), rm[2].trim()]);
    } else if (/^Mini Game \d+/i.test(p)) {
      sections.push(["minigame", i, 0, p]);
    } else if (/^Tie\s*Breaker/i.test(p)) {
      sections.push(["tiebreaker", i, 0, ""]);
    }
  }

  // Deduplicate rounds — keep only the LAST occurrence of each round number
  const lastRoundIdx: Record<number, number> = {};
  for (let i = 0; i < sections.length; i++) {
    if (sections[i][0] === "round") {
      lastRoundIdx[sections[i][2]] = i;
    }
  }
  const deduped = sections.filter(
    (s, i) => s[0] !== "round" || lastRoundIdx[s[2]] === i
  );

  // Process each section
  for (let idx = 0; idx < deduped.length; idx++) {
    const section = deduped[idx];
    const startLine = section[1];
    const endLine =
      idx + 1 < deduped.length ? deduped[idx + 1][1] : paragraphs.length;
    const sectionText = paragraphs.slice(startLine, endLine);

    if (section[0] === "round") {
      quiz.rounds.push(parseRound(section[2], section[3], sectionText));
    } else if (section[0] === "minigame") {
      quiz.mini_games.push(parseMiniGame(sectionText));
    } else if (section[0] === "tiebreaker") {
      const [q, a] = parseTieBreaker(sectionText);
      quiz.tie_breaker_question = q;
      quiz.tie_breaker_answer = a;
    }
  }

  return quiz;
}

function parseRound(
  roundNum: number,
  title: string,
  lines: string[]
): Round {
  const isVideo =
    title.toLowerCase().includes("video") ||
    lines
      .slice(0, 5)
      .some(
        (l) =>
          l.toLowerCase().includes("video") &&
          l.toLowerCase().includes("montage")
      );
  const isProgressive = lines.some((l) => /^\d+\s+POINTS?:/.test(l));

  let points = 1;
  let joker = true;
  let description = "";

  for (const l of lines.slice(0, 10)) {
    const pm = l.match(/^(\d+)\s+Points?\s+Per\s+Correct\s+Answer/i);
    if (pm) points = parseInt(pm[1]);
    if (
      l.toLowerCase().includes("joker is not in play") ||
      l.toLowerCase().includes("no joker")
    )
      joker = false;
    if (
      l &&
      !/^Round\s+\d+/.test(l) &&
      !l.toLowerCase().includes("point") &&
      !l.toLowerCase().includes("joker") &&
      !/^\d+\./.test(l) &&
      !l.toLowerCase().includes("video montage") &&
      !l.toLowerCase().includes("youtube")
    ) {
      if (!description && l.length > 20) description = l;
    }
  }

  if (isProgressive) {
    return parseProgressiveRound(
      roundNum,
      title,
      lines,
      points,
      joker,
      description
    );
  }

  const roundType = isVideo ? "video" : "standard";
  const rnd: Round = {
    number: roundNum,
    title,
    round_type: roundType,
    points_per_question: points,
    joker_eligible: joker,
    theme_description: description,
    questions: [],
    clues: [],
    progressive_answer: "",
  };

  // Extract questions and answers
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const qm = line.match(/^(\d+)\.\s+(.+)/);
    if (qm) {
      const qNum = parseInt(qm[1]);
      const qText = qm[2].trim();
      const isInternet =
        qText.toLowerCase().includes("internet") &&
        qText.toLowerCase().includes("question");

      const choices: string[] = [];
      let answer = "";
      let j = i + 1;

      while (j < lines.length) {
        const nextLine = lines[j];
        if (!nextLine) {
          j++;
          continue;
        }
        if (/^[A-D]\.\s+/.test(nextLine)) {
          choices.push(nextLine);
          if (
            nextLine.toLowerCase().includes("correct") ||
            nextLine.includes("✅")
          ) {
            answer = nextLine.replace(/^[A-D]\.\s+/, "");
            answer = answer
              .replace(/\s*\(?\s*✅?\s*Correct\s*\)?\s*/i, "")
              .trim();
          }
          j++;
        } else if (/^\d+\.\s+/.test(nextLine)) {
          break;
        } else if (
          nextLine.startsWith("Please turn") ||
          nextLine.startsWith("Round ")
        ) {
          break;
        } else {
          if (!answer && !/^[A-D]\.\s+/.test(nextLine)) {
            answer = nextLine;
          }
          j++;
          break;
        }
      }

      // For multiple choice without explicit correct marker
      if (choices.length && !answer) {
        while (j < lines.length && !lines[j]) j++;
        if (j < lines.length && !/^\d+\.\s+/.test(lines[j])) {
          answer = lines[j];
        }
      }

      rnd.questions.push({
        number: qNum,
        text: qText,
        answer,
        choices,
        is_internet_only: isInternet,
      });
      i = j;
    } else {
      i++;
    }
  }

  return rnd;
}

function parseProgressiveRound(
  roundNum: number,
  title: string,
  lines: string[],
  _points: number,
  joker: boolean,
  description: string
): Round {
  const rnd: Round = {
    number: roundNum,
    title,
    round_type: "progressive",
    points_per_question: 0,
    joker_eligible: joker,
    theme_description: description,
    questions: [],
    clues: [],
    progressive_answer: "",
  };

  for (const line of lines) {
    const m = line.match(/^(\d+)\s+POINTS?:\s*(.+)/);
    if (m) {
      rnd.clues.push({ points: parseInt(m[1]), text: m[2].trim() });
    } else if (line.startsWith("ANSWER:")) {
      rnd.progressive_answer = line.replace("ANSWER:", "").trim();
    }
  }

  if (!rnd.progressive_answer && rnd.clues.length) {
    let lastClueIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/^\d+\s+POINTS?:/.test(lines[i])) lastClueIdx = i;
    }
    for (let j = lastClueIdx + 1; j < lines.length; j++) {
      if (
        lines[j] &&
        !lines[j].startsWith("Please") &&
        !lines[j].toLowerCase().includes("pens")
      ) {
        rnd.progressive_answer = lines[j];
        break;
      }
    }
  }

  return rnd;
}

function parseMiniGame(lines: string[]): MiniGame {
  const header = lines[0] || "";
  const numMatch = header.match(/^Mini Game (\d+)/i);
  const num = numMatch ? parseInt(numMatch[1]) : 0;
  const title = header.replace(/^Mini Game \d+\s*[–-]\s*/, "").trim();
  const desc = lines
    .slice(1)
    .filter((l) => l)
    .join("\n");
  return { number: num, title, description: desc };
}

function parseTieBreaker(lines: string[]): [string, string] {
  let question = "";
  let answer = "";
  for (const line of lines) {
    if (/^Tie\s*Breaker:/i.test(line)) {
      question = line.replace(/^Tie\s*Breaker:\s*/i, "").trim();
    } else if (line.toLowerCase().includes("price is right")) {
      continue;
    } else if (
      question &&
      !answer &&
      line &&
      !line.toLowerCase().includes("make an announcement")
    ) {
      answer = line;
    }
  }
  return [question, answer];
}
