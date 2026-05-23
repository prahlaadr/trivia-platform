# Category Taxonomy

The canonical category structure for the Pyaar Project Trivia question bank.
This is the source of truth — all sources (r-trivia CSV, OpenTDB, el-cms,
Claude-generated, manual) get mapped INTO this taxonomy at ingest time.

**Status:** draft v1 — under review.
**Last updated:** 2026-05-23

---

## Why a 2-tier taxonomy

The shape of "things an audience yells at trivia night" is roughly **15
broad genres** (Film, Music, Sport, etc.) each with **5–15 sub-pockets**
(Bollywood, Premier League, etc.). One-tier (just "Bollywood") is too
flat to browse. Three-tier (Film → Bollywood → 90s Bollywood Comedies)
is too deep for ingest mapping to stay sane.

**Tier 1 = "category"** — what shows up on the homepage as a tile / what
the host filters by when there's no specific topic.
**Tier 2 = "subcategory"** — the actual matcher for audience input. When
a host types "Premier League," we resolve to `sport › football-soccer`
with tag `region:uk`.

For everything that doesn't fit (regions, eras, audience-appropriateness),
we use **cross-cutting tags** rather than more subcategories.

---

## The 15 categories

| # | Slug | Name | What's in it |
|---|------|------|--------------|
| 1 | `film-tv` | Film & TV | Movies, TV series, animation, awards, directors, franchises, quotes |
| 2 | `music` | Music | Songs, albums, artists, lyrics, music history, instruments, music theory |
| 3 | `sport` | Sport | All sports — match/event facts, players, records, governing bodies |
| 4 | `geography` | Geography | Countries, capitals, rivers, mountains, flags, cities, landmarks, maps |
| 5 | `history` | History | World history, wars, leaders, civilizations, named eras |
| 6 | `science-nature` | Science & Nature | Physics, chemistry, biology, animals, space, the body, math |
| 7 | `food-drink` | Food & Drink | Cuisines, dishes, cocktails, beer, wine, brands, chefs, ingredients |
| 8 | `literature` | Literature | Books, authors, poetry, plays, characters, awards |
| 9 | `art-design` | Art & Design | Visual art, architecture, design, fashion, logos |
| 10 | `games-toys` | Games & Toys | Video games, board games, card games, toys, puzzles |
| 11 | `tech-internet` | Tech & Internet | Companies, founders, internet history, memes, programming, AI, crypto |
| 12 | `politics-society` | Politics & Society | World leaders, elections, geopolitics, economics, law |
| 13 | `myth-religion` | Mythology & Religion | World mythologies, religious traditions, sacred texts |
| 14 | `language-words` | Language & Words | Etymology, slang, anagrams, idioms, world languages |
| 15 | `pop-misc` | Pop Culture & Misc | Celebrities, decades-as-themes, internet culture, general knowledge |

---

## Subcategories with audience example phrases

Format: `slug` — Name *(example phrases an audience might shout)*

### 1. `film-tv` — Film & TV

- `hollywood` — Hollywood Movies *("Marvel", "Oscar winners", "Tarantino", "Christopher Nolan")*
- `bollywood` — Bollywood *("Shah Rukh", "90s Bollywood", "Bollywood songs")*
- `world-cinema` — World Cinema *("Korean cinema", "Studio Ghibli", "French New Wave")*
- `animation` — Animation *("Pixar", "Disney", "anime", "South Park")*
- `sitcoms` — Sitcoms *("Friends", "The Office", "Seinfeld", "Schitt's Creek")*
- `drama-series` — Drama Series *("Breaking Bad", "Succession", "The Wire")*
- `reality-tv` — Reality TV *("The Bachelor", "Real Housewives", "Survivor")*
- `awards` — Awards Shows *("Oscars", "Emmys", "Cannes")*
- `directors-auteurs` — Directors & Auteurs *("Tarantino", "Wes Anderson", "Scorsese")*
- `franchises` — Franchises *("Marvel", "Star Wars", "Harry Potter", "Fast & Furious")*
- `film-quotes` — Movie Quotes *("classic quotes", "the most iconic lines")*
- `kids-tv` — Kids' TV *("Bluey", "SpongeBob", "Avatar TLA")*
- `documentaries` — Documentaries *("nature docs", "true crime")*

### 2. `music` — Music

