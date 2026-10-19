---
spec_format_version: "0.1"
title: "Pyaar Trivia Library + Round Builder"
artifact_type: "prd"
spec_revision: 2
author: "Prahlaad"
created_at: "2026-10-19T00:00:00Z"
updated_at: "2026-10-19T00:00:00Z"
linked_github_repo: "prahlaadr/trivia-platform"
---

> Feature spec for growing the trivia-platform's EXISTING question bank with
> Prahlaad's full corpora and adding a round-builder that emits publishable rounds
> for trivia.pyaarproject.org. Part of the `pando-trivia` stem.
>
> rev 2 course-correction: build on the existing bank (`data/bank/trivia.duckdb`
> + `scripts/ingest/`), NOT a separate index. The session's exploratory
> `library/trivia_library.duckdb` + `build_index.py` are retired in favor of it.

## Problem

The trivia-platform already has a real question bank (`data/bank/trivia.duckdb`,
exported to the committed `bank.json` that feeds the live site): **19,289
questions** (r-trivia, opentdb, and dirty-south = the Atlanta pub quizzes), a
**16-category / 28-tag taxonomy**, a Gemini topic classifier, dedup (`dedup_hash`),
and quality scoring. But two gaps keep Prahlaad building every quiz by hand:

1. **His larger corpora are not in the bank.** TriviaQA Unfiltered (~98,935 Q&A on
   V3) and the NYC Trivia League packets are not ingested, so the bank is a
   fraction of what he has.
2. **Nothing turns the tagged bank into publishable rounds.** There is no builder
   that assembles a themed round (by category/tag) or replicates a known round
   into the site's quiz schema, so round creation stays manual.

## Hypothesis

If we ingest his full corpora into the existing bank (reusing its taxonomy +
Gemini classifier) and add a round-builder that emits the site's quiz schema
(assemble by tag/category, or replicate a stored round), then Prahlaad will build
quizzes faster and actually reuse the corpus, because a themed or replicated round
goes from the bank to published with no reformatting.

## Scope

```productspec-scope
in:
  - INGEST TriviaQA Unfiltered (V3 /triviaqa-unfiltered) + NYC Trivia League packets INTO the existing bank (data/bank/trivia.duckdb) via new scripts/ingest/ingest_*.py, following the established pattern (source tag, dedup_hash, quality_score)
  - CLASSIFY the new questions with the EXISTING Gemini classifier into the existing 16-category / 28-tag taxonomy; add a tag only when a real subtopic needs one (no tag sprawl)
  - a round-builder with two modes: ASSEMBLE (pick questions by category/tag/theme from the bank) and REPLICATE (materialize a stored full round), both emitting the live-site quiz schema (round_type standard | progressive | video)
  - a CLI that emits quiz_<N>.json savable to the site, AND/OR feeds the site's existing game-gen with the bank corpus
  - open-answer by default; keep multiple-choice ONLY when the source question already had options (options_json)
  - NON-MUSIC rounds first (most song/artist questions are plain text, not play-the-song rounds)
  - music rounds: round_type=video with a YouTube Music track LINK on the question (media_url); timestamp deferred
  - dedup via the bank's existing dedup_hash, and never emit a question already used in a published quiz
out:
  - the session's separate library index (library/trivia_library.duckdb + build_index.py): RETIRED in favor of the existing bank
  - changing the live site's schema or player (the builder conforms to the site)
  - auto-publishing without human review
  - full re-classification of the whole 19K+ bank upfront
cut:
  - music timestamp selection (track link only for now; timestamp later)
  - mini_games generation
  - generating brand-new questions from nothing (the corpus is the source; the LLM selects / cleans / classifies)
```

## Acceptance Criteria

- Given TriviaQA + NYC League ingested, the bank's question count grows with
  `source` tags for each, deduped against existing rows via `dedup_hash`, and the
  new rows are classified into the existing 16-category / 28-tag taxonomy.
- Given a category/tag/theme, ASSEMBLE produces a round of N bank questions that
  validates against the quiz schema and publishes to the live site unchanged.
- Given a stored full round, REPLICATE materializes it faithfully into the schema.
- Given an assembled round, questions are open-answer unless the source carried
  `options_json`, in which case multiple-choice is preserved.
- Given a music round, each question has `round_type=video` and a valid YouTube
  Music track link (`media_url`); no audio files; timestamp not required yet.
- Given any built round, no question duplicates one already used in a published
  `data/quiz_*.json`, and a built `quiz_<N>.json` round-trips the site's existing
  publish flow (committed + Blob) unchanged.

