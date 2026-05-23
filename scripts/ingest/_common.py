"""Shared ingest helpers — normalization, dedup hashing, source priority."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB = REPO_ROOT / "data" / "bank" / "trivia.duckdb"
RAW_DIR = REPO_ROOT / "data" / "bank" / "raw"

# Higher = wins on dedup conflict
SOURCE_PRIORITY = {
    "manual": 100,
    "el-cms": 80,
    "opentdb": 70,
    "r-trivia": 40,
    "claude": 30,
}

# Source -> initial quality_score
SOURCE_QUALITY = {
    "manual": 0.9,
    "el-cms": 0.7,
    "opentdb": 0.6,
    "r-trivia": 0.5,
    "claude": 0.3,
}

# Default category mapping per source -> per upstream category label.
# Lives in docs/category-taxonomy.md; mirrored here as code for ingest speed.
DEFAULT_MAPPING = {
    "r-trivia": {
        "Geography": ("geography", "countries-capitals-flags"),
        "Language & Wordplay": ("language-words", "wordplay-quotes-grammar"),
        "Entertainment (Movies & TV)": ("film-tv", "hollywood"),
        "History": ("history", "modern-history"),
        "Science & Nature": ("science-nature", "animals-plants-earth"),
        "Sports": ("sport", "american-sports"),
        "Food & Drink": ("food-drink", "world-cuisines"),
        "Entertainment (Music)": ("music", "rock-pop"),
        "Entertainment (Books & Literature)": ("literature", "classics-poetry-theatre"),
        "General Knowledge": ("pop-misc", "general-knowledge"),
        "Mythology & Religion": ("myth-religion", "western-myth"),
        "Politics & Government": ("politics-society", "leaders-world"),
        "Technology": ("tech-internet", "companies-tech"),
        "Art & Culture": ("art-design", "art-architecture"),
        "Pop Culture": ("pop-misc", "celebrities-people"),
        # Anything else lands in general-knowledge
    },
    "opentdb": {
        "9": ("pop-misc", "general-knowledge"),
        "10": ("literature", "classics-poetry-theatre"),
        "11": ("film-tv", "hollywood"),
        "12": ("music", "rock-pop"),
        "13": ("literature", "classics-poetry-theatre"),
        "14": ("film-tv", "tv-shows"),
        "15": ("games-toys", "video-games"),
        "16": ("games-toys", "analog-games-toys"),
        "17": ("science-nature", "animals-plants-earth"),
        "18": ("tech-internet", "programming-ai-gadgets"),
        "19": ("science-nature", "physics-chemistry-math"),
        "20": ("myth-religion", "western-myth"),
        "21": ("sport", "american-sports"),
        "22": ("geography", "countries-capitals-flags"),
        "23": ("history", "modern-history"),
        "24": ("politics-society", "leaders-world"),
        "25": ("art-design", "art-architecture"),
        "26": ("pop-misc", "celebrities-people"),
        "27": ("science-nature", "animals-plants-earth"),
        "28": ("pop-misc", "general-knowledge"),
        "29": ("literature", "genre-fiction"),
        "30": ("tech-internet", "programming-ai-gadgets"),
        "31": ("film-tv", "world-cinema-animation"),
        "32": ("film-tv", "world-cinema-animation"),
    },
}


_PUNCT_RE = re.compile(r"[^\w\s]")
_WS_RE = re.compile(r"\s+")


def normalize_for_hash(text: str) -> str:
    """Lowercase, strip diacritics, drop punctuation, collapse whitespace."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text)
    no_marks = "".join(c for c in nfkd if not unicodedata.combining(c))
    lowered = no_marks.lower()
    no_punct = _PUNCT_RE.sub(" ", lowered)
    return _WS_RE.sub(" ", no_punct).strip()


def dedup_hash(text: str) -> str:
    return hashlib.sha256(normalize_for_hash(text).encode("utf-8")).hexdigest()


def parse_options(options_str: str | None) -> str | None:
    """r-trivia options field is pipe-separated; opentdb is JSON.

    We store options_json as canonical:
        {"choices": ["A","B","C","D"], "correct_index": null}

    Returns JSON string or None.
    """
    if not options_str:
        return None
    if options_str.strip().startswith("{"):
        try:
            return options_str  # already JSON
        except Exception:
            return None
    parts = [p.strip() for p in options_str.split("|") if p.strip()]
    if not parts:
        return None
    return json.dumps({"choices": parts, "correct_index": None})


def category_lookup(con, slug_to_sub_slug: dict[str, tuple[str, str]]) -> dict:
    """Given { upstream_cat: (cat_slug, sub_slug) }, return
    { upstream_cat: (cat_id, sub_id) } via DB lookup.
    """
    rows = con.execute("""
        SELECT c.slug AS cat_slug, s.slug AS sub_slug, c.id AS cat_id, s.id AS sub_id
        FROM subcategory s JOIN category c ON s.category_id = c.id
    """).fetchall()
    by_pair = {(r[0], r[1]): (r[2], r[3]) for r in rows}
    out = {}
    for upstream, (cs, ss) in slug_to_sub_slug.items():
        if (cs, ss) not in by_pair:
            raise ValueError(f"Mapping target not in taxonomy: {cs}/{ss}")
        out[upstream] = by_pair[(cs, ss)]
    return out


def fallback_cat_sub(con, cat_slug: str = "pop-misc", sub_slug: str = "general-knowledge"):
    """Get (cat_id, sub_id) for the global fallback bucket."""
    row = con.execute("""
        SELECT c.id, s.id
        FROM subcategory s JOIN category c ON s.category_id = c.id
        WHERE c.slug = ? AND s.slug = ?
    """, [cat_slug, sub_slug]).fetchone()
    if not row:
        raise ValueError(f"Fallback {cat_slug}/{sub_slug} missing from taxonomy")
    return row