- `rock` — Rock *("classic rock", "Led Zeppelin", "Foo Fighters")*
- `pop` — Pop *("Taylor Swift", "Madonna", "Billie Eilish")*
- `hip-hop-rap` — Hip-Hop & Rap *("90s hip-hop", "Kendrick", "Tupac")*
- `electronic` — Electronic *("EDM", "Daft Punk", "techno")*
- `classical` — Classical *("Mozart", "Bach", "Tchaikovsky")*
- `jazz-blues` — Jazz & Blues *("Miles Davis", "John Coltrane", "BB King")*
- `country-folk` — Country & Folk *("Dolly Parton", "Johnny Cash", "Bob Dylan")*
- `bollywood-music` — Bollywood Music *("AR Rahman", "Lata Mangeshkar")*
- `world-music` — World Music *("Afrobeats", "K-pop", "reggaeton")*
- `lyrics` — Lyrics *("name the song from the lyric")*
- `albums-songs` — Albums & Songs *("best-selling albums", "Billboard #1s")*
- `one-hit-wonders` — One-Hit Wonders *("90s one-hit wonders")*
- `music-history` — Music History *("Woodstock", "British Invasion")*
- `instruments` — Instruments & Theory *("name the instrument", "music theory")*

### 3. `sport` — Sport

- `football-soccer` — Football / Soccer *("Premier League", "World Cup", "Messi", "Champions League")*
- `cricket` — Cricket *("IPL", "Tendulkar", "Test cricket")*
- `basketball` — Basketball *("NBA", "LeBron", "Michael Jordan")*
- `american-football` — American Football *("NFL", "Super Bowl", "Tom Brady")*
- `baseball` — Baseball *("MLB", "World Series", "Yankees")*
- `tennis` — Tennis *("Wimbledon", "Grand Slams", "Federer")*
- `formula-1` — Formula 1 / Motorsport *("F1", "Schumacher", "Senna")*
- `olympics` — Olympics *("Summer Olympics", "Usain Bolt", "Phelps")*
- `rugby` — Rugby *("Six Nations", "All Blacks")*
- `golf` — Golf *("Masters", "Tiger Woods")*
- `combat-sports` — Combat Sports *("boxing", "UFC", "Ali")*
- `esports` — Esports *("League of Legends", "Faker", "DotA")*
- `sport-history` — Sports History *("Olympic records", "famous moments")*
- `sport-misc` — Other Sports *("hockey", "swimming", "athletics")*

### 4. `geography` — Geography

- `countries-capitals` — Countries & Capitals *("capitals of Africa", "what's the capital of...")*
- `rivers-mountains` — Rivers & Mountains *("longest rivers", "tallest mountains")*
- `flags` — Flags *("identify the flag")*
- `world-cities` — World Cities *("famous cities", "city nicknames")*
- `oceans-seas` — Oceans & Seas *("the five oceans", "what sea is between...")*
- `europe` — European Geography *("EU countries", "Balkans")*
- `asia` — Asian Geography *("Southeast Asia", "Middle East")*
- `americas` — Americas *("US states", "South America")*
- `africa` — African Geography *("African countries", "the Sahel")*
- `oceania` — Oceania *("Australia", "Pacific islands")*
- `landmarks` — Famous Landmarks *("the Eiffel Tower", "wonders of the world")*
- `cartography` — Maps & Cartography *("the Equator", "map projections")*

### 5. `history` — History

- `ancient-world` — Ancient World *("ancient Rome", "Egyptians", "Greeks")*
- `medieval` — Medieval *("the Black Death", "the Crusades")*
- `early-modern` — Early Modern *("the Renaissance", "Age of Exploration")*
- `world-war-1` — World War I *("WW1", "trench warfare")*
- `world-war-2` — World War II *("WW2", "D-Day", "Hitler", "Pearl Harbor")*
- `cold-war` — Cold War *("USSR", "Cuban Missile Crisis", "Berlin Wall")*
- `indian-history` — Indian History *("Indian independence", "Gandhi", "Mughals")*
- `us-history` — US History *("Civil War", "founding fathers", "Civil Rights")*
- `uk-history` — UK & British History *("Tudors", "the Empire")*
- `world-leaders-historical` — Historical World Leaders *("emperors", "kings")*
- `inventions-discoveries` — Inventions & Discoveries *("who invented...")*
- `disasters-events` — Disasters & Major Events *("Titanic", "Chernobyl", "9/11")*

