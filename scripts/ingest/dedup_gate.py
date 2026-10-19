"""Semantic dedup gate for ingestion.

Before new questions enter the bank, drop the ones that are near-duplicates of
what's already there (leakage) or of each other (within-batch). This is where
semantic dedup earns its keep: incoming corpora (TriviaQA, NYC League) were
scraped from the same trivia sites as r-trivia/opentdb, so exact dedup_hash
misses the paraphrases.

Engine: model2vec static embeddings + numpy (no ANN, no usearch; brute-force is
fine at this scale on a laptop). Importable as a gate, or run as a demo CLI.

    from scripts.ingest.dedup_gate import embed, gate
    keep_idx, leak, within = gate(incoming_texts, bank_texts, threshold=0.90)

Demo (TriviaQA from library/ vs the live bank):
    uv run --no-project --python 3.12 --with model2vec --with duckdb --with numpy \
        python scripts/ingest/dedup_gate.py --limit 0
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[2]
BANK_DB = REPO / "data" / "bank" / "trivia.duckdb"
LIBRARY_DB = REPO / "library" / "trivia_library.duckdb"
MODEL = "minishlab/potion-base-8M"
_model = None


def embed(texts: list[str]) -> np.ndarray:
    global _model
    if _model is None:
        from model2vec import StaticModel
        _model = StaticModel.from_pretrained(MODEL)
    v = np.asarray(_model.encode(texts), dtype=np.float32)
    v /= (np.linalg.norm(v, axis=1, keepdims=True) + 1e-9)
    return v


def _max_sim_vs(incoming: np.ndarray, ref: np.ndarray, chunk: int = 2000):
    """For each incoming row, the max cosine sim to any ref row + that ref index."""
    best_s = np.zeros(len(incoming), dtype=np.float32)
    best_j = np.full(len(incoming), -1, dtype=np.int64)
    for s in range(0, len(incoming), chunk):
        sims = incoming[s:s + chunk] @ ref.T          # (c, R)
        j = sims.argmax(axis=1)
        best_s[s:s + chunk] = sims[np.arange(sims.shape[0]), j]
        best_j[s:s + chunk] = j
    return best_s, best_j


def gate(incoming_texts: list[str], bank_texts: list[str], threshold: float = 0.90):
    """Returns (keep_idx, leakage, within_dups).
    keep_idx: incoming indices to actually ingest.
    leakage:  [(incoming_i, bank_j, sim)] dropped as near-dups of the bank.
    within:   [(incoming_i, kept_incoming_i, sim)] dropped as near-dups within the batch."""
    inc = embed(incoming_texts)
    bank = embed(bank_texts) if bank_texts else np.zeros((0, inc.shape[1]), np.float32)

    leak_s, leak_j = (_max_sim_vs(inc, bank) if len(bank) else
                      (np.zeros(len(inc), np.float32), np.full(len(inc), -1, np.int64)))
    leakage = [(i, int(leak_j[i]), float(leak_s[i])) for i in range(len(inc)) if leak_s[i] >= threshold]
    leaked = {i for i, _, _ in leakage}

    # within-batch: greedy, keep the first of each near-dup cluster among the survivors
    survivors = [i for i in range(len(inc)) if i not in leaked]
    within = []
    kept_mask = np.ones(len(inc), dtype=bool)
    for i in leaked:
        kept_mask[i] = False
    if survivors:
        sub = inc[survivors]
        bs, bj = _max_sim_vs(sub, sub)
        for k, i in enumerate(survivors):
            j_local = int(bj[k])
            j = survivors[j_local]
            if bs[k] >= threshold and j < i and kept_mask[j]:
                kept_mask[i] = False
                within.append((i, j, float(bs[k])))
    keep_idx = [i for i in range(len(inc)) if kept_mask[i]]
    return keep_idx, leakage, within


def _load(db, sql):
    import duckdb
    con = duckdb.connect(str(db), read_only=True)
    rows = con.execute(sql).fetchall()
    con.close()
    return rows


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--limit", type=int, default=0, help="cap incoming (0 = all TriviaQA)")
    p.add_argument("--threshold", type=float, default=0.90)
    args = p.parse_args()

    bank = [r[0] for r in _load(BANK_DB, "SELECT question_text FROM question WHERE question_text IS NOT NULL")]
    inc_rows = _load(LIBRARY_DB, "SELECT question, source FROM questions WHERE source LIKE 'triviaqa%' AND question IS NOT NULL")
    if args.limit:
        inc_rows = inc_rows[: args.limit]
    incoming = [r[0] for r in inc_rows]
    print(f"bank: {len(bank)} questions | incoming TriviaQA: {len(incoming)} | threshold: {args.threshold}")

    import time
    t0 = time.time()
    keep, leak, within = gate(incoming, bank, args.threshold)
    print(f"gate ran in {time.time()-t0:.1f}s\n")
    print(f"  leakage (near-dup of existing bank): {len(leak)}  ({100*len(leak)//max(1,len(incoming))}%)")
    print(f"  within-TriviaQA near-dups:           {len(within)}  ({100*len(within)//max(1,len(incoming))}%)")
    print(f"  NET NEW to ingest:                   {len(keep)}  ({100*len(keep)//max(1,len(incoming))}%)")

    print("\n--- example leakage (incoming TriviaQA  ~>  existing bank) ---")
    for i, j, s in sorted(leak, key=lambda x: -x[2])[:12]:
        print(f"  {incoming[i][:60]}")
        print(f"    ~> {bank[j][:60]}  sim={s:.3f}")


if __name__ == "__main__":
    main()
