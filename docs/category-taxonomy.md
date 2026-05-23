# Category Taxonomy

The canonical category structure for the Pyaar Project Trivia question bank.
All sources (r-trivia CSV, OpenTDB, el-cms, Claude-generated, manual) get
mapped INTO this taxonomy at ingest time.

**Status:** v1 — locked.
**Last updated:** 2026-05-23
**Shape:** 15 top-level categories × 50 subcategories total

---

## Design principles

1. **Audience-usefulness over exhaustiveness.** A subcategory exists only if
   an audience member would actually shout it. "Renaissance painters" is too
   specific (use the tag `era:pre-1900` on art); "Bollywood" is its own pocket
   because people do yell it.
2. **The long tail rides on tags, not subcategories.** Regional flavor
   (`region:india`, `region:uk`), eras (`era:90s`, `era:2010s`), and
   audience-fit (`audience:family`, `audience:adult`) are tags, not their own
   subcat — keeps the catalog small and browsable.
3. **Consolidate aggressively, split only when critical mass demands.**
   "Greek mythology" alone wouldn't justify a subcat, but "western mythology"
   (Greek + Roman + Norse + Egyptian) does. Cricket gets its own (huge
   audience demand); rugby + AFL + hockey all live in a single misc subcat.

---

## The 15 categories

| # | Slug | Name |
|---|------|------|
| 1 | `film-tv` | Film & TV |
| 2 | `music` | Music |
| 3 | `sport` | Sport |
| 4 | `geography` | Geography |
| 5 | `history` | History |
| 6 | `science-nature` | Science & Nature |
| 7 | `food-drink` | Food & Drink |
| 8 | `literature` | Literature |
| 9 | `art-design` | Art & Design |
| 10 | `games-toys` | Games & Toys |
| 11 | `tech-internet` | Tech & Internet |
| 12 | `politics-society` | Politics & Society |
| 13 | `myth-religion` | Mythology & Religion |
| 14 | `language-words` | Language & Words |
| 15 | `pop-misc` | Pop Culture & Misc |

---

## Subcategories (50)

Format: `slug` — Name *(audience-shouted phrases that resolve here)*

### 1. `film-tv` — Film & TV (5)

- `hollywood` — Hollywood Movies *("Marvel", "Tarantino", "Nolan", "Oscars")*
- `bollywood` — Bollywood *("Shah Rukh", "Hindi cinema", "90s Bollywood")*
- `world-cinema-animation` — World Cinema & Animation *("Korean cinema", "Studio Ghibli", "Pixar", "anime")*
- `tv-shows` — TV Shows *("Friends", "Breaking Bad", "Succession", "reality TV", "Bluey")*
- `franchises-awards` — Franchises & Awards *("Star Wars", "Marvel franchises", "James Bond", "Oscar trivia")*

### 2. `music` — Music (4)

- `rock-pop` — Rock & Pop *("classic rock", "Taylor Swift", "Beatles", "Madonna")*
- `hip-hop-electronic` — Hip-Hop & Electronic *("90s hip-hop", "Kendrick", "Daft Punk", "EDM")*
- `bollywood-world-music` — Bollywood & World Music *("AR Rahman", "Afrobeats", "K-pop", "reggaeton")*
- `music-trivia` — Music Trivia *("classical", "jazz", "lyrics", "albums", "one-hit wonders", "instruments")*

### 3. `sport` — Sport (5)

- `football-soccer` — Football / Soccer *("Premier League", "World Cup", "Messi", "Champions League")*
- `cricket` — Cricket *("IPL", "Tendulkar", "Test cricket", "Kohli")*
- `american-sports` — American Sports *("NFL", "NBA", "MLB", "Super Bowl", "LeBron", "Tom Brady")*
- `tennis-golf-olympics` — Tennis, Golf & Olympics *("Wimbledon", "Masters", "Usain Bolt", "Phelps")*
- `motorsport-combat` — Motorsport & Combat *("F1", "Schumacher", "Ali", "UFC", "boxing")*