### 6. `science-nature` — Science & Nature

- `physics` — Physics *("speed of light", "Einstein", "quantum")*
- `chemistry` — Chemistry *("periodic table", "elements")*
- `biology` — Biology *("DNA", "cell biology")*
- `animals` — Animals & Zoology *("name that animal", "endangered species")*
- `plants` — Plants & Botany *("trees", "flowers")*
- `space-astronomy` — Space & Astronomy *("planets", "NASA", "black holes")*
- `human-body` — The Human Body *("organs", "anatomy", "diseases")*
- `medicine` — Medicine & Health *("famous doctors", "vaccines")*
- `earth-environment` — Earth & Environment *("climate", "tectonics")*
- `math` — Mathematics *("famous mathematicians", "Pi")*
- `inventors-scientists` — Famous Scientists *("Newton", "Marie Curie")*

### 7. `food-drink` — Food & Drink

- `cuisines-world` — World Cuisines *("French cuisine", "what country is this dish from")*
- `indian-food` — Indian Food *("biryani", "dosa", "regional Indian")*
- `italian-food` — Italian Food *("pasta shapes", "regional Italian")*
- `cocktails` — Cocktails *("classic cocktails", "name the drink")*
- `beer-wine` — Beer & Wine *("wine regions", "beer styles")*
- `baking-desserts` — Baking & Desserts *("cakes", "pastries")*
- `fast-food-brands` — Fast Food & Brands *("McDonald's", "KFC origin")*
- `chefs-restaurants` — Chefs & Restaurants *("Michelin stars", "Gordon Ramsay")*
- `ingredients` — Ingredients *("spices", "what's in this dish")*
- `food-history` — Food History *("origins of pizza", "Columbian exchange")*
- `non-alcoholic` — Non-Alcoholic Drinks *("coffee", "tea", "sodas")*

### 8. `literature` — Literature

- `classic-novels` — Classic Novels *("Dickens", "Austen", "Tolstoy")*
- `modern-fiction` — Modern Fiction *("Booker Prize", "contemporary")*
- `poetry` — Poetry *("famous poems", "name the poet")*
- `plays-drama` — Plays & Drama *("Shakespeare", "Tennessee Williams")*
- `sci-fi-fantasy` — Sci-Fi & Fantasy *("LOTR", "Asimov", "Game of Thrones books")*
- `kids-books` — Kids' Books *("Roald Dahl", "Dr. Seuss", "Harry Potter")*
- `non-fiction` — Non-Fiction *("biographies", "famous essays")*
- `mystery-thriller` — Mystery & Thriller *("Agatha Christie", "Sherlock Holmes")*
- `literary-characters` — Literary Characters *("name the character", "famous protagonists")*
- `authors` — Authors *("name the author", "nationalities")*
- `awards-lit` — Literary Awards *("Nobel Lit", "Pulitzer")*

### 9. `art-design` — Art & Design

- `painting` — Painting *("Van Gogh", "Picasso", "movements")*
- `sculpture` — Sculpture *("Michelangelo", "Rodin")*
- `architecture` — Architecture *("Gaudi", "famous buildings", "styles")*
- `photography` — Photography *("famous photographers")*
- `fashion` — Fashion *("designers", "houses", "iconic looks")*
- `logos-brands` — Logos & Brands *("identify the logo", "brand origins")*
- `art-history` — Art History *("Renaissance", "Impressionism")*
- `design-objects` — Design Objects *("chairs", "industrial design")*

### 10. `games-toys` — Games & Toys

- `video-games-classic` — Classic Video Games *("Mario", "Sonic", "Tetris")*
- `video-games-modern` — Modern Video Games *("Fortnite", "BG3", "Elden Ring")*
- `board-games` — Board Games *("Monopoly", "Settlers", "Pandemic")*
- `card-games` — Card Games *("poker", "bridge", "UNO")*
- `puzzles` — Puzzles & Brain Teasers *("crosswords", "rebus")*
- `toys` — Toys *("LEGO", "Barbie", "Hot Wheels")*
- `tabletop-rpg` — Tabletop RPGs *("D&D", "Critical Role")*
- `gaming-culture` — Gaming Culture *("speedruns", "Twitch", "MMORPGs")*

### 11. `tech-internet` — Tech & Internet

