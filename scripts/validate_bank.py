#!/usr/bin/env python3
"""Validate the deployed question bank (web/.bank/bank.json) for the defect
classes that the 2026-06 quality pass cleaned up, so they can't silently
regress on the next ingest/export.

Usage:
    python3 scripts/validate_bank.py                 # report + exit 1 if hard defects
    python3 scripts/validate_bank.py --bank path.json
    python3 scripts/validate_bank.py --samples 10    # show more examples

HARD defects (exit 1): garbage answers, empty answers, type mismatches.
SOFT warnings (exit 0): polluted answers, leaked multiple-choice, duplicates.
"""
from __future__ import annotations
import argparse, json, re, sys
from collections import defaultdict

DEFAULT_BANK = "web/.bank/bank.json"

# --- detectors -------------------------------------------------------------
GARBAGE_RE = re.compile(
    r"common bond|all of the answers|good luck!|here.{0,6}good luck|nobody gets|"
    r"this is a fictional|describe the common|individual+y",
    re.I,
)
LEADING_JUNK_RE = re.compile(r"^[\\]|^[-–—]{2,}|^_+-")
MORAL_NOTE_RE = re.compile(r"\b(moral|note|n\.b\.|fun fact)\s*:", re.I)
MC_RE = re.compile(r"\bwhich of (the following|these)\b|\bof the following\b", re.I)
YEAR_Q_RE = re.compile(r"\b(what|which) year\b|\bin what year\b", re.I)
YEAR_A_RE = re.compile(r"\b\d{3,4}\s*(bce|bc|ce|ad)?\b", re.I)
# Only when the quantity is what's ASKED (question starts with "how many"),
# not when "how many" appears mid-clause (e.g. "which astronomer ... how many").
HOWMANY_Q_RE = re.compile(r"^\s*(in [^,?.]{1,30},?\s*)?how many\b", re.I)
NUMWORD = (
    r"\d|\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|"
    r"thir|four|fif|six|seven|eigh|nine|twenty|thirty|forty|fifty|sixty|hundred|"
    r"thousand|million|billion|dozen|none|twice|couple|several|many|count|number)"
)
NUMWORD_RE = re.compile(NUMWORD, re.I)


def normq(t: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", (t or "").lower()).strip()


def validate(qs: list[dict], samples: int) -> int:
    garbage, empty, polluted, leaked_mc, type_mismatch = [], [], [], [], []
    dup_groups = defaultdict(list)

    for q in qs:
        a = (q.get("answer") or "").strip()
        t = q.get("text") or ""
        if not a:
            empty.append(q); continue
        if GARBAGE_RE.search(a):
            garbage.append(q)
        if LEADING_JUNK_RE.search(a) or MORAL_NOTE_RE.search(a) or (
            len(a) > 120 and q.get("questionType") != "true_false"
        ):
            polluted.append(q)
        if MC_RE.search(t) and not q.get("choices"):
            leaked_mc.append(q)
        if YEAR_Q_RE.search(t) and not YEAR_A_RE.search(a):
            type_mismatch.append(q)
        elif HOWMANY_Q_RE.search(t) and not NUMWORD_RE.search(a):
            type_mismatch.append(q)
        if len(normq(t)) > 15:
            dup_groups[normq(t)].append(q)

    dupes = {k: v for k, v in dup_groups.items() if len(v) > 1}
    dup_extra = sum(len(v) - 1 for v in dupes.values())

    def show(label, items, hard):
        tag = "HARD" if hard else "warn"
        print(f"[{tag}] {label}: {len(items)}")
        for q in items[:samples]:
            print(f"       Q: {q['text'][:64]!r}  A: {(q.get('answer') or '')[:34]!r}")

    print(f"Bank: {len(qs)} questions\n")
    show("garbage answers", garbage, True)
    show("empty answers", empty, True)
    show("type mismatches (year/number)", type_mismatch, True)
    show("polluted answers (junk/long)", polluted, False)
    show("leaked multiple-choice (empty choices)", leaked_mc, False)
    print(f"[warn] duplicate questions (extra copies): {dup_extra} in {len(dupes)} groups")

    hard = len(garbage) + len(empty) + len(type_mismatch)
    print(f"\n{'FAIL' if hard else 'PASS'}: {hard} hard defects")
    return 1 if hard else 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--bank", default=DEFAULT_BANK)
    p.add_argument("--samples", type=int, default=4)
    args = p.parse_args()
    try:
        data = json.load(open(args.bank))
    except FileNotFoundError:
        print(f"bank not found: {args.bank}", file=sys.stderr)
        return 2
    return validate(data["questions"], args.samples)


if __name__ == "__main__":
    raise SystemExit(main())
