# Question Bank — Architecture & Schema

How the Pyaar Project Trivia question bank is stored, queried, and grown.

**Status:** v1 — locked.
**Last updated:** 2026-05-23
**Companion docs:** [`category-taxonomy.md`](./category-taxonomy.md)

---

## Why DuckDB

- File-backed, single `.duckdb` file — zero ops, easy to back up.
- Native FTS (full-text search) extension — needed for "topic → questions" resolution.
- Reads CSV / Parquet / JSON directly — every ingest source plugs in cleanly.
- Runs in Node via `duckdb` npm package — same DB powers Python ingest scripts and the Next.js API.
- Parquet export for git-tracked snapshots (small, diffable history).

---

## Physical layout

```
trivia-platform/
├── data/
│   └── bank/
│       ├── trivia.duckdb              # source of truth (gitignored if > 50MB)
│       ├── snapshots/
│       │   └── YYYY-MM-DD/            # git-tracked parquet exports
│       │       ├── question.parquet
│       │       ├── category.parquet
│       │       ├── subcategory.parquet
│       │       └── tag.parquet
│       └── raw/                       # downloaded upstream dumps (gitignored)
│           ├── r-trivia.csv
│           ├── opentdb.json
│           └── el-cms.json
├── scripts/
│   └── ingest/                        # Python ingest pipeline (uv)
└── web/
    └── .bank/trivia.duckdb            # runtime copy, downloaded from Blob
                                        # at deploy time; gitignored
```

**Source of truth**: `data/bank/trivia.duckdb`. Mirrored nightly to Vercel
Blob via GitHub Action; daily Parquet snapshots committed to git for full
auditable history.

**Runtime DB**: Next.js API routes read from `web/.bank/trivia.duckdb`,
downloaded from Blob at build time via a `prebuild` script.

---

## Schema (DDL)

```sql
-- ── Taxonomy ──────────────────────────────────────────────────

CREATE TABLE category (
  id              INTEGER PRIMARY KEY,
  slug            VARCHAR UNIQUE NOT NULL,    -- 'film-tv'
  name            VARCHAR NOT NULL,           -- 'Film & TV'
  sort_order      INTEGER DEFAULT 0,
  active          BOOLEAN DEFAULT TRUE
);

CREATE TABLE subcategory (
  id              INTEGER PRIMARY KEY,
  category_id     INTEGER NOT NULL REFERENCES category(id),
  slug            VARCHAR NOT NULL,           -- 'bollywood'
  name            VARCHAR NOT NULL,
  is_catchall     BOOLEAN DEFAULT FALSE,      -- the default for un-refined rows
  active          BOOLEAN DEFAULT TRUE,
  UNIQUE (category_id, slug)
);

CREATE TABLE tag (
  id              INTEGER PRIMARY KEY,
  kind            VARCHAR NOT NULL,           -- 'region' | 'era' | 'audience' | 'flag'
  slug            VARCHAR NOT NULL,
  name            VARCHAR NOT NULL,
  UNIQUE (kind, slug)
);

-- ── Questions ─────────────────────────────────────────────────

CREATE TABLE question (
  id              UUID PRIMARY KEY DEFAULT uuid(),
  source          VARCHAR NOT NULL,           -- 'r-trivia' | 'opentdb' | 'el-cms' | 'claude' | 'manual'
  source_id       VARCHAR,                    -- upstream ID for idempotency
  source_url      VARCHAR,                    -- MANDATORY for Claude-generated
  question_text   VARCHAR NOT NULL,
  answer_text     VARCHAR NOT NULL,
  answer_aliases  VARCHAR[],                  -- ['JFK','John F. Kennedy','Kennedy']
  category_id     INTEGER REFERENCES category(id),
  subcategory_id  INTEGER REFERENCES subcategory(id),
  difficulty      VARCHAR CHECK (difficulty IN ('easy','medium','hard')),
  question_type   VARCHAR CHECK (question_type IN ('open_ended','multiple_choice','true_false')),
  options_json    JSON,                       -- {"choices":["A","B","C","D"],"correct_index":2}
  time_sensitive  BOOLEAN DEFAULT FALSE,      -- "current world record", "reigning champion"
  low_confidence  BOOLEAN DEFAULT FALSE,
  dedup_hash      VARCHAR NOT NULL,           -- sha256(normalize(question_text))
  quality_score   REAL DEFAULT 0.5,           -- 0..1; source baseline + feedback
  ingested_at     TIMESTAMP DEFAULT now(),
  superseded_by   UUID                        -- soft-delete: point to better duplicate
);

CREATE UNIQUE INDEX idx_question_dedup
  ON question(dedup_hash) WHERE superseded_by IS NULL;

CREATE INDEX idx_question_cat
  ON question(category_id, subcategory_id, difficulty);

CREATE TABLE question_tag (
  question_id     UUID REFERENCES question(id),
  tag_id          INTEGER REFERENCES tag(id),
  PRIMARY KEY (question_id, tag_id)
);

-- ── Operational tables ────────────────────────────────────────

-- Host feedback loop (flagged questions)
CREATE TABLE question_feedback (
  id              INTEGER PRIMARY KEY,
  question_id     UUID REFERENCES question(id),
  verdict         VARCHAR CHECK (verdict IN ('good','stale','wrong_answer','ambiguous','offensive','too_hard','too_easy')),
  note            VARCHAR,
  session_id      VARCHAR,
  created_at      TIMESTAMP DEFAULT now()
);

-- Live topic-resolution cache (audience yell → canonical)
CREATE TABLE topic_resolution (
  raw_topic       VARCHAR PRIMARY KEY,        -- 'bollywood 90s'
  category_id     INTEGER,
  subcategory_id  INTEGER,
  fts_query       VARCHAR,                    -- 'bollywood OR hindi OR shahrukh'
  tags            VARCHAR[],                  -- inherited tags
  resolved_at     TIMESTAMP DEFAULT now()
);

-- Generation audit log (every Claude call)
CREATE TABLE generation_log (
  id              UUID PRIMARY KEY DEFAULT uuid(),
  session_id      VARCHAR,
  topic           VARCHAR,
  tier            INTEGER,                    -- 1=bank, 2=trivia-api, 3=claude
  model           VARCHAR,
  prompt_hash     VARCHAR,
  raw_response    JSON,
  created_at      TIMESTAMP DEFAULT now()
);

-- Ingest checkpoint (for resumable / idempotent runs)
CREATE TABLE ingest_run (
  source          VARCHAR PRIMARY KEY,
  last_source_id  VARCHAR,
  last_offset     INTEGER,
  rows_added      INTEGER,
  rows_skipped    INTEGER,
  started_at      TIMESTAMP,
  finished_at     TIMESTAMP
);
```

