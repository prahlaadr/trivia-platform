"""Replicate NYC Trivia League packets as hostable quiz_<N>.json (REPLICATE path).

The packets are 2-column PDF tables: question text on the left, answers on the
right as `fuzzy[Primary] | fuzzy[Alias]`. pdftotext -layout keeps each answer on
its question's rows, and the `^N ` number markers (1-8) bound each question. We
keep only the Q/A rounds (skip Music / Picture / List), take the first fuzzy[]
as the answer, and emit the site's quiz schema so these host unchanged.

    uv run python scripts/ingest/parse_nyc_pdf.py ~/Downloads/P287.pdf          # preview one
    uv run python scripts/ingest/parse_nyc_pdf.py ~/Downloads/P287.pdf --apply  # write quiz_<N>.json
    uv run python scripts/ingest/parse_nyc_pdf.py ~/Downloads/*.pdf --apply     # all packets
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA_WEB = REPO / "web" / "public" / "data"
DATA_SRC = REPO / "data"

ROUND_HDR = re.compile(r"(?mi)^\s*Round\s+(One|Two|Three|Four|Five|Six|\d+)\b.*$")
SKIP_ROUND = re.compile(r"(?i)\b(list round|music round|picture round)\b")
# NYC marks correct answers as fuzzy[...] (loose match) or Exact[...] (strict,
# often numbers); incorrect[...] marks wrong answers and must be ignored.
ANSWER = re.compile(r"(?i)(?:fuzzy|exact)\[\s*([^\]]*?)\s*\]", re.S)
ANSWER_OPEN = re.compile(r"(?i)(?:fuzzy|exact)\[")
NUM_MARK = re.compile(r"(?m)^\s*([1-8])\s+\S")


def pdf_text(path: Path) -> str:
    return subprocess.run(
        ["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True
    ).stdout


def split_cols(block: str) -> tuple[str, str]:
    """Separate the question column from the answer column per row. The answer
    column starts at 'fuzzy[' on answer rows, or is a trailing chunk after a wide
    whitespace gap on wrapped-answer continuation rows. Without this, an answer
    that wraps across lines ('fuzzy[Laura' ... 'Winslow]') swallows the question
    text sitting between its halves in the 2-column flatten."""
    qcol, acol = [], []
    for line in block.splitlines():
        m = ANSWER_OPEN.search(line)
        if m:
            qcol.append(line[: m.start()])
            acol.append(line[m.start():])
            continue
        # wrapped-answer continuation row: a trailing chunk ending in ']' with no
        # matching '[' (the opener is on the previous row).
        parts = re.split(r"\s{4,}", line.rstrip())
        if len(parts) > 1 and parts[-1].rstrip().endswith("]") and "[" not in parts[-1]:
            qcol.append(" ".join(parts[:-1]))
            acol.append(parts[-1])
        else:
            qcol.append(line)
    return " ".join(qcol), " ".join(acol)


def clean_q(text: str, qnum: int) -> str:
    # collapse first (blocks span multiple layout lines), then strip the column
    # headers + round-intro preamble that only precede question 1.
    text = ANSWER.sub(" ", text)
    # scrub any residual answer-marker fragments a wrapped answer left behind
    text = re.sub(r"(?i)(?:fuzzy|exact|incorrect)\[", " ", text)
    text = re.sub(r"\s+\S*\]", " ", text)  # orphan continuation like " Toomes]"
    text = text.replace("|", " ")  # 2-column separator leaks into the flatten
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"(?i)^#?\s*Question Text\s+Answers\s*", "", text)
    text = re.sub(r"(?i)^.*?\bQuestion\s*#?\s*\d+\s*:\s*", "", text, count=1)  # inline "Question #1:"
    text = re.sub(r"(?i)^\s*(In this round|Each (answer|question) in this round)\b.*?[:.]\s+", "", text)
    # cut host-instruction trailers that follow the last question in the block
    text = re.split(
        r"(?i)\b(Note on round order|Note for hosts|Hosts,|Remind players|"
        r"This is a (?:List|Music|Picture) Round|Here is your question)\b",
        text,
    )[0].strip()
    text = re.sub(r"(?i)\s*when answering\s*$", "", text)
    # the row-number marker (this question's own number) leaks in mid-sentence at
    # the wrapped-line boundary; drop its first standalone occurrence.
    text = re.sub(rf"(?<=\s){qnum}(?=\s)", " ", text, count=1)
    text = re.sub(r"^[1-8]\s+", "", text)  # stray leading marker
    return re.sub(r"\s+", " ", text).strip()


def parse_round(title: str, body: str) -> dict | None:
    if SKIP_ROUND.search(title) or not ANSWER_OPEN.search(body):
        return None
    # cut the host answer-key recap that follows the round (reprints numbered
    # answers with incorrect[]/notes and would double the question count).
    cut = re.search(r"(?i)tie-?\s*breaker", body)
    if cut:
        body = body[: cut.start()]
    marks = list(NUM_MARK.finditer(body))
    if len(marks) < 6:  # a real Q/A round has ~8 numbered questions
        return None
    # block N spans from the end of marker N-1's line to the end of marker N's line
    bounds = []
    start = 0
    for m in marks:
        line_end = body.find("\n", m.end())
        line_end = len(body) if line_end == -1 else line_end
        bounds.append((start, line_end))
        start = line_end
    # the last question's text can wrap past its own number marker (nothing
    # bounds it), so extend its block to the round end (already cut at tiebreaker).
    if bounds:
        bounds[-1] = (bounds[-1][0], len(body))
    questions = []
    for i, (a, b) in enumerate(bounds):
        block = body[a:b]
        qcol, acol = split_cols(block)
        ans = ANSWER.findall(acol)
        qtext = clean_q(qcol, i + 1)
        primary = re.sub(r"\s+", " ", ans[0]).strip() if ans else ""
        if qtext and primary:
            questions.append({
                "number": i + 1, "text": qtext, "answer": primary,
                "choices": [], "is_internet_only": False,
            })
    if len(questions) < 6:
        return None
    # round title: the theme after "Round X:" up to the "Points" column header or
    # the 2+ space gap before the layout's right-column note.
    raw = re.sub(r"(?i)^\s*Round\s+[^:]*:?\s*", "", title.strip())
    theme = re.split(r"\s{2,}|\bPoints\b", raw)[0].strip() or "Themed Round"
    nice = theme.title() if theme.isupper() else theme
    return {
        "number": 0, "title": nice,
        "round_type": "standard", "points_per_question": 1, "joker_eligible": False,
        "theme_description": f"Connection round: every answer ties to {nice}.",
        "questions": questions, "clues": [], "progressive_answer": "",
    }


def parse_packet(path: Path) -> dict:
    text = pdf_text(path)
    hdrs = list(ROUND_HDR.finditer(text))
    rounds = []
    for i, h in enumerate(hdrs):
        body = text[h.end(): hdrs[i + 1].start() if i + 1 < len(hdrs) else len(text)]
        r = parse_round(h.group(0), body)
        if r:
            r["number"] = len(rounds) + 1
            rounds.append(r)
    # quiz number from the packet name (P287 -> 287, Z255 -> 255)
    m = re.search(r"(\d+)", path.stem)
    qnum = int(m.group(1)) if m else 0
    return {
        "quiz_number": qnum, "date": "2026-01-01", "rounds": rounds,
        "mini_games": [], "tie_breaker_question": "", "tie_breaker_answer": "",
        "_source_packet": path.stem,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("pdfs", nargs="+", type=Path)
    ap.add_argument("--apply", action="store_true", help="write quiz_<N>.json")
    a = ap.parse_args()
    for pdf in a.pdfs:
        quiz = parse_packet(pdf)
        nq = sum(len(r["questions"]) for r in quiz["rounds"])
        print(f"\n{pdf.stem} -> quiz_{quiz['quiz_number']}  "
              f"{len(quiz['rounds'])} Q/A rounds, {nq} questions")
        for r in quiz["rounds"]:
            print(f"  R{r['number']} {r['title']!r} ({len(r['questions'])} Qs)")
            for q in r["questions"][:3]:
                print(f"     {q['number']}. {q['text'][:70]}  ->  {q['answer']}")
        if a.apply:
            quiz.pop("_source_packet", None)
            body = json.dumps(quiz, indent=2, ensure_ascii=False)
            for d in (DATA_WEB, DATA_SRC):
                d.mkdir(parents=True, exist_ok=True)
                (d / f"quiz_{quiz['quiz_number']}.json").write_text(body)
            print(f"  wrote quiz_{quiz['quiz_number']}.json -> /present/{quiz['quiz_number']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
