"""Build PATTERN / connection rounds (Dirty South / NYC League style) where the
ANSWERS share a structural thread, not a category:

  hidden   every answer hides the same string of letters ("...cat..." in Scatter,
           Catalonia, Muscat)
  rhyme    every answer rhymes (CMU pronouncing dictionary)
  keyword  every answer (or question) contains the same whole word ("King")

Two steps: DISCOVER surfaces candidate threads with enough questions to fill a
round; BUILD materializes one into a publishable quiz_<N>.json with a
theme_description stating the connection.

    uv run --with duckdb --with pronouncing python scripts/theme_round.py discover rhyme --min 10
    uv run --with duckdb --with pronouncing python scripts/theme_round.py discover hidden --min 10
    uv run --with duckdb --with pronouncing python scripts/theme_round.py discover keyword --min 5
    uv run --with duckdb --with pronouncing python scripts/theme_round.py build hidden cat --count 8
    uv run --with duckdb --with pronouncing python scripts/theme_round.py build rhyme ain --count 8
    uv run --with duckdb --with pronouncing python scripts/theme_round.py build keyword king --count 8 --apply
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import duckdb

REPO = Path(__file__).resolve().parents[1]
DB = REPO / "data" / "bank" / "trivia.duckdb"
DATA_WEB = REPO / "web" / "public" / "data"
DATA_SRC = REPO / "data"
STOP = set("the a an of and or to in on at for with from is are was by as it its his her "
           "their your my our you he she they we i".split())
WORDS = Path("/usr/share/dict/words")

letters = lambda s: re.sub(r"[^a-z]", "", s.lower())


def load():
    con = duckdb.connect(str(DB), read_only=True)
    rows = con.execute(
        "SELECT question_text, answer_text FROM question "
        "WHERE answer_text IS NOT NULL AND length(answer_text) > 0 AND source <> 'dirty-south'"
    ).fetchall()
    con.close()
    # keep clean, concise answers (patterns read best on short answers);
    # drop True/False/Yes/No and pure numbers (useless for letter patterns)
    binary = {"true", "false", "yes", "no", "none", "all of the above"}
    out = []
    for q, a in rows:
        a = a.strip()
        if not a or not a.isascii() or len(a.split()) > 3:
            continue
        if a.lower() in binary or re.fullmatch(r"[\d.,$%\s]+", a):
            continue
        out.append((q, a))
    return out


def english_words() -> set[str]:
    if WORDS.exists():
        return {w.strip().lower() for w in WORDS.read_text(errors="ignore").splitlines() if 3 <= len(w.strip()) <= 6}
    return set()


# curated "aha" theme words: a hidden ANIMAL / COLOR / BODY PART in each answer
# is the classic pub connection round (far better than a common letter fragment).
THEME_WORDS = {
    "animal": "cat dog ant bee cow owl ram fox rat ape eel hen pig bat ox asp sow "
              "bear lion wolf deer seal crab mole newt toad hare goat mule boar lynx "
              "hawk swan dove crow moth slug worm clam puma kiwi ewe cod".split(),
    "colour": "red tan jet ash gold pink blue cyan rose ruby teal plum lime navy".split(),
    "body":   "ear arm rib hip eye toe gum jaw lip shin heel nose chin lung liver "
              "brain spine thigh ankle wrist elbow".split(),
}


def discover_hidden(qa, min_n):
    # 1) curated theme words (the good stuff), where the word is hidden INSIDE a
    #    longer answer, not the whole answer.
    for theme, words in THEME_WORDS.items():
        hits = {}
        for w in words:
            got = [(q, a) for q, a in qa if w in letters(a) and letters(a) != w]
            if len(got) >= min_n:
                hits[w] = got
        if hits:
            print(f"hidden {theme}:")
            for w, v in sorted(hits.items(), key=lambda x: -len(x[1]))[:12]:
                print(f"  '{w}': {len(v)} answers  e.g. {', '.join(a for _, a in v[:5])}")
            print()
    # 2) any other dictionary-word substring with enough hits (minus boring bits)
    boring = {"the", "and", "ing", "ion", "ers", "her", "ton", "man", "ran", "lan",
              "ill", "est", "ate", "ent", "ine", "ive", "ous", "ter", "tion", "rue"}
    dict_words = english_words()
    hits = defaultdict(list)
    for q, a in qa:
        la = letters(a)
        for n in (4, 5):
            for i in range(len(la) - n + 1):
                sub = la[i:i + n]
                if sub in dict_words and sub != la and sub not in boring:
                    hits[sub].append((q, a))
    ranked = sorted(((w, set(v)) for w, v in hits.items()), key=lambda x: -len(x[1]))
    print("other hidden words:")
    for w, v in ranked[:12]:
        if len(v) >= min_n:
            print(f"  '{w}': {len(v)} answers  e.g. {', '.join(a for _, a in list(v)[:5])}")


def _rhyme_part(word):
    import pronouncing
    ph = pronouncing.phones_for_word(word.lower())
    return pronouncing.rhyming_part(ph[0]) if ph else None


def discover_rhyme(qa, min_n):
    groups = defaultdict(list)
    for q, a in qa:
        if len(a.split()) != 1:
            continue
        rp = _rhyme_part(a)
        if rp:
            groups[rp].append((q, a))
    # dedup answers within a group, rank by distinct answers
    ranked = []
    for rp, v in groups.items():
        uniq = {a: (q, a) for q, a in v}
        if len(uniq) >= min_n:
            ranked.append((rp, list(uniq.values())))
    ranked.sort(key=lambda x: -len(x[1]))
    for rp, v in ranked[:25]:
        print(f"  rhyme '{rp}': {len(v)} answers  e.g. {', '.join(a for _, a in v[:6])}")


def discover_keyword(qa, min_n):
    hits = defaultdict(set)
    rec = {}
    for q, a in qa:
        for w in set(re.findall(r"[a-z]{4,}", a.lower())):
            if w not in STOP:
                hits[w].add(a)
                rec.setdefault((w, a), (q, a))
    ranked = sorted(((w, v) for w, v in hits.items() if len(v) >= min_n), key=lambda x: -len(x[1]))
    for w, v in ranked[:25]:
        print(f"  keyword '{w}': {len(v)} answers  e.g. {', '.join(list(v)[:5])}")


# ---- build ----
def match(qa, kind, value):
    v = value.lower()
    picked, seen = [], set()
    if kind == "rhyme":
        want = v  # a rhyming_part key, or a word to rhyme with
        if " " in v or re.search(r"[0-9]", v):
            pass
        tgt = _rhyme_part(v) or v
        for q, a in qa:
            if len(a.split()) != 1 or a.lower() in seen:
                continue
            if _rhyme_part(a) == tgt:
                picked.append((q, a)); seen.add(a.lower())
    elif kind == "hidden":
        for q, a in qa:
            la = letters(a)
            if v in la and la != v and a.lower() not in seen:
                picked.append((q, a)); seen.add(a.lower())
    elif kind == "keyword":
        pat = re.compile(rf"\b{re.escape(v)}\b", re.I)
        for q, a in qa:
            if (pat.search(a) or pat.search(q)) and a.lower() not in seen:
                picked.append((q, a)); seen.add(a.lower())
    return picked


def theme_desc(kind, value, n):
    if kind == "hidden":
        return f"Hidden thread: every one of these {n} answers contains the string '{value.upper()}'."
    if kind == "rhyme":
        return f"Every one of these {n} answers rhymes."
    if kind == "keyword":
        return f"Connection: every answer (or its question) involves '{value}'."
    return ""


def next_quiz_number():
    mx = 0
    for d in (DATA_SRC, DATA_WEB):
        if d.exists():
            for f in d.iterdir():
                m = re.match(r"quiz_(\d+)\.json$", f.name)
                if m:
                    mx = max(mx, int(m.group(1)))
    return mx + 1


def build(kind, value, count, title, apply):
    qa = load()
    picked = match(qa, kind, value)
    print(f"{kind} '{value}': {len(picked)} candidate questions")
    if len(picked) < count:
        print(f"  (only {len(picked)}; round will be short)")
    picked = picked[:count]
    for q, a in picked:
        print(f"  {a:28s} <- {q[:60]}")
    if not picked:
        return 1
    qn = next_quiz_number()
    quiz = {
        "quiz_number": qn, "date": date(2026, 1, 1).isoformat(),
        "rounds": [{
            "number": 1, "title": title or f"{kind.title()} Round",
            "round_type": "standard", "points_per_question": 1, "joker_eligible": False,
            "theme_description": theme_desc(kind, value, len(picked)),
            "questions": [{"number": i + 1, "text": q, "answer": a, "choices": [], "is_internet_only": False}
                          for i, (q, a) in enumerate(picked)],
            "clues": [], "progressive_answer": "",
        }],
        "mini_games": [], "tie_breaker_question": "", "tie_breaker_answer": "",
    }
    print(f"\ntheme: {quiz['rounds'][0]['theme_description']}")
    if not apply:
        print("\npreview only. Add --apply to write quiz_<N>.json.")
        return 0
    body = json.dumps(quiz, indent=2, ensure_ascii=False)
    for d in (DATA_WEB, DATA_SRC):
        d.mkdir(parents=True, exist_ok=True)
        (d / f"quiz_{qn}.json").write_text(body)
    print(f"\nwrote quiz_{qn}.json  ->  /present/{qn}")
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("discover"); d.add_argument("kind", choices=["hidden", "rhyme", "keyword"]); d.add_argument("--min", type=int, default=8)
    b = sub.add_parser("build"); b.add_argument("kind", choices=["hidden", "rhyme", "keyword"]); b.add_argument("value"); b.add_argument("--count", type=int, default=8); b.add_argument("--title", default=""); b.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    if a.cmd == "discover":
        qa = load()
        print(f"scanning {len(qa)} clean answers for '{a.kind}' threads (min {a.min})...\n")
        {"hidden": discover_hidden, "rhyme": discover_rhyme, "keyword": discover_keyword}[a.kind](qa, a.min)
    else:
        return build(a.kind, a.value, a.count, a.title, a.apply)


if __name__ == "__main__":
    raise SystemExit(main())