### 4. `geography` — Geography (3)

- `countries-capitals-flags` — Countries, Capitals & Flags *("capital of...", "identify the flag", "European countries")*
- `cities-landmarks` — Cities & Landmarks *("famous cities", "Eiffel Tower", "wonders of the world")*
- `physical-geography` — Physical Geography *("rivers", "mountains", "oceans", "deserts", "tectonics")*

### 5. `history` — History (3)

- `ancient-medieval` — Ancient & Medieval *("Ancient Rome", "Egyptians", "the Crusades", "Black Death")*
- `world-wars-cold-war` — World Wars & Cold War *("WW1", "WW2", "D-Day", "USSR", "Berlin Wall")*
- `modern-history` — Modern History *("Indian independence", "Civil Rights", "founding fathers", "Mughals")*

### 6. `science-nature` — Science & Nature (4)

- `physics-chemistry-math` — Physics, Chemistry & Math *("Einstein", "periodic table", "Pi", "elements")*
- `biology-body-medicine` — Biology, Body & Medicine *("DNA", "anatomy", "diseases", "vaccines")*
- `animals-plants-earth` — Animals, Plants & Earth *("name that animal", "trees", "climate")*
- `space-scientists` — Space & Scientists *("planets", "NASA", "black holes", "Newton", "Marie Curie")*

### 7. `food-drink` — Food & Drink (3)

- `world-cuisines` — World Cuisines *("Indian food", "Italian", "biryani", "French cuisine")*
- `drinks` — Drinks *("cocktails", "wine regions", "beer styles", "coffee", "tea")*
- `food-culture` — Food Culture *("Michelin", "Gordon Ramsay", "fast food brands", "food history")*

### 8. `literature` — Literature (3)

- `classics-poetry-theatre` — Classics, Poetry & Theatre *("Shakespeare", "Dickens", "famous poems")*
- `genre-fiction` — Genre Fiction *("LOTR", "Game of Thrones books", "Agatha Christie", "Harry Potter")*
- `authors-characters-awards` — Authors, Characters & Awards *("name the author", "Booker", "Pulitzer", "literary characters")*

### 9. `art-design` — Art & Design (2)

- `art-architecture` — Art & Architecture *("Van Gogh", "Picasso", "Gaudi", "art movements")*
- `fashion-logos-design` — Fashion, Logos & Design *("designers", "identify the logo", "iconic looks")*

### 10. `games-toys` — Games & Toys (2)

- `video-games` — Video Games *("Mario", "Fortnite", "Tetris", "Elden Ring", "consoles")*
- `analog-games-toys` — Analog Games & Toys *("Monopoly", "D&D", "LEGO", "crosswords", "card games")*

### 11. `tech-internet` — Tech & Internet (3)

- `companies-tech` — Companies & Tech *("Apple", "tech founders", "famous startups", "Bitcoin")*
- `internet-memes-social` — Internet, Memes & Social *("TikTok", "identify the meme", "Twitter/X", "internet history")*
- `programming-ai-gadgets` — Programming, AI & Gadgets *("programming languages", "ChatGPT", "iPhone history")*

### 12. `politics-society` — Politics & Society (3)

- `leaders-world` — World Leaders *("US presidents", "UK PMs", "Indian PMs", "monarchs")*
- `elections-economics` — Elections & Economics *("electoral systems", "inflation", "famous campaigns")*
- `law-international` — Law & International *("Supreme Court", "UN", "famous cases", "treaties")*

### 13. `myth-religion` — Mythology & Religion (3)

- `western-myth` — Western Mythology *("Greek gods", "Norse mythology", "Roman gods", "Egyptian myth")*
- `eastern-myth-religion` — Eastern Mythology & Religion *("Hindu mythology", "Ramayana", "Buddhism", "Sikhism")*
- `abrahamic-folklore` — Abrahamic Religions & Folklore *("Bible", "Quran", "Torah", "urban legends")*

