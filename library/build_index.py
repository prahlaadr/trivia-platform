# /// script
# requires-python = ">=3.11"
# dependencies = ["duckdb", "ijson", "python-docx", "pypdf"]
# ///
"""Build the Pyaar Trivia Library index (DuckDB + full-text search).

Sources:
  - TriviaQA Unfiltered loose Q&A, from V3 /triviaqa-unfiltered (train + dev) -> `questions`
  - Atlanta pub-quiz .docx full rounds (trivia-platform/bank + ~/Downloads)   -> `rounds` (raw text)
  - NYC Trivia League .pdf full rounds (~/Downloads P*/Z*)                     -> `rounds` (raw text)

Output: library/trivia_library.duckdb (gitignored; regenerable). Idempotent per
source (deletes that source's rows, then reloads). The raw 2.8GB TriviaQA + the
docs stay where they are; this index is the compact, portable artifact.

Usage:
  uv run build_index.py triviaqa-dev atlanta nyc   # fast first pass (~minutes)
  uv run build_index.py triviaqa-train             # the big 2.4GB file (slow; run in background)
  uv run build_index.py all
"""
import glob
import hashlib
import os
import sys
from pathlib import Path

import duckdb

HERE = Path(__file__).parent
DB = HERE / "trivia_library.duckdb"
V3 = Path("/Volumes/vision 3.0/triviaqa-unfiltered")
BANK = HERE.parent / "bank"
DOWNLOADS = Path.home() / "Downloads"


def schema(con):
    con.execute("""CREATE TABLE IF NOT EXISTS questions(
        id VARCHAR, source VARCHAR, question VARCHAR, answer VARCHAR,
        aliases VARCHAR, provenance VARCHAR)""")
    con.execute("""CREATE TABLE IF NOT EXISTS rounds(
        id VARCHAR, source VARCHAR, title VARCHAR, provenance VARCHAR,
        raw_text VARCHAR, n_chars INTEGER)""")


def load_triviaqa(con, path, source):
    import ijson
    con.execute("DELETE FROM questions WHERE source=?", [source])
    batch, total = [], 0
    with open(path, "rb") as f:
        for e in ijson.items(f, "Data.item"):
            q = e.get("Question") or ""
            if not q:
                continue
            a = e.get("Answer") or {}
            qid = e.get("QuestionId") or hashlib.md5(q.encode()).hexdigest()[:16]
            batch.append([f"{source}:{qid}", source, q, a.get("Value"),
                          "|".join(a.get("Aliases") or []), e.get("QuestionSource")])
            if len(batch) >= 5000:
                con.executemany("INSERT INTO questions VALUES(?,?,?,?,?,?)", batch)
                total += len(batch)
                batch = []
    if batch:
        con.executemany("INSERT INTO questions VALUES(?,?,?,?,?,?)", batch)
        total += len(batch)
    return total


def docx_text(path):
    from docx import Document
    try:
        return "\n".join(p.text for p in Document(path).paragraphs if p.text.strip())
    except Exception:
        return ""


def pdf_text(path):
    from pypdf import PdfReader
    try:
        return "\n".join((pg.extract_text() or "") for pg in PdfReader(path).pages)
    except Exception:
        return ""


def load_rounds(con, files, source, title_fn):
    con.execute("DELETE FROM rounds WHERE source=?", [source])
    n = 0
    for fp in files:
        text = docx_text(fp) if fp.lower().endswith(".docx") else pdf_text(fp)
        if not text.strip():
            continue
        title = title_fn(fp)
        con.execute("INSERT INTO rounds VALUES(?,?,?,?,?,?)",
                    [f"{source}:{title}", source, title, os.path.basename(fp), text, len(text)])
        n += 1
    return n


def _digits(name):
    return "".join(c for c in os.path.basename(name) if c.isdigit())


def atlanta_files():
    seen = {}
    for d in (BANK, DOWNLOADS):
        for fp in glob.glob(str(d / "Pub Quiz*.docx")):
            seen.setdefault(_digits(fp), fp)  # first wins (bank preferred)
    return list(seen.values())


def nyc_files():
    out = []
    for pat in ("P[0-9]*.pdf", "Z[0-9]*.pdf"):
        out += glob.glob(str(DOWNLOADS / pat))
    return out


def build_fts(con):
    con.execute("INSTALL fts; LOAD fts;")
    con.execute("PRAGMA create_fts_index('questions','id','question','answer', overwrite=1)")
    con.execute("PRAGMA create_fts_index('rounds','id','title','raw_text', overwrite=1)")


def main(argv):
    sources = argv or ["all"]
    do = lambda s: ("all" in sources) or (s in sources)
    con = duckdb.connect(str(DB))
    schema(con)
    if do("triviaqa-dev"):
        print("triviaqa-dev:", load_triviaqa(con, V3 / "unfiltered-web-dev.json", "triviaqa-dev"), "questions")
    if do("triviaqa-train"):
        print("triviaqa-train:", load_triviaqa(con, V3 / "unfiltered-web-train.json", "triviaqa-train"), "questions")
    if do("atlanta"):
        print("atlanta rounds:", load_rounds(con, atlanta_files(), "atlanta-pub-quiz",
              lambda f: "Pub Quiz " + _digits(f)))
    if do("nyc"):
        print("nyc rounds:", load_rounds(con, nyc_files(), "nyc-trivia-league",
              lambda f: os.path.splitext(os.path.basename(f))[0]))
    try:
        build_fts(con)
        print("FTS indexes built")
    except Exception as e:
        print("FTS skipped:", e)
    print("questions by source:", con.execute("SELECT source, count(*) FROM questions GROUP BY source").fetchall())
    print("rounds by source:", con.execute("SELECT source, count(*) FROM rounds GROUP BY source").fetchall())
    con.close()


if __name__ == "__main__":
    main(sys.argv[1:])
