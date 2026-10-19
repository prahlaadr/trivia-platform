---
spec_format_version: "0.1"
title: "Pyaar Trivia Library + Round Builder"
artifact_type: "prd"
spec_revision: 1
author: "Prahlaad"
created_at: "2026-10-19T00:00:00Z"
updated_at: "2026-10-19T00:00:00Z"
linked_github_repo: "prahlaadr/trivia-platform"
---

> Feature spec for turning the Pyaar Trivia Library into publishable rounds for
> trivia.pyaarproject.org. The library INDEX is already built (see
> `library/build_index.py`); this specs the round-builder on top of it. Part of
> the `pando-trivia` stem.

## Problem

Prahlaad hosts trivia (Atlanta pub quizzes, NYC Trivia League) and runs the live
site `trivia.pyaarproject.org`, but every new quiz is built by hand: writing
questions from scratch or digging through scattered docs. He now has a large
indexed corpus on V3 (98,935 TriviaQA Unfiltered Q&A + 34 Atlanta rounds + 6 NYC
League rounds, full-text searchable), but it is only searchable text, there is no
way to turn it into a round in the site's format. So the corpus cannot actually
produce quizzes, and music rounds still mean wrangling audio files.

## Hypothesis

If the library has a round-builder that assembles or replicates rounds directly
in the `trivia.pyaarproject.org` quiz schema (including music rounds as YouTube
Music timestamp links), then Prahlaad will produce quizzes faster and reuse his
corpus, because a themed or replicated round goes from library to published with
no manual reformatting.

## Scope

```productspec-scope
in:
  - a round-builder whose output is the exact live-site quiz schema (round_type standard | progressive | video), so a round publishes with no translation
  - ASSEMBLE mode: retrieve questions on a theme (FTS + tags) from the library and compose a round
  - REPLICATE mode: materialize a stored full round (an Atlanta pub quiz, an NYC League packet, a past Pyaar round) into the schema, faithfully
  - music / video rounds: round_type=video with each question carrying a YouTube Music URL at a timestamp (a media_url field), sourced from the artists Prahlaad collects; no audio files
  - Gemini (gemini-q) tagging of the RETRIEVED SUBSET or the full rounds (category / theme / difficulty), not the whole corpus
  - dedup: never emit a question already used in a published quiz
  - publish through the EXISTING flow (data/quiz_<N>.json committed + Vercel Blob quiz_<N>.json)
out:
  - changing the live site's schema or player (the builder conforms to the site, never the reverse)
  - the library index / re-indexing (already built; this sits on top)
  - auto-publishing without human review (a person approves before it goes live)
  - cloud hosting of the library (local-first on V3; the portable index enables it later)
cut:
  - generating brand-new questions from nothing (the library is the source; the LLM only selects / cleans / tags)
  - full Gemini tagging of all 98,935 questions upfront
  - mini_games generation (the schema has mini_games; out of this version)
```

## Acceptance Criteria

- Given a theme, ASSEMBLE produces a round of N library questions that validates
  against the quiz schema and publishes to the live site unchanged.
- Given a stored full round (e.g. an NYC League packet), REPLICATE materializes it
  into the schema faithfully (questions + answers intact, in order).
- Given a music round request, each question has `round_type=video` context and a
  working YouTube Music URL at a timestamp; no audio files are produced.
- Given any round the builder emits, no question duplicates one already used in a
  published `data/quiz_*.json` (normalized match).
- Given a built `quiz_<N>.json`, it round-trips through the site's existing publish
  flow (committed + Blob) and renders correctly, confirming schema compatibility.

```productspec-ai-evals
- id: schema_conformance
  type: deterministic
  input_set: evals/trivia-rounds-golden.jsonl
  evaluator: automated_test
  pass_threshold: 1
  checks:
    - every emitted quiz/round/question has the required keys and a valid round_type (standard|progressive|video)
    - the output parses with the same loader the live site uses, with no extra translation
- id: question_cleanup_quality
  type: rubric
  input_set: evals/trivia-cleanup-golden.jsonl
  evaluator: llm_judge
  pass_threshold: 0.9
  checks:
    - selected TriviaQA questions are unambiguous and correctly answered
    - questions are pub-quiz appropriate (not noisy, dated, or near-duplicates)
    - a themed round actually matches its theme
- id: music_link_validity
  type: deterministic
  input_set: evals/music-questions-golden.jsonl
  evaluator: automated_test
  pass_threshold: 1
  checks:
    - each music question's media_url resolves to a YouTube Music track at a timestamp
    - the linked track matches the question's intended artist/song
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
- id: time_to_published_round
  metric: median_minutes_theme_to_published_round
  target: "< 10 min (vs a manual baseline to be measured)"
  window: per round
  segment: rounds built via the builder
  source: build_log
- id: library_sourced_share
  metric: pct_published_quiz_questions_sourced_from_library
  target: ">= 50%"
  window: per published quiz
  segment: quizzes built with the builder
  source: quiz_provenance
- id: rounds_built_per_month
  metric: rounds_published_via_builder
  target: ">= 8 / month"
  window: monthly
  segment: all builder output
  source: publish_log
- id: music_rounds_published
  metric: video_rounds_with_ytmusic_links_published
  target: ">= 1 / month"
  window: monthly
  segment: round_type=video
  source: publish_log
```

## solution

Intent-level approach (details belong in DESIGN / code):

- **Builder reads the library, emits the site schema.** Retrieve from the DuckDB
  index (FTS + tags) or pull a stored round, then compose a `quiz_<N>.json` that
  matches the live schema exactly. The site is the fixed contract; the builder
  conforms.
- **Two modes.** ASSEMBLE (theme -> candidate questions -> select/clean -> round)
  and REPLICATE (stored full round -> schema, faithfully).
- **Music rounds as links, not files.** `round_type=video`; each question gets a
  YouTube Music URL at a timestamp (`media_url`), drawn from the artists Prahlaad
  collects (the shared music library / pando-radar rosters).
- **Tagging is lazy.** FTS handles base retrieval; `gemini-q` adds
  category/theme/difficulty tags to the retrieved subset or the full rounds, and
  can do the light cleanup/selection pass. Never tag the whole corpus upfront.
- **Dedup + provenance.** Track which questions have been published so the builder
  never resurfaces one, and record each built question's library source.

## risks

- **TriviaQA quality.** The corpus is noisy, entity-answer style, 2017-era, and
  US/web-skewed. Mitigation: it is a source to MINE; the selection + cleanup pass
  (optionally Gemini) + the `question_cleanup_quality` eval guard what ships.
- **YouTube Music link durability + timestamp accuracy.** Links can rot, and "the
  moment the artist is identifiable" is a judgement call. See open questions.
- **Schema drift.** If the site's schema changes, the builder breaks. Mitigation:
  the `schema_conformance` eval runs against the live loader, so drift is caught.

## open_questions

- **Music timestamp selection.** How is the identifiable timestamp chosen per
  question: manual pick, the track start, or a heuristic (chorus/drop)? And does
  the host play it live or do players click through?
- **Builder interface.** A CLI that emits `quiz_<N>.json`, or integrated into the
  site's admin/edit UI? CLI-first is the likely default.
- **Where tags live.** In the DuckDB index (a `tags` column on `questions`) vs a
  sidecar. Index is the likely default so search + tags are one query.
- **V3-connected dependency.** Building/replaying from the raw corpus needs V3
  mounted; confirm the builder works off the portable index alone once tagged.
- **Choices / multiple-choice.** TriviaQA is open-answer; the schema has a
  `choices[]` array. Do assembled rounds stay open-answer, or should the builder
  generate distractors for some round types?