### 14. `language-words` — Language & Words (2)

- `etymology-idioms-slang` — Etymology, Idioms & Slang *("origin of the word", "complete the phrase", "Gen Z slang")*
- `wordplay-quotes-grammar` — Wordplay, Quotes & Grammar *("anagrams", "who said it", "the Oxford comma")*

### 15. `pop-misc` — Pop Culture & Misc (5)

- `celebrities-people` — Celebrities & People *("name the celeb", "celebrity gossip", "famous couples")*
- `decades-nostalgia` — Decades & Nostalgia *("the 90s", "Y2K", "80s pop culture")*
- `internet-culture` — Internet Culture *("Reddit history", "stan culture", "Discord")*
- `weird-facts` — Weird Facts *("did you know", "trivia oddities")*
- `general-knowledge` — General Knowledge *("classic pub trivia", "superlatives", "tallest/biggest/fastest")*

**Total: 50 subcategories.**

---

## Cross-cutting tags

Tags are M:N with questions and carry the "long tail" detail that doesn't
deserve its own subcategory. Slug format: `{kind}:{value}`.

### `kind: region`
`region:india` · `region:uk` · `region:us` · `region:eu` · `region:latam` · `region:asia` · `region:africa` · `region:oceania` · `region:mena` · `region:global`

### `kind: era`
`era:pre-1900` · `era:1900-1950` · `era:60s` · `era:70s` · `era:80s` · `era:90s` · `era:2000s` · `era:2010s` · `era:2020s`

### `kind: audience`
`audience:family` (safe for any room) · `audience:adult` (drinking/swearing/sex jokes) · `audience:nerd` (deep specialist knowledge)

### `kind: flag`
`flag:time-sensitive` (answer rots; "current world record") · `flag:us-centric` (heavily US sports/politics) · `flag:opinion` (debatable answer) · `flag:nsfw` · `flag:low-confidence` (unverified answer) · `flag:requires-image` (needs the original image asset to make sense)

---

## Source mapping rules

These map upstream source categories → our canonical `(category, subcategory)`
at ingest time. Defined in `scripts/ingest/_taxonomy/mappings.json`.

### r-trivia (Reddit scrape, 19 cats)

| r-trivia category | → category | → subcategory (default before keyword rules) |
|---|---|---|
| Geography | `geography` | `countries-capitals-flags` |
| Language & Wordplay | `language-words` | `wordplay-quotes-grammar` |
| Entertainment (Movies & TV) | `film-tv` | `hollywood` |
| History | `history` | `modern-history` |
| Science & Nature | `science-nature` | `animals-plants-earth` |
| Sports | `sport` | `american-sports` |
| Food & Drink | `food-drink` | `world-cuisines` |
| Entertainment (Music) | `music` | `rock-pop` |
| Entertainment (Books & Literature) | `literature` | `classics-poetry-theatre` |
| General Knowledge | `pop-misc` | `general-knowledge` |
| Mythology & Religion | `myth-religion` | `western-myth` |
| Politics & Government | `politics-society` | `leaders-world` |
| Technology | `tech-internet` | `companies-tech` |
| Art & Culture | `art-design` | `art-architecture` |
| Pop Culture | `pop-misc` | `celebrities-people` |

After this default, keyword rules refine the subcat (e.g. a Sports row
mentioning "Premier League" gets moved to `football-soccer`).

### OpenTDB (24 cats, opentdb.com/api_category.php)

