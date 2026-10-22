# NYC Trivia League round structures (reverse-engineered)

Reverse-engineered from 7 real packets (P287-P291, Z255/Z258/Z259) to replicate
their round STRUCTURE in the round-builder. The League runs a **fixed 7-round
skeleton** every week; only the themes change.

## The 7-round skeleton

| # | Type | Device | Qs | Generatable from bank? |
|---|---|---|---|---|
| R1 | **Themed / connection** | hidden letters or a theme the answers share | 8 | yes (`theme_round.py`) |
| R2 | **List Round** | one prompt, "name 8 of the 9 ..." , ~20s timer | 1 prompt / 8 answers | partially (needs list-style prompts) |
| R3 | **Themed / connection** | wordplay / "also a X" / category thread | 8 | yes (`theme_round.py`) |
| R4 | **Picture Round** | 10 images on a theme | 10 | no (needs images) |
| R5 | **Music Round** | 8 songs on a theme | 8 | link-only (YouTube Music `media_url`) |
| R6 | **Themed / hidden-letters** | a 2-3 letter string inside every answer | 8 | yes (`theme_round.py hidden`) |
| R7 | **Tiebreaker** | one numerical "how close" question | 1 | yes (numeric bank question) |

## The connection devices (the soul of the League)

Confirmed from the packets. Rounds 1, 3, 6 are the crafted "connection" rounds:

- **Hidden letters** (most common, always R6, often R1): a short string appears in
  EVERY answer. The title teases it.
  - "U **MAD** Bro?" -> Madison Square Garden, Madden, Madonna, Madagascar
  - "**ASS**embly Required", "**UFF** Stuff", "**SH**hhhhh!", "Let's **CO**", "**V** For..."
  -> `theme_round.py build hidden mad`
- **Shared keyword / theme**: every answer relates to one word or set.
  - "Herbs & Spices", "Cardinal Directions", "Also A Football Term", "Shake & Bake"
  -> `theme_round.py build keyword <word>`
- **Rhyme / sound**: answers rhyme or share a sound.
  -> `theme_round.py build rhyme <word>`
- **List Round** (R2): a single prompt with many correct answers, scored "name N of M"
  (e.g. "nine states border exactly three states, name eight"). Distinct `round_type: list`.
- **Picture** (R4) and **Music** (R5): visual/audio. Music maps to our `round_type: video`
  + a YouTube Music `media_url` per song (no audio files); Picture needs images.

## Replication status

`scripts/theme_round.py` replicates the generatable rounds (R1/R3/R6/R7):
- `discover hidden|rhyme|keyword` surfaces threads with enough questions.
- `build hidden|rhyme|keyword <value> --apply` emits a themed `quiz_<N>.json` round
  with a `theme_description` stating the connection (plays at `/present/<N>`).

Not yet auto-generated (need curated/linked content, structural placeholders):
- **R2 List Round** (the bank has Q->A pairs, not "name N of M" list prompts).
- **R4 Picture Round** (images).
- **R5 Music Round** (YouTube Music links; the `media_url` + `round_type: video` path).

Next: a `quiz` command that stitches the full 7-round NYC skeleton, auto-filling
R1/R3/R6 themed rounds + R7 tiebreaker and leaving labeled placeholders for the
list/picture/music rounds to fill.