---

## Normalization & dedup

### `normalize(question_text)`

```
lowercase → strip punctuation → collapse whitespace → trim
```

So `"What is the capital of France?"` and `"what is the capital of france"`
hash to the same value.

### `dedup_hash`

`sha256(normalize(question_text))` — stored on every question. Unique
index over `WHERE superseded_by IS NULL` means we never have two active
questions with the same normalized text.

### Source priority (tiebreak on dedup conflict)

When a new ingest tries to insert a question that already exists, we
compare priorities:

| Source | Priority |
|---|---|
| `manual` | 100 |
| `el-cms` | 80 |
| `opentdb` | 70 |
| `r-trivia` | 40 |
| `claude` | 30 |

Higher wins. If new source > existing → update the row (better source).
If new source ≤ existing → skip (keep existing).

---

## 3-tier resolution strategy

When the host types a topic ("90s Bollywood", "Premier League", "weird
medical facts"), we resolve via three tiers, falling through when needed.

### Tier 1 — Local bank (DuckDB)

1. Check `topic_resolution` cache. If hit, use cached
   `(category, subcategory, fts_query, tags)`.
2. If miss:
   - Try exact subcategory slug match (host typed `bollywood`).
   - Else try FTS BM25 over `question_text + answer_text`.
   - Else call Claude (cheap one-shot) to map raw topic →
     `(category, subcategory, fts_expansion)`. Cache the answer for next time.
3. Pull up to `count` questions:
   ```sql
   SELECT * FROM question
   WHERE superseded_by IS NULL
     AND time_sensitive = FALSE     -- unless host opts in
     AND id NOT IN (excluded)
     AND (subcategory_id = ? OR id IN (FTS match))
   ORDER BY quality_score DESC, random()
   LIMIT ?
   ```
4. If `>= count` → return. Else → Tier 2.

### Tier 2 — The Trivia API

Live HTTP fetch from `the-trivia-api.com`. Only invoked when Tier 1 came up
short. Maps our category → their category slug (static mapping table).

Returned questions are hash-deduped against the bank, then **inserted with
`source='trivia-api'`** so future requests find them locally. The bank
self-improves.

### Tier 3 — Claude with mandatory citations

Last resort. Generates questions via Claude (`claude-opus-4-7`) with a Zod
schema requiring `source_url` and `source_excerpt` per question:

```ts
const QuestionGenSchema = z.object({
  questions: z.array(z.object({
    question: z.string().min(10),
    answer: z.string().min(1),
    aliases: z.array(z.string()).default([]),
    difficulty: z.enum(['easy','medium','hard']),
    source_url: z.string().url(),               // MANDATORY
    source_excerpt: z.string().min(20),
    time_sensitive: z.boolean(),
    confidence: z.number().min(0).max(1)
  })).min(1)
});
```

System prompt forces Wikipedia / major outlet citations and rejects
self-cited LLM facts. Generated rows are persisted to `question` with
`source='claude'`, `quality_score=0.3` (low until human-rated), and logged
in `generation_log` for audit.

---

## Quality scoring + host feedback

Every question starts with a `quality_score` based on source:

| Source | Initial |
|---|---|
| `manual` | 0.9 |
| `el-cms` | 0.7 |
| `opentdb` | 0.6 |
| `r-trivia` | 0.5 |
| `claude` | 0.3 |

In the Presenter, a small "Flag" button under each question (host-only,
gated by admin PIN) lets the host record a verdict:

- `good` → +0.1 (capped at 1.0)
- `stale` → +`flag:time-sensitive` tag, –0.3
- `wrong_answer` → –0.5
- `ambiguous` → –0.2
- `offensive` → –0.5
- `too_hard` / `too_easy` → no quality change, used for difficulty calibration

When `quality_score < 0.1`, the row is soft-deleted (`superseded_by = id`)
and excluded from future picks.

Feedback rows ALSO get appended to a Vercel Blob log file so the source-of-
truth DB can be rebuilt with feedback re-applied after a fresh ingest.

---

## Runtime API

### `POST /api/wildcard/topic`

**Request**:
```ts
{
  topic: string;
  count: number;
  difficulty?: 'easy'|'medium'|'hard'|'mixed';
  excludeIds?: string[];
  allowTimeSensitive?: boolean;     // default false
}
```

**Response**:
```ts
{
  topic: string;
  resolved: {
    categorySlug: string | null;
    subcategorySlug: string | null;
    tags: string[];
  };
  questions: Array<{
    id: string;
    text: string;
    answer: string;
    aliases: string[];
    source: 'bank' | 'trivia-api' | 'claude';
    source_url: string | null;
    tier: 1 | 2 | 3;
  }>;
  tierUsed: 1 | 2 | 3;               // worst tier hit
  warnings: string[];                 // 'topic unfamiliar', etc.
}
```

### `GET /api/bank/categories`

Returns the 15 top-level categories + the 50 subcategories + counts. Cached
with `Cache-Control: s-maxage=3600`.

### `POST /api/bank/feedback`

```ts
{
  questionId: string;
  verdict: 'good'|'stale'|'wrong_answer'|'ambiguous'|'offensive'|'too_hard'|'too_easy';
  note?: string;
  sessionId?: string;
}
```

Admin-PIN gated. Updates `quality_score`, inserts a `question_feedback`
row, appends to the Blob feedback log.

---

## Adding a new source

1. Drop the raw file in `data/bank/raw/<name>.<ext>`.
2. Copy `scripts/ingest/ingest_r_trivia.py` → `scripts/ingest/ingest_<name>.py`,
   update the column mapping and `source` literal.
3. Add an entry in `scripts/ingest/_taxonomy/mappings.json` under `<name>:`.
4. Run `uv run python -m scripts.ingest.ingest_<name>` then `snapshot.py`.
5. `CHANGELOG.md` entry is auto-appended by `snapshot.py`.

---

## Backup & restore

### Backup
- **Nightly**: GitHub Action runs `scripts/ingest/snapshot.py` → exports parquet → commits to git. Then uploads `trivia.duckdb` to Vercel Blob as `bank/trivia-latest.duckdb` AND `bank/trivia-YYYY-MM-DD.duckdb`.
- **On every ingest**: `snapshot.py` is invoked manually; same outputs as above.

### Restore
```bash
# Fresh machine — start from latest Blob snapshot
vercel blob download bank/trivia-latest.duckdb -o data/bank/trivia.duckdb

# Or from git parquet snapshots (slower, lossless)
uv run python -m scripts.ingest.restore_from_parquet --snapshot 2026-05-23
```

---

## Test plan (per ingest)

Every ingest run must pass these checks before merging:

1. **Row count delta** matches expected (printed by ingest script).
2. **Dedup count** ≤ 5% of new rows.
3. **`validate.py`** reports < 20% of any category on the catch-all subcat.
4. **Sample browse**: print 10 random rows from each top-level category, eyeball formatting (no escape errors, no truncation).
5. **FTS sanity**: query `topic = 'bollywood'` returns ≥ 10 results.
6. **Quiz round generation**: spin up a mock round from the new bank, run through the Presenter, verify question + answer render cleanly through the whole slide pipeline.

If any check fails, roll back via `git checkout data/bank/snapshots/<prev-date>/`
and re-restore.

---

## Sequence of work (Phase B)

| # | Step | Verify by |
|---|------|-----------|
| 1 | Init DuckDB schema + seed taxonomy from `category-taxonomy.md` | `SELECT COUNT(*) FROM subcategory` returns 50 |
| 2 | Ingest r-trivia CSV | row count ≈ 13.5K, sample 10/category |
| 3 | Keyword-rule iteration until <20% on catch-all subcats | `validate.py` output |
| 4 | First Parquet snapshot + CHANGELOG entry | snapshot files present in git |
| 5 | Ingest OpenTDB dump | dedup count printed; total rows up |
| 6 | Ingest el-cms JSON | same |
| 7 | Wire DuckDB into Next.js (`web/src/lib/bank/duck.ts` singleton) | `GET /api/bank/categories` returns the 15 cats |
| 8 | Refactor existing `/wildcard` to call Tier 1 | live test: generate a 6-round wildcard, present through |
| 9 | Tier 2 (Trivia API client) | live test: request an empty-bank topic, see Tier-2 fill |
| 10 | Tier 3 (Claude w/ Zod schema) | live test: request something obscure, see Tier-3 fill with source_url |
| 11 | `/wildcard/live` UI (host types topics, instant rounds) | dry-run a 4-round live game |
| 12 | Flag-question button + feedback writeback | flag a question, confirm next gen excludes it |