- `companies-founders` — Companies & Founders *("who founded Apple")*
- `social-media` — Social Media *("Twitter/X", "TikTok")*
- `memes` — Memes *("identify the meme", "meme origins")*
- `programming` — Programming *("programming languages", "famous bugs")*
- `gadgets-hardware` — Gadgets & Hardware *("iPhone history", "famous gadgets")*
- `gaming-tech` — Gaming Tech *("consoles", "GPU history")*
- `crypto-fintech` — Crypto & Fintech *("Bitcoin", "FTX")*
- `ai` — AI *("ChatGPT", "famous AI models")*
- `internet-history` — Internet History *("Web 1.0", "the dot-com bubble")*
- `startups` — Startups & VC *("unicorns", "YC")*

### 12. `politics-society` — Politics & Society

- `us-presidents` — US Presidents *("name the president")*
- `uk-pms-monarchy` — UK PMs & Monarchy *("UK prime ministers", "the royal family")*
- `world-leaders-modern` — World Leaders (Modern) *("current world leaders")*
- `indian-politics` — Indian Politics *("PMs of India", "states & CMs")*
- `elections` — Elections & Voting *("electoral systems", "famous campaigns")*
- `un-international` — UN & International Bodies *("WTO", "G7")*
- `economics` — Economics *("inflation", "famous economists")*
- `law-legal` — Law & Famous Cases *("Roe v Wade", "Supreme Court")*

### 13. `myth-religion` — Mythology & Religion

- `greek-mythology` — Greek Mythology *("the Olympians", "Greek myths")*
- `roman-mythology` — Roman Mythology *("Roman gods")*
- `norse-mythology` — Norse Mythology *("Thor", "Loki", "Ragnarok")*
- `hindu-mythology` — Hindu Mythology *("Ramayana", "Mahabharata", "Hindu gods")*
- `egyptian-mythology` — Egyptian Mythology *("Anubis", "Ra")*
- `christianity` — Christianity *("the Bible", "saints", "popes")*
- `islam` — Islam *("the Quran", "Five Pillars")*
- `buddhism-hinduism` — Buddhism & Hinduism *("religious practices", "founders")*
- `judaism` — Judaism *("Torah", "Jewish holidays")*
- `other-religions` — Other Religions *("Sikhism", "Jainism", "Shinto")*
- `folklore` — Folklore & Legends *("urban legends", "Arthurian legends")*

### 14. `language-words` — Language & Words

- `etymology` — Etymology *("origin of the word")*
- `idioms-phrases` — Idioms & Phrases *("complete the phrase")*
- `slang` — Slang *("90s slang", "Gen Z slang")*
- `world-languages` — World Languages *("most spoken languages", "language families")*
- `anagrams-wordplay` — Anagrams & Wordplay *("rearrange these letters")*
- `quotes-famous` — Famous Quotes *("who said it")*
- `punctuation-grammar` — Punctuation & Grammar *("the Oxford comma")*

### 15. `pop-misc` — Pop Culture & Misc

- `celebrities` — Celebrities *("name the celeb", "celebrity gossip")*
- `decades-90s` — The 90s *("90s pop culture")*
- `decades-2000s` — The 2000s *("Y2K", "MTV era")*
- `decades-2010s` — The 2010s *("2010s pop culture")*
- `decades-pre-90s` — Pre-90s Nostalgia *("60s/70s/80s pop culture")*
- `internet-culture` — Internet Culture *("Reddit history", "stan culture")*
- `general-knowledge` — General Knowledge *("classic pub trivia")*
- `weird-facts` — Weird Facts *("did you know")*
- `superlatives` — Superlatives *("tallest, biggest, fastest")*
- `wedding-relationships` — Weddings & Relationships *("traditions", "famous couples")*

**Subcategory count: 161** (close to the ~170 target — finalize after taxonomy review).

---

## Cross-cutting tags

Tags are M:N with questions. Slug format: `{kind}:{value}`.

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

### r-trivia (the Reddit scrape, 19 cats)

