"""Parse Dirty South Trivia .docx files into structured JSON."""

import json
import re
from dataclasses import dataclass, field, asdict
from pathlib import Path

from docx import Document


@dataclass
class Question:
    number: int
    text: str
    answer: str
    choices: list[str] = field(default_factory=list)  # for multiple choice
    is_internet_only: bool = False


@dataclass
class Round:
    number: int
    title: str  # e.g., "Random", "Zero Proof"
    round_type: str  # "standard", "video", "progressive", "list"
    points_per_question: int = 1
    joker_eligible: bool = True
    theme_description: str = ""
    questions: list[Question] = field(default_factory=list)
    # For progressive reveal rounds (Guess Who/Where)
    clues: list[dict] = field(default_factory=list)  # [{points: 10, text: "..."}, ...]
    progressive_answer: str = ""


@dataclass
class MiniGame:
    number: int
    title: str
    description: str


@dataclass
class Quiz:
    quiz_number: int
    date: str
    rounds: list[Round] = field(default_factory=list)
    mini_games: list[MiniGame] = field(default_factory=list)
    tie_breaker_question: str = ""
    tie_breaker_answer: str = ""

    def to_dict(self):
        return asdict(self)


def parse_docx(path: str | Path) -> Quiz:
    """Parse a Dirty South Trivia .docx file into a Quiz object."""
    doc = Document(str(path))
    paragraphs = [p.text.strip() for p in doc.paragraphs]

    # Extract quiz number and date from first non-empty line
    quiz_number = 0
    date = ""
    for p in paragraphs:
        if m := re.match(r"Pub Quiz (\d+)\s*[–-]\s*(.+)", p):
            quiz_number = int(m.group(1))
            date = m.group(2).strip()
            break

    quiz = Quiz(quiz_number=quiz_number, date=date)

    # Find all round starts, mini games, and tie breaker
    sections = []
    for i, p in enumerate(paragraphs):
        # Round header (the detailed one, not the overview list)
        # Match "Round N - Title" that appears AFTER the overview section
        if rm := re.match(r"Round\s+(\d+)\s*[–-]\s*(.+)", p):
            sections.append(("round", i, int(rm.group(1)), rm.group(2).strip()))
        elif re.match(r"Mini Game \d+", p, re.IGNORECASE):
            sections.append(("minigame", i, 0, p))
        elif re.match(r"Tie\s*Breaker", p, re.IGNORECASE):
            sections.append(("tiebreaker", i, 0, ""))

    # Deduplicate rounds — the overview lists rounds briefly, then they appear in detail
    # Keep only the LAST occurrence of each round number (the detailed one)
    seen_rounds = {}
    for s in sections:
        if s[0] == "round":
            seen_rounds[s[2]] = s
    deduped = []
    used_round_nums = set()
    for s in sections:
        if s[0] == "round":
            if s[2] not in used_round_nums:
                # Skip overview entries — use the last one
                used_round_nums.add(s[2])
                continue
            deduped.append(seen_rounds[s[2]])
        else:
            deduped.append(s)
    # Actually simpler: just take sections where the round has content after it
    # Deduplicate rounds — keep only the LAST occurrence of each round number
    # (the overview lists them first briefly, then the detailed version appears later)
    last_round_idx = {}  # round_num -> index in sections
    for i, s in enumerate(sections):
        if s[0] == "round":
            last_round_idx[s[2]] = i

    sections = [
        s for i, s in enumerate(sections)
        if s[0] != "round" or last_round_idx.get(s[2]) == i
    ]

    # Process each section
    for idx, section in enumerate(sections):
        # Determine section boundaries
        start_line = section[1]
        if idx + 1 < len(sections):
            end_line = sections[idx + 1][1]
        else:
            end_line = len(paragraphs)

        section_text = paragraphs[start_line:end_line]

        if section[0] == "round":
            round_obj = _parse_round(section[2], section[3], section_text)
            quiz.rounds.append(round_obj)
        elif section[0] == "minigame":
            mg = _parse_mini_game(section_text)
            quiz.mini_games.append(mg)
        elif section[0] == "tiebreaker":
            q, a = _parse_tie_breaker(section_text)
            quiz.tie_breaker_question = q
            quiz.tie_breaker_answer = a

    return quiz


