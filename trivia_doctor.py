#!/usr/bin/env python3
"""Health check for the pando-trivia stem (question bank + live quiz site).

The entrypoint the main pando taps into: is the live quiz site up, and is the
question bank + published-quiz set present. Read-only.

    python3 trivia_doctor.py          # human-readable
    python3 trivia_doctor.py --json   # machine-readable for Pando
"""
import glob
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent
SITE = "https://trivia.pyaarproject.org"


def _http(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "trivia-doctor"})
        with urllib.request.urlopen(req, timeout=12) as r:
            return r.status
    except Exception:
        return None


def _count_questions():
    """Best-effort question count: find a bank.json anywhere under the project and
    count its list / 'questions' array. Returns (count or None, path)."""
    for p in glob.glob(str(HERE / "**" / "bank.json"), recursive=True):
        if "node_modules" in p:
            continue
        try:
            data = json.loads(Path(p).read_text())
            if isinstance(data, list):
                return len(data), p
            if isinstance(data, dict):
                for key in ("questions", "bank", "items"):
                    if isinstance(data.get(key), list):
                        return len(data[key]), p
        except Exception:
            continue
    return None, None


def collect():
    checks = []
    warnings = []

    code = _http(SITE)
    site_ok = code == 200
    checks.append({"name": "live quiz site reachable", "ok": site_ok,
                   "detail": f"HTTP {code}" if code else "unreachable"})

    quizzes = [p for p in glob.glob(str(HERE / "data" / "quiz_*.json")) if "node_modules" not in p]
    checks.append({"name": "published quizzes (data/quiz_*.json)", "ok": len(quizzes) > 0,
                   "detail": f"{len(quizzes)} quizzes"})

    qcount, qpath = _count_questions()
    checks.append({"name": "question bank", "ok": qcount is not None,
                   "detail": f"{qcount} questions ({Path(qpath).name})" if qcount is not None else "no bank.json found"})
    if qcount is None:
        warnings.append("no bank.json located (counted published quizzes only)")

    if not site_ok:
        status = "down"
    elif len(quizzes) == 0:
        status = "degraded"
    else:
        status = "ok"
    summary = (f"{status.upper()}: site {'up' if site_ok else 'DOWN'}, {len(quizzes)} quizzes, "
               f"{qcount if qcount is not None else '?'} questions in bank")
    return {"stem": "pando-trivia", "checked_at": datetime.now(timezone.utc).isoformat(),
            "status": status, "summary": summary, "site": SITE, "quizzes": len(quizzes),
            "questions": qcount, "checks": checks, "warnings": warnings}


def run(as_json=False):
    r = collect()
    if as_json:
        print(json.dumps(r, indent=2))
        return 0 if r["status"] == "ok" else 1
    icon = {"ok": "OK", "degraded": "WARN", "down": "DOWN"}[r["status"]]
    print(f"\n[{icon}] pando-trivia: {r['status'].upper()}")
    print(f"  {r['summary']}\n")
    for c in r["checks"]:
        print(f"  {'ok' if c['ok'] else 'XX'} {c['name']}: {c['detail']}")
    for w in r["warnings"]:
        print(f"  warning: {w}")
    print()
    return 0 if r["status"] == "ok" else 1


if __name__ == "__main__":
    sys.exit(run("--json" in sys.argv[1:]))
