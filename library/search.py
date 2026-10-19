# /// script
# requires-python = ">=3.11"
# dependencies = ["duckdb"]
# ///
"""Search the Pyaar Trivia Library (full-text search over questions + rounds).

  uv run search.py "nobel prize"
  uv run search.py "1980s movies"
"""
import sys
from pathlib import Path

import duckdb

DB = Path(__file__).parent / "trivia_library.duckdb"
q = " ".join(sys.argv[1:]) or "nobel"
con = duckdb.connect(str(DB), read_only=True)
con.execute("INSTALL fts; LOAD fts;")

print(f"\n== loose questions matching '{q}' (top 10) ==")
for r in con.execute("""
  SELECT question, answer, source FROM
    (SELECT *, fts_main_questions.match_bm25(id, ?) AS s FROM questions)
  WHERE s IS NOT NULL ORDER BY s DESC LIMIT 10""", [q]).fetchall():
    print(f"  - {r[0]}  =>  {r[1]}  [{r[2]}]")

print(f"\n== full rounds matching '{q}' (top 5) ==")
for r in con.execute("""
  SELECT title, source, n_chars FROM
    (SELECT *, fts_main_rounds.match_bm25(id, ?) AS s FROM rounds)
  WHERE s IS NOT NULL ORDER BY s DESC LIMIT 5""", [q]).fetchall():
    print(f"  - {r[0]}  [{r[1]}, {r[2]} chars]")
con.close()