| OpenTDB | → category | → subcategory |
|---|---|---|
| 9 General Knowledge | `pop-misc` | `general-knowledge` |
| 10 Books | `literature` | `classics-poetry-theatre` |
| 11 Film | `film-tv` | `hollywood` |
| 12 Music | `music` | `rock-pop` |
| 13 Musicals & Theatres | `literature` | `classics-poetry-theatre` |
| 14 Television | `film-tv` | `tv-shows` |
| 15 Video Games | `games-toys` | `video-games` |
| 16 Board Games | `games-toys` | `analog-games-toys` |
| 17 Science & Nature | `science-nature` | `animals-plants-earth` |
| 18 Computers | `tech-internet` | `programming-ai-gadgets` |
| 19 Mathematics | `science-nature` | `physics-chemistry-math` |
| 20 Mythology | `myth-religion` | `western-myth` |
| 21 Sports | `sport` | `american-sports` |
| 22 Geography | `geography` | `countries-capitals-flags` |
| 23 History | `history` | `modern-history` |
| 24 Politics | `politics-society` | `leaders-world` |
| 25 Art | `art-design` | `art-architecture` |
| 26 Celebrities | `pop-misc` | `celebrities-people` |
| 27 Animals | `science-nature` | `animals-plants-earth` |
| 28 Vehicles | `pop-misc` | `general-knowledge` |
| 29 Comics | `literature` | `genre-fiction` |
| 30 Gadgets | `tech-internet` | `programming-ai-gadgets` |
| 31 Anime & Manga | `film-tv` | `world-cinema-animation` |
| 32 Cartoons | `film-tv` | `world-cinema-animation` |

### el-cms (~15 cats, varies by language)

Mirrors the OpenTDB scheme; detailed mapping written when the el-cms ingest
task is built.

---

## Keyword rules (subcategory refinement & tagging)

When a source row is ambiguous (a Reddit "Sports" row could be soccer,
cricket, anything), we apply keyword-matching rules to refine the subcat
and add tags. Defined in `scripts/ingest/_taxonomy/keyword_rules.yaml`.

Sketched grammar:

```yaml
- match: '/(?i)\b(bollywood|shahrukh|shah rukh|hindi cinema|amitabh|kapoor|aishwarya)\b/'
  set:
    subcategory: bollywood
    tags: ['region:india']

- match: '/(?i)\b(premier league|EPL|manchester united|liverpool|arsenal|chelsea)\b/'
  set:
    subcategory: football-soccer
    tags: ['region:uk']

- match: '/(?i)\b(NFL|super bowl|tom brady|patriots|quarterback)\b/'
  set:
    subcategory: american-sports
    tags: ['region:us', 'flag:us-centric']

- match: '/(?i)\b(IPL|tendulkar|kohli|test cricket|virat|dhoni)\b/'
  set:
    subcategory: cricket
    tags: ['region:india']

- match: '/(?i)\b(as of|currently|reigning|world record holder|presently|right now)\b/'
  set:
    tags: ['flag:time-sensitive']

- match: '/(?i)\b(US president|president of the united states|POTUS)\b/'
  set:
    subcategory: leaders-world
    tags: ['region:us', 'flag:us-centric']

- match: '/(?i)\b(ramayana|mahabharata|krishna|vishnu|shiva|brahma|hindu god)\b/'
  set:
    subcategory: eastern-myth-religion
    tags: ['region:india']
```

A `validate.py` pass after ingest reports any rows where the default mapping
didn't refine — i.e. rows still sitting on the catch-all subcat — so they
can be inspected.

---

## Triage workflow (unmapped or vague questions)

After every ingest:

1. `validate.py` prints rows still on the default catch-all subcat per category.
2. Reviewer either:
   - Adds a new keyword rule (if the pattern is recurring) and re-runs `reclassify.py`.
   - Sets the subcategory manually via the admin UI (Phase B.2).
   - Marks the row `flag:low-confidence` if it's genuinely uncategorizable.

Goal: keep questions on the default catch-all subcat **under 20%** of each
top-level category.

---

## Evolution rules

Renaming or splitting a subcategory:

1. Add new subcategory row (don't delete the old one yet).
2. Update keyword rules to point at the new subcategory.
3. Run `reclassify.py` — moves matching questions.
4. Verify old subcategory has 0 questions, then soft-delete (`active = false`).
5. Bump version in this doc; add `CHANGELOG.md` entry.

Top-level renames are higher-stakes; require an explicit migration script
and a discussion thread, since they affect the homepage UI tiles.