```productspec-ai-evals
- id: schema_conformance
  type: deterministic
  input_set: evals/trivia-rounds-golden.jsonl
  evaluator: automated_test
  pass_threshold: 1
  checks:
    - every emitted quiz/round/question has required keys and a valid round_type
    - output parses with the same loader the live site uses, no extra translation
- id: classification_into_taxonomy
  type: rubric
  input_set: evals/triviaqa-classification-golden.jsonl
  evaluator: llm_judge
  pass_threshold: 0.9
  checks:
    - each ingested question maps to a correct existing category + sensible tags
    - new tags are introduced only for genuinely missing subtopics, not duplicates of existing ones
- id: round_quality
  type: rubric
  input_set: evals/trivia-round-quality-golden.jsonl
  evaluator: llm_judge
  pass_threshold: 0.9
  checks:
    - selected questions are unambiguous, correctly answered, on-theme
    - noisy/dated/low-quality TriviaQA entries are filtered out
- id: dedup_against_published
  type: deterministic
  input_set: evals/published-quizzes-snapshot.jsonl
  evaluator: automated_test
  pass_threshold: 1
  checks:
    - no emitted question normalized-matches a question in any published quiz
```

## Success Metrics

```productspec-success-metrics
- id: bank_growth
  metric: bank_question_count
  target: ">= 60K classified questions (from ~19K)"
  window: after ingest
  segment: all sources
  source: trivia_duckdb
- id: library_sourced_share
  metric: pct_published_quiz_questions_sourced_from_bank
  target: ">= 50%"
  window: per published quiz
  segment: quizzes built with the builder
  source: quiz_provenance
- id: time_to_published_round
  metric: median_minutes_theme_to_published_round
  target: "< 10 min"
  window: per round
  segment: rounds built via the builder
  source: build_log
- id: rounds_built_per_month
  metric: rounds_published_via_builder
  target: ">= 8 / month"
  window: monthly
  segment: all builder output
  source: publish_log
```

## solution

Intent-level approach (details belong in DESIGN / code):

- **Grow the existing bank, do not fork it.** TriviaQA + NYC League become new
  `scripts/ingest/ingest_*.py` sources (mirroring `ingest_opentdb` / the
  `dirty-south` docx path), writing into `trivia.duckdb` with `source`,
  `dedup_hash`, `quality_score`, then the existing Gemini classifier assigns
  category + tags. The exploratory `library/` index is retired.
- **Round-builder reads the bank, emits the site schema.** ASSEMBLE queries by
  category/tag/theme; REPLICATE pulls a stored round. Output is a `quiz_<N>.json`
  that matches the live schema exactly, published through the existing flow.
- **CLI + game-gen.** A CLI emits the quiz JSON; where the site's game-gen already
  produces quizzes, it should draw from this bank corpus rather than only fresh
  generation.
- **Music is secondary + link-only for now.** Non-music first. A music question is
  `round_type=video` with a YouTube Music track link; the identifiable timestamp
  comes later.

## risks

- **TriviaQA quality + volume.** ~99K noisy, entity-answer, 2017-era entries.
  Mitigation: the bank's `quality_score` + `low_confidence` + the `round_quality`
  eval gate what reaches a round; classification routes them so they are findable
  but not blindly used.
- **Classifying ~99K with Gemini is a large batch.** Mitigation: classify
  incrementally / on the retrieved subset first; `gemini-q` free tier; the bank
  already supports `low_confidence`.
- **NYC League PDF parsing fidelity.** The Atlanta path pre-parsed .docx via
  `parse_pub_quiz_docx.ts`; NYC packets are PDFs and need their own parse.

## open_questions

- **How does the current game-gen work:** does it already draw from the bank, or
  generate fresh via LLM? This decides whether the round-builder extends game-gen
  or is a sibling CLI.
- **NYC League parsing:** reuse/extend the `parse_pub_quiz_docx` approach for PDFs,
  or a new parser.
- **Music timestamp** (deferred): how the identifiable moment is chosen per music
  question, and whether the host plays it or players click the link.
- **Retire mechanics:** delete `library/build_index.py` + `search.py` + the
  gitignored `trivia_library.duckdb`, or keep the TriviaQA extraction logic as the
  basis for `ingest_triviaqa.py` (likely the latter).

## custom-changelog

- **rev 2 (2026-10-19):** course-corrected to build on the EXISTING bank
  (`trivia.duckdb` + `scripts/ingest/` + the 16/28 taxonomy + Gemini classifier),
  after discovering the Atlanta pub quizzes are already ingested as `dirty-south`.
  Folded in the user's decisions: non-music first, music link-only (timestamp
  later), CLI emits quiz JSON / feed game-gen, open-answer unless the source had
  options, tags reuse the existing taxonomy (add only when a subtopic needs it).
  Retired the session's separate `library/` index.
- **rev 1 (2026-10-19):** initial draft assuming a new standalone library index.