| r-trivia category | → canonical category | → subcategory |
|---|---|---|
| Geography | `geography` | (run keyword rules) |
| Language & Wordplay | `language-words` | (run keyword rules) |
| Entertainment (Movies & TV) | `film-tv` | (run keyword rules) |
| History | `history` | (run keyword rules) |
| Science & Nature | `science-nature` | (run keyword rules) |
| Sports | `sport` | (run keyword rules) |
| Food & Drink | `food-drink` | (run keyword rules) |
| Entertainment (Music) | `music` | (run keyword rules) |
| Entertainment (Books & Literature) | `literature` | (run keyword rules) |
| General Knowledge | `pop-misc` | `general-knowledge` |
| Mythology & Religion | `myth-religion` | (run keyword rules) |
| Politics & Government | `politics-society` | (run keyword rules) |
| Technology | `tech-internet` | (run keyword rules) |
| Art & Culture | `art-design` | (run keyword rules) |
| Pop Culture | `pop-misc` | (run keyword rules) |

### OpenTDB (24 cats, opentdb.com/api_category.php)

| OpenTDB ID + name | → canonical category | → subcategory |
|---|---|---|
| 9 General Knowledge | `pop-misc` | `general-knowledge` |
| 10 Books | `literature` | (keyword rules) |
| 11 Film | `film-tv` | `hollywood` |
| 12 Music | `music` | (keyword rules) |
| 13 Musicals & Theatres | `literature` | `plays-drama` |
| 14 Television | `film-tv` | (keyword rules) |
| 15 Video Games | `games-toys` | (keyword rules) |
| 16 Board Games | `games-toys` | `board-games` |
| 17 Science & Nature | `science-nature` | (keyword rules) |
| 18 Computers | `tech-internet` | (keyword rules) |
| 19 Mathematics | `science-nature` | `math` |
| 20 Mythology | `myth-religion` | (keyword rules) |
| 21 Sports | `sport` | (keyword rules) |
| 22 Geography | `geography` | (keyword rules) |
| 23 History | `history` | (keyword rules) |
| 24 Politics | `politics-society` | (keyword rules) |
| 25 Art | `art-design` | (keyword rules) |
| 26 Celebrities | `pop-misc` | `celebrities` |
| 27 Animals | `science-nature` | `animals` |
| 28 Vehicles | `pop-misc` | `general-knowledge` |
| 29 Comics | `literature` | `sci-fi-fantasy` |
| 30 Gadgets | `tech-internet` | `gadgets-hardware` |
| 31 Anime & Manga | `film-tv` | `animation` |
| 32 Cartoons | `film-tv` | `animation` |

### el-cms (~15 cats, varies by language)

Map by their `category_id` field. Detailed mapping table to be written during
the el-cms ingest task — pattern matches OpenTDB closely (it's derived from
the same lineage).

---

## Keyword rules (subcategory refinement)

When a source row is ambiguous (a Reddit "Sports" row could be football, NBA,
cricket, anything), we apply keyword-matching rules to refine the subcategory
and add tags. Defined in `scripts/ingest/_taxonomy/keyword_rules.yaml`.

Sketched grammar:

```yaml
- match: '/(?i)\b(bollywood|shahrukh|sharukh|hindi cinema|amitabh|kapoor)\b/'
  set:
    subcategory: bollywood
    tags: ['region:india']

- match: '/(?i)\b(premier league|epl|manchester united|liverpool|arsenal|chelsea)\b/'
  set:
    subcategory: football-soccer
    tags: ['region:uk']

- match: '/(?i)\b(NFL|super bowl|tom brady|patriots|quarterback)\b/'
  set:
    subcategory: american-football
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
    subcategory: us-presidents
    tags: ['region:us', 'flag:us-centric']
```

A `validate.py` pass after ingest reports any rows still with
`subcategory IS NULL` for manual triage.

---

## Triage workflow (unmapped questions)

After every ingest:

1. `validate.py` prints rows where `subcategory IS NULL` grouped by category.
2. Reviewer either:
   - Adds a new keyword rule (if the pattern is recurring) and re-runs `reclassify.py`.
   - Sets the subcategory manually via the admin UI (Phase B.2).
   - Marks the row `flag:low-confidence` if it's genuinely uncategorizable.

The goal is to keep **`subcategory IS NULL` count under 5%** of the bank.

---

## Changes & evolution

Renaming or splitting a subcategory requires:

1. Add new subcategory row (do not delete the old one yet).
2. Update keyword rules to point at the new subcategory.
3. Run `reclassify.py` — moves matching questions to the new subcategory.
4. Verify old subcategory has 0 questions, then soft-delete (`active = false`).
5. Bump version in this doc; add `CHANGELOG.md` entry.

Top-level renames are higher-stakes; require an explicit migration script.