def _parse_round(round_num: int, title: str, lines: list[str]) -> Round:
    """Parse a round section into a Round object."""
    # Detect round type
    is_video = "video" in title.lower() or any("video" in l.lower() and "montage" in l.lower() for l in lines[:5])
    is_progressive = any(re.match(r"\d+\s+POINTS?:", l) for l in lines)

    # Scoring
    points = 1
    joker = True
    description = ""

    for l in lines[:10]:
        if m := re.match(r"(\d+)\s+Points?\s+Per\s+Correct\s+Answer", l, re.IGNORECASE):
            points = int(m.group(1))
        if "joker is not in play" in l.lower() or "no joker" in l.lower():
            joker = False
        # Theme description — lines that aren't round headers, scoring, or questions
        if (l and not re.match(r"Round\s+\d+", l) and
            "point" not in l.lower() and "joker" not in l.lower() and
            not re.match(r"\d+\.", l) and
            "video montage" not in l.lower() and
            "youtube" not in l.lower()):
            if not description and len(l) > 20:
                description = l

    if is_progressive:
        return _parse_progressive_round(round_num, title, lines, points, joker, description)

    round_type = "video" if is_video else "standard"
    rnd = Round(
        number=round_num, title=title, round_type=round_type,
        points_per_question=points, joker_eligible=joker,
        theme_description=description,
    )

    # Extract questions and answers
    i = 0
    while i < len(lines):
        line = lines[i]
        # Match question lines: "N. question text" or "N.  question text"
        qm = re.match(r"(\d+)\.\s+(.+)", line)
        if qm:
            q_num = int(qm.group(1))
            q_text = qm.group(2).strip()

            is_internet = "internet" in q_text.lower() and "question" in q_text.lower()

            # Look ahead for choices (A. B. C. D.) or answer
            choices = []
            answer = ""
            j = i + 1
            while j < len(lines):
                next_line = lines[j]
                if not next_line:
                    j += 1
                    continue
                # Check if it's a choice
                if re.match(r"[A-D]\.\s+", next_line):
                    choices.append(next_line)
                    if "correct" in next_line.lower() or "✅" in next_line:
                        # Extract answer from correct choice
                        answer = re.sub(r"[A-D]\.\s+", "", next_line)
                        answer = re.sub(r"\s*\(?\s*✅?\s*Correct\s*\)?\s*", "", answer, flags=re.IGNORECASE).strip()
                    j += 1
                elif re.match(r"\d+\.\s+", next_line):
                    # Next question — stop
                    break
                elif next_line.startswith("Please turn") or next_line.startswith("Round "):
                    break
                else:
                    if not answer and not re.match(r"[A-D]\.\s+", next_line):
                        answer = next_line
                    j += 1
                    break

            # For multiple choice without explicit correct marker, answer is after choices
            if choices and not answer:
                # Look for answer after choices
                while j < len(lines) and not lines[j]:
                    j += 1
                if j < len(lines) and not re.match(r"\d+\.\s+", lines[j]):
                    answer = lines[j]

            rnd.questions.append(Question(
                number=q_num, text=q_text, answer=answer,
                choices=choices, is_internet_only=is_internet,
            ))
            i = j
        else:
            i += 1

    return rnd


def _parse_progressive_round(round_num, title, lines, points, joker, description) -> Round:
    """Parse a Guess Who/Where progressive reveal round."""
    rnd = Round(
        number=round_num, title=title, round_type="progressive",
        points_per_question=0, joker_eligible=joker,
        theme_description=description,
    )

    for i, line in enumerate(lines):
        if m := re.match(r"(\d+)\s+POINTS?:\s*(.+)", line):
            rnd.clues.append({"points": int(m.group(1)), "text": m.group(2).strip()})
        elif line.startswith("ANSWER:"):
            rnd.progressive_answer = line.replace("ANSWER:", "").strip()

    # If no explicit ANSWER line, look for standalone answer after clues
    if not rnd.progressive_answer and rnd.clues:
        # Find the line after the last clue
        last_clue_idx = 0
        for i, line in enumerate(lines):
            if re.match(r"\d+\s+POINTS?:", line):
                last_clue_idx = i
        for j in range(last_clue_idx + 1, len(lines)):
            if lines[j] and not lines[j].startswith("Please") and "pens" not in lines[j].lower():
                rnd.progressive_answer = lines[j]
                break

    return rnd


def _parse_mini_game(lines: list[str]) -> MiniGame:
    """Parse a mini game section."""
    title = lines[0] if lines else ""
    # Extract the mini game number
    num_match = re.match(r"Mini Game (\d+)", title, re.IGNORECASE)
    num = int(num_match.group(1)) if num_match else 0
    # Clean title
    title = re.sub(r"Mini Game \d+\s*[–-]\s*", "", title).strip()
    desc = "\n".join(l for l in lines[1:] if l)
    return MiniGame(number=num, title=title, description=desc)


def _parse_tie_breaker(lines: list[str]) -> tuple[str, str]:
    """Parse the tie breaker section."""
    question = ""
    answer = ""
    for i, line in enumerate(lines):
        if re.match(r"Tie\s*Breaker:", line, re.IGNORECASE):
            question = re.sub(r"Tie\s*Breaker:\s*", "", line).strip()
        elif "price is right" in line.lower():
            continue
        elif question and not answer and line and "make an announcement" not in line.lower():
            answer = line
    return question, answer


def parse_folder(folder: str | Path) -> list[Quiz]:
    """Parse all .docx files in a folder."""
    folder = Path(folder)
    quizzes = []
    for f in sorted(folder.glob("*.docx")):
        if f.name.startswith("~$"):  # skip temp files
            continue
        try:
            quiz = parse_docx(f)
            quizzes.append(quiz)
            print(f"Parsed: {f.name} → Quiz #{quiz.quiz_number} ({quiz.date})")
        except Exception as e:
            print(f"Error parsing {f.name}: {e}")
    return quizzes


if __name__ == "__main__":
    import sys

    path = sys.argv[1] if len(sys.argv) > 1 else "bank"
    p = Path(path)

    if p.is_dir():
        quizzes = parse_folder(p)
        for q in quizzes:
            print(f"\nQuiz #{q.quiz_number} — {q.date}")
            for r in q.rounds:
                if r.round_type == "progressive":
                    print(f"  Round {r.number}: {r.title} ({r.round_type}, {len(r.clues)} clues → {r.progressive_answer})")
                else:
                    print(f"  Round {r.number}: {r.title} ({r.round_type}, {len(r.questions)}Q, {r.points_per_question}pt, joker={'Y' if r.joker_eligible else 'N'})")
            for mg in q.mini_games:
                print(f"  Mini Game {mg.number}: {mg.title}")
            if q.tie_breaker_question:
                print(f"  Tie Breaker: {q.tie_breaker_question[:60]}...")
    else:
        quiz = parse_docx(p)
        print(json.dumps(quiz.to_dict(), indent=2))
