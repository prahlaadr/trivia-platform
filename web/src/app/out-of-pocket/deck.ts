/* Out of Pocket — Data Camp, June 2026.
 *
 * This is the SINGLE SOURCE OF TRUTH for the live /out-of-pocket deck.
 * Edit sections/questions here; regenerate the tracking ledger with
 * `bun run export-csv`. (Built on the Sep 2025 SQL Trivia deck, since
 * expanded with the "SQL at the Movies" round and re-dated for Data Camp.)
 * Each question becomes a (question slide) → (reveal slide) pair via buildDeck.
 */

export type Slide =
  | { type: "cover"; title: string; subtitle?: string; date?: string }
  | {
      type: "section";
      sectionNumber: number;
      sectionTitle: string;
      subtitle?: string;
      body?: string;
    }
  | {
      type: "question";
      number: number;
      text: string;
      points: number;
      bullets?: string[];
      matchPairs?: { term: string; definition: string }[];
      codeBlock?: string;
      imageSrc?: string;
      imageSrc2?: string;
      caption?: string;
      sourceUrl?: string;
      sourceLabel?: string;
    }
  | {
      type: "reveal";
      number: number;
      text: string;
      points: number;
      answer: string;
      bullets?: { text: string; correct?: boolean }[];
      matchPairs?: { term: string; definition: string }[];
      codeBlock?: string;
      imageSrc?: string;
      imageSrc2?: string;
      caption?: string;
      sourceUrl?: string;
      sourceLabel?: string;
    }
  | { type: "answers-divider"; title?: string; date?: string };

export interface DeckQuestion {
  number: number;
  /** Questions default to included. Set false to keep a question "on the
   *  bench" — skipped by buildDeck and not counted, but still editable and
   *  toggleable per event. Mirrors DeckSection.enabled. */
  enabled?: boolean;
  text: string;
  points: number;
  answer: string;
  bullets?: string[];
  revealBullets?: { text: string; correct?: boolean }[];
  /** A matching question: question slide shows terms + shuffled definitions
   *  (both columns); reveal shows each term next to its correct definition. */
  matchPairs?: { term: string; definition: string }[];
  codeBlock?: string;
  /** Image shown on the question slide (e.g. the porcupine quill SEM). */
  questionImageSrc?: string;
  questionImageSrc2?: string;
  questionCaption?: string;
  questionSourceUrl?: string;
  /** Image shown on the reveal slide alongside the answer. */
  revealImageSrc?: string;
  revealImageSrc2?: string;
  revealCaption?: string;
  revealSourceUrl?: string;
  /** Label used for both question and reveal source links; defaults to "source". */
  sourceLabel?: string;
}

export interface DeckSection {
  number: number;
  title: string;
  subtitle?: string;
  /** Long-form body text rendered on the section divider (e.g. Section 0 team intro). */
  body?: string;
  /** Optional rounds default to enabled. Set false to keep a round "loaded but
   *  off" — it's skipped by buildDeck and not counted, but stays editable and
   *  can be flipped on per event (e.g. swap rounds for returning players). */
  enabled?: boolean;
  questions: DeckQuestion[];
}

/** The baked-in deck. Used as the seed/default when no saved deck exists,
 *  and as the "Reset to original" target. */
export const DEFAULT_SECTIONS: DeckSection[] = [
  {
    number: 0,
    title: "Get into your teams + team name",
    subtitle: "(we’re all zero-indexed, right?)",
    body: "You should have gotten your team number assigned at the start. If not or you forgot, introduce yourself to a team! Also, think of a team name. Some ideas to get you started: Drop table like it’s hot; dude, where’s my data; null pointer sisters; smells like updag in here",
    questions: [],
  },
  {
    number: 1,
    title: "Phase 1: SQL trivia!",
    subtitle: "SELECT *",
    questions: [
      {
        number: 1,
        text: "What does SQL stand for?",
        points: 1,
        answer: "Structured Query Language",
      },
      {
        number: 2,
        text: "What does the “R” stand for in the R programming language?",
        points: 1,
        answer: "Ross (Ihaka) or Robert (Gentleman): creators of R language",
      },
      {
        number: 3,
        text: "Put these in the correct order of evaluation (all or nothing):",
        points: 2,
        bullets: ["SELECT", "FROM", "WHERE", "LIMIT", "HAVING"],
        answer: "FROM → WHERE → HAVING → SELECT → LIMIT",
      },
    ],
  },
  {
    number: 2,
    title: "Phase 2: Sequel trivia",
    subtitle: "oops name collision",
    questions: [
      {
        number: 1,
        text: "Which of the following are real Avatar movie sequels?",
        points: 3,
        bullets: [
          "Way of Water",
          "Search for the Air Seed",
          "Fire and Ash",
          "The Tulkun Rider",
          "The Wind Awakens",
        ],
        answer: "",
        revealBullets: [
          { text: "Way of Water", correct: true },
          { text: "Search for the Air Seed" },
          { text: "Fire and Ash", correct: true },
          { text: "The Tulkun Rider", correct: true },
          { text: "The Wind Awakens" },
        ],
      },
      {
        number: 2,
        text: "Who directed The Last Jedi?",
        points: 1,
        bullets: ["Kathleen Kennedy", "JJ Abrams", "Rian Johnson", "Terry Gilliam"],
        answer: "Rian Johnson",
      },
      {
        number: 3,
        text: "What movie was “Electric Boogaloo” originally the sequel to?",
        points: 1,
        answer: "Breakin’",
        revealImageSrc: "/oop/img-breakin.png",
      },
      {
        number: 4,
        text: "Shaun of the Dead, Hot Fuzz, and The World’s End are the movies in this trilogy, named after an ice cream … or a pastry, depending on where in Europe you find yourself",
        points: 1,
        answer: "Cornetto",
        revealImageSrc: "/oop/img-cornetto.png",
        revealImageSrc2: "/oop/img-croissant.png",
        revealCaption: "“Non sono un croissant!” (“I’m not a croissant!” in Italian)",
      },
      {
        number: 5,
        text: "The Devil Wears Prada 2 (out 2026) reportedly went by a one-word codename on its casting calls — the very color Miranda Priestly (Meryl Streep) dissects in her famous monologue about the fashion industry’s cultural reach in the first film. What’s the word?",
        points: 2,
        answer: "Cerulean",
        revealImageSrc: "/oop/img-cerulean.png",
        revealCaption: "Andy’s “lumpy blue sweater” — cerulean, per Miranda’s monologue.",
      },
      {
        number: 6,
        text: "Star Wars: Episode I is The Phantom Menace. Name Episodes II and III (1 pt each):",
        points: 2,
        answer: "Attack of the Clones (II) and Revenge of the Sith (III)",
      },
    ],
  },
  {
    number: 3,
    title: "Phase 3: “Sounds Like SQL” Trivia",
    subtitle: "Open your minds for this one",
    questions: [
      {
        number: 1,
        text: "These birds patter their feet on sand or soil in a behavior called worm charming. The prevailing theory is that it sounds enough like rain to drum up assorted invertebrates for the birds to eat",
        points: 1,
        answer: "Seagulls",
        revealImageSrc: "/oop/img-seagulls.jpg",
        revealSourceUrl: "https://www.youtube.com/watch?v=ppPcSaXyY4w",
      },
      {
        number: 2,
        text: "This 90s action star was in movies like Hard to Kill, Above the Law, Out for Justice, Under Siege, and other combinations of [Preposition] [Noun]",
        points: 1,
        answer: "Steven Seagal",
      },
      {
        number: 3,
        text: "What’s this thing? (super sharp, sharper than a hypodermic needle; microscopic backward-facing barbs)",
        points: 1,
        answer: "Quill (porcupine)",
        questionImageSrc: "/oop/img-quill-needle.png",
        questionImageSrc2: "/oop/img-quill-barbs.png",
        revealCaption:
          "Many believe the natural antibiotic effect of the quill's grease is a sign of benevolence — what it really does is make it impossible for the sting victim to escape the pain through the call of death, forcing it to live through the pain as a reminder of the wrath of our lil porcupine.",
        revealSourceUrl: "https://link.springer.com/article/10.1007/BF01016483",
        sourceLabel: "natural antibiotic effect",
      },
      {
        number: 4,
        text: "The world’s biggest one of these can be found in Portugal (Parque da Cidade, Porto). It measures 25,100 sq. m (270,174 sq. ft)",
        points: 1,
        answer: "Quilt",
        revealImageSrc: "/oop/img-quilt.png",
        questionSourceUrl:
          "https://www.guinnessworldrecords.com/world-records/largest-patchwork-quilt",
        revealSourceUrl:
          "https://www.guinnessworldrecords.com/world-records/largest-patchwork-quilt",
      },
      {
        number: 5,
        text: "When this is baked into tart form, it becomes Harry Potter’s favorite treat",
        points: 1,
        answer: "Treacle",
        revealImageSrc: "/oop/img-treacle.png",
      },
      {
        number: 6,
        text: "This dog is half dachshund mixed with ________",
        points: 1,
        answer: "Beagle (his name is Bodhi)",
        questionImageSrc: "/oop/img-bodhi.jpg",
        revealImageSrc: "/oop/img-bodhi.jpg",
        revealCaption: "His name is Bodhi. My brother-in-law’s dog and famous good boy",
      },
    ],
  },
  {
    number: 4,
    title: "Phase 4: SQL at the Movies",
    subtitle: "your queries betray you",
    questions: [
      {
        number: 1,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock: "SELECT * FROM Earth\nWHERE population = population / 2;",
        answer: "Avengers: Infinity War",
        revealImageSrc: "/oop/movies/infinity-war.png",
      },
      {
        number: 2,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock: "UPDATE students\nSET status = 'wizard'\nWHERE age = 11;",
        answer: "Harry Potter and the Sorcerer’s Stone",
        revealImageSrc: "/oop/movies/sorcerers-stone.png",
      },
      {
        number: 3,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock: "DROP TABLE skynet;",
        answer: "Terminator 2: Judgment Day",
        revealImageSrc: "/oop/movies/terminator2.png",
      },
      {
        number: 4,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock:
          "INSERT INTO DeLorean (destination_year)\nVALUES (1955);",
        answer: "Back to the Future",
        revealImageSrc: "/oop/movies/back-to-the-future.png",
      },
      {
        number: 5,
        text: "Identify the movie from the SQL:",
        points: 1,
        codeBlock:
          "MERGE INTO Corleone_Family\nUSING rivals\nON conflict = TRUE\nWHEN MATCHED THEN DELETE;",
        answer: "The Godfather Part II",
        revealImageSrc: "/oop/movies/godfather2.png",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // EXTRA ROUNDS — all ON by default. Toggle a round (or question) OFF in
  // the editor to drop it from a given event; set `enabled: false` here to
  // bench one by default. Refine drafts in the editor as needed.
  // ─────────────────────────────────────────────────────────────────
  {
    number: 5,
    title: "Phase 5: Guess the Data Logo",
    subtitle: "you've stared at these all day",
    questions: [
      // 10 healthcare-data heavyweights. Logos fetched from Wikimedia Commons.
      {
        number: 1,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "R",
        questionImageSrc: "/oop/logos/r.svg",
        revealCaption: "The lingua franca of biostatistics & clinical-trial analysis (see Bioconductor).",
      },
      {
        number: 2,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "Python",
        questionImageSrc: "/oop/logos/python.svg",
        revealCaption: "Workhorse for health data science & ML.",
      },
      {
        number: 3,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "MATLAB",
        questionImageSrc: "/oop/logos/matlab.png",
        revealCaption: "Medical imaging and biosignal (ECG/EEG) processing.",
      },
      {
        number: 4,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "Google Sheets",
        questionImageSrc: "/oop/logos/google-sheets.svg",
        revealCaption: "The universal clinical-ops spreadsheet, for better or worse.",
      },
      {
        number: 5,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "PostgreSQL",
        questionImageSrc: "/oop/logos/postgresql.svg",
        revealCaption: "Common open-source backend for EHR & analytics warehouses.",
      },
      {
        number: 6,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "MySQL",
        questionImageSrc: "/oop/logos/mysql.svg",
        revealCaption: "Ubiquitous relational DB behind countless health apps.",
      },
      {
        number: 7,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "MongoDB",
        questionImageSrc: "/oop/logos/mongodb-icon.png",
        revealImageSrc: "/oop/logos/mongodb.svg",
        revealCaption: "Document store — a natural fit for FHIR / JSON clinical data.",
      },
      {
        number: 8,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "Snowflake",
        questionImageSrc: "/oop/logos/snowflake-icon.png",
        revealImageSrc: "/oop/logos/snowflake.svg",
        revealCaption: "Cloud data warehouse powering population-health analytics.",
      },
      {
        number: 9,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "Databricks",
        questionImageSrc: "/oop/logos/databricks-icon.png",
        revealImageSrc: "/oop/logos/databricks.png",
        revealCaption: "Lakehouse for large-scale clinical & genomic ML.",
      },
      {
        number: 10,
        text: "Guess the data tool from its logo:",
        points: 1,
        answer: "Microsoft Power BI",
        questionImageSrc: "/oop/logos/powerbi.svg",
        revealCaption: "Dashboards across payers, providers & hospital ops.",
      },
    ],
  },
  {
    number: 6,
    title: "Phase 6: A Brief History of the Spreadsheet",
    subtitle: "before Sheets, before Excel",
    questions: [
      {
        number: 1,
        text: "Released in 1979 for the Apple II, what program is widely considered the first spreadsheet — the original “killer app” that sold computers?",
        points: 1,
        answer: "VisiCalc",
      },
      {
        number: 2,
        text: "Which spreadsheet dominated the 1980s PC market on MS-DOS, before Excel eventually took the crown?",
        points: 1,
        answer: "Lotus 1-2-3",
      },
      {
        number: 3,
        text: "Microsoft Excel first shipped in 1985 — on which platform, two years before a Windows version existed?",
        points: 1,
        answer: "The Apple Macintosh",
      },
      {
        number: 4,
        text: "In the function name VLOOKUP, what does the “V” stand for?",
        points: 1,
        answer: "Vertical",
      },
      {
        number: 5,
        text: "Which three-key combo entered a legacy “array formula” in older versions of Excel?",
        points: 1,
        answer: "Ctrl + Shift + Enter",
      },
      {
        number: 6,
        text: "The word “spreadsheet” comes from accountants laying numbers out how, across a ledger?",
        points: 1,
        answer: "Spread across two facing pages (a “spread” sheet)",
      },
    ],
  },
  {
    number: 7,
    title: "Phase 7: X Marks the Spot",
    subtitle: "every answer starts with X",
    questions: [
      {
        // Matching question: question slide shows both columns (terms +
        // shuffled definitions); reveal shows each term beside its match.
        // 8 of 10 — two more TBD.
        number: 1,
        text: "Match each X-term to its definition:",
        points: 8,
        answer: "",
        matchPairs: [
          {
            term: "ASC X12",
            definition:
              "The bread-and-butter data format — if you deal with healthcare billing, you've had nightmares parsing an X12 EDI file.",
          },
          {
            term: "X.509",
            definition:
              "The foundational standard for public-key certificates — what keeps PHI locked down across connected devices and SaMD.",
          },
          {
            term: "χ² (Chi-Square)",
            definition:
              "Spelled “Chi,” written as X-squared — the stats test for comparing categorical variables in clinical data.",
          },
          {
            term: "X-23",
            definition:
              "Laura Kinney — the mutant clone and adopted daughter of Wolverine (X-Men comics, the movie Logan).",
          },
          {
            term: "X Æ A-12",
            definition:
              "Elon Musk and Grimes' famously unpronounceable kid — broke a few birth-certificate databases with its special characters.",
          },
          {
            term: "BMW X7",
            definition: "BMW's flagship full-size luxury SUV.",
          },
          {
            term: "XGBoost",
            definition:
              "The gradient-boosting library quietly powering a huge share of clinical risk-prediction and tabular-ML models.",
          },
          {
            term: "XML",
            definition:
              "The markup behind HL7 CDA / C-CDA clinical documents — the verbose ancestor before everyone moved to FHIR + JSON.",
          },
        ],
      },
    ],
  },

  // Photo round — images ripped from the "Trick or Treatment" deck (/oop/tot/).
  {
    number: 8,
    title: "Phase 8: Famous Healthcare Peeps",
    subtitle: "the real who's who?",
    questions: [
      {
        number: 1,
        text: "Who's this?",
        points: 1,
        answer: "Henrietta Lacks",
        questionImageSrc: "/oop/tot/peep-lacks.png",
        revealImageSrc: "/oop/tot/peep-lacks.png",
        revealCaption: "Her cervical-cancer cells (HeLa), taken without consent in 1951, became the first immortal human cell line.",
      },
      {
        number: 2,
        text: "Who's this?",
        points: 1,
        answer: "Florence Nightingale",
        questionImageSrc: "/oop/tot/peep-nightingale.png",
        revealImageSrc: "/oop/tot/peep-nightingale.png",
        revealCaption: "Founder of modern nursing; revolutionized hospital hygiene and care.",
      },
      {
        number: 3,
        text: "Who's this?",
        points: 1,
        answer: "Atul Gawande",
        questionImageSrc: "/oop/tot/peep-gawande.png",
        revealImageSrc: "/oop/tot/peep-gawande.png",
        revealCaption: "Surgeon, public-health researcher, and author of The Checklist Manifesto.",
      },
      {
        number: 4,
        text: "Who's this?",
        points: 1,
        answer: "Dr. Doug Ross (George Clooney on ER)",
        questionImageSrc: "/oop/tot/peep-dougross.png",
        revealImageSrc: "/oop/tot/peep-dougross.png",
        revealCaption: "Trick question — George Clooney's character on the TV series ER.",
      },
      {
        number: 5,
        text: "Who's this?",
        points: 1,
        answer: "Alexander Fleming",
        questionImageSrc: "/oop/tot/peep-fleming.png",
        revealImageSrc: "/oop/tot/peep-fleming.png",
        revealCaption: "Discovered the mold Penicillium rubens — later made into penicillin.",
      },
    ],
  },
  {
    number: 9,
    title: "Phase 9: Reverse Spelling Bee",
    subtitle: "you know you know these",
    questions: [
      { number: 1, text: "HIPAA", points: 1, answer: "Health Insurance Portability and Accountability Act" },
      { number: 2, text: "HEDIS", points: 1, answer: "Healthcare Effectiveness Data and Information Set" },
      { number: 3, text: "FHIR", points: 1, answer: "Fast Healthcare Interoperability Resources" },
      { number: 4, text: "FQHC", points: 1, answer: "Federally Qualified Health Center" },
      { number: 5, text: "HCC", points: 1, answer: "Hierarchical Condition Category" },
      { number: 6, text: "CMS", points: 1, answer: "Centers for Medicare & Medicaid Services (trickyyyy)" },
      { number: 7, text: "LTSS", points: 1, answer: "Long-Term Services and Supports" },
    ],
  },
  // Photo round — zoomed crops ripped from the "Trick or Treatment" deck.
  {
    number: 10,
    title: "Phase 10: Guess the Zoomed-in Thing",
    subtitle: "too close for comfort",
    questions: [
      {
        number: 1,
        text: "Guess the thing",
        points: 1,
        answer: "Ear otoscope cover",
        questionImageSrc: "/oop/tot/zoom-1.png",
        revealImageSrc: "/oop/tot/zoom-otoscope-full.png",
      },
      {
        number: 2,
        text: "Guess the thing",
        points: 1,
        answer: "Butterfly wound-closure strip (Steri-Strip)",
        questionImageSrc: "/oop/tot/zoom-2.png",
        revealImageSrc: "/oop/tot/zoom-s71.jpg",
      },
      {
        number: 3,
        text: "Guess the thing",
        points: 1,
        answer: "Sphygmomanometer (manual BP gauge)",
        questionImageSrc: "/oop/tot/zoom-3.png",
        revealImageSrc: "/oop/tot/zoom-3.png",
      },
      {
        number: 4,
        text: "Guess the thing",
        points: 1,
        answer: "Nasal cannula",
        questionImageSrc: "/oop/tot/zoom-4.png",
        revealImageSrc: "/oop/tot/zoom-4.png",
      },
      {
        number: 5,
        text: "Guess the thing",
        points: 1,
        answer: "ECG (electrocardiogram) pads",
        questionImageSrc: "/oop/tot/zoom-5.png",
        revealImageSrc: "/oop/tot/zoom-5.png",
      },
      {
        number: 6,
        text: "Guess the thing",
        points: 1,
        answer: "Glucose test strip",
        questionImageSrc: "/oop/tot/zoom-6.png",
        revealImageSrc: "/oop/tot/zoom-6.png",
      },
      {
        number: 7,
        text: "Guess the thing",
        points: 1,
        answer: "Eye exam — autorefractor (“focus on the balloon!”)",
        questionImageSrc: "/oop/tot/zoom-7.png",
        revealImageSrc: "/oop/tot/zoom-autorefractor-full.png",
      },
      {
        number: 8,
        text: "Guess the thing (very zoomed in)",
        points: 1,
        answer: "Tongue depressor (under an electron microscope, muhaha)",
        questionImageSrc: "/oop/tot/zoom-8.png",
        revealImageSrc: "/oop/tot/zoom-8.png",
      },
    ],
  },
  {
    number: 11,
    title: "Phase 11: Prior-Auth Denials",
    subtitle: "name the Halloween character from the denial",
    questions: [
      {
        number: 1,
        text: "“Request for therapeutic phlebotomy denied. Patient's hemoglobin consistently measures 0.0 g/dL — no medical necessity for blood products. Patient has not attempted UV-light therapy as first-line treatment for photosensitivity disorder.”",
        points: 1,
        answer: "Vampire",
      },
      {
        number: 2,
        text: "“Coverage denied. Request for extensive gauze-wrapping therapy exceeds medical necessity. Recommend topical moisturizers. Patient has not failed step therapy with ACE bandages (CVS brand, 4-inch) per formulary.”",
        points: 1,
        answer: "Mummy",
      },
      {
        number: 3,
        text: "“Experimental reanimation supplies NOT APPROVED. Provider lacks board certification in necromantic medicine. Electrical stimulation exceeds voltage in policy bulletin 2024-387B; submit 3 double-blind studies showing superiority over CPR.”",
        points: 1,
        answer: "Dr. Frankenstein",
      },
      {
        number: 4,
        text: "“Aviation-assisted mobility device NOT APPROVED — does not meet FDA criteria for durable medical equipment. Patient's skin condition appears self-induced via alternative medicine; compounding pharmacy is out-of-network.”",
        points: 1,
        answer: "Witch (the broomstick)",
      },
      {
        number: 5,
        text: "“Prior auth denied for monthly prophylactic silver-nitrate infusions. Episodic lycanthropic symptoms 12–13×/year don't meet criteria for continuous treatment. Try a 6-month behavioral-modification trial; consider outpatient restraints (HCPCS E0710).”",
        points: 1,
        answer: "Werewolf",
      },
    ],
  },
  {
    number: 12,
    title: "Phase 12: Monster or Med?",
    subtitle: "horror villain, or prescription?",
    questions: [
      { number: 1, text: "Biollante (bye-oh-LAN-tay)", points: 1, answer: "Monster — Godzilla's plant/rose kaiju", bullets: ["Monster", "Med"] },
      { number: 2, text: "Krazati (krah-ZAH-tee)", points: 1, answer: "Med — adagrasib, a KRAS-G12C lung-cancer drug", bullets: ["Monster", "Med"] },
      { number: 3, text: "Vecna (VEK-nah)", points: 1, answer: "Monster — D&D lich / Stranger Things villain", bullets: ["Monster", "Med"] },
      { number: 4, text: "Cenobite (SEH-noh-byte)", points: 1, answer: "Monster — the Hellraiser creatures", bullets: ["Monster", "Med"] },
      { number: 5, text: "Orgovyx (OR-go-viks)", points: 1, answer: "Med — relugolix, for advanced prostate cancer", bullets: ["Monster", "Med"] },
      { number: 6, text: "Krystexxa (KRIS-tek-sə)", points: 1, answer: "Med — pegloticase, for chronic gout", bullets: ["Monster", "Med"] },
    ],
  },
  // Photo round — "A" crops + full logos ripped from the "Trick or Treatment" deck.
  {
    number: 13,
    title: "Phase 13: Name the A",
    subtitle: "it's gonna B A — name the company from its logo",
    questions: [
      { number: 1, text: "Name that A", points: 1, answer: "Abridge", questionImageSrc: "/oop/tot/a-abridge-crop.png", revealImageSrc: "/oop/tot/a-abridge-full.png" },
      { number: 2, text: "Name that A", points: 1, answer: "Ascension", questionImageSrc: "/oop/tot/a-ascension-crop.png", revealImageSrc: "/oop/tot/a-ascension-full.png" },
      { number: 3, text: "Name that A", points: 1, answer: "Accolade", questionImageSrc: "/oop/tot/a-accolade-crop.png", revealImageSrc: "/oop/tot/a-accolade-full.png" },
      { number: 4, text: "Name that A", points: 1, answer: "AbbVie", questionImageSrc: "/oop/tot/a-abbvie-crop.png", revealImageSrc: "/oop/tot/a-abbvie-full.png" },
      { number: 5, text: "Name that A", points: 1, answer: "Aledade", questionImageSrc: "/oop/tot/a-aledade-crop.png", revealImageSrc: "/oop/tot/a-aledade-full.png" },
      { number: 6, text: "Name that A", points: 1, answer: "Abbott", questionImageSrc: "/oop/tot/a-abbott-crop.png", revealImageSrc: "/oop/tot/a-abbott-full.png" },
      { number: 7, text: "Name that A", points: 1, answer: "AstraZeneca", questionImageSrc: "/oop/tot/a-astrazeneca-crop.png", revealImageSrc: "/oop/tot/a-astrazeneca-full.png" },
      { number: 8, text: "Name that A", points: 1, answer: "Anthem", questionImageSrc: "/oop/tot/a-anthem-crop.png", revealImageSrc: "/oop/tot/a-anthem-full.png" },
    ],
  },
];

/** Backwards-compatible alias for the baked-in deck. */
export const sections = DEFAULT_SECTIONS;

export function buildDeck(deckSections: DeckSection[] = DEFAULT_SECTIONS): Slide[] {
  const slides: Slide[] = [];
  slides.push({
    type: "cover",
    title: "SQL trivia",
    subtitle: "LIMIT 100 questions",
    date: "Out of Pocket · Data Camp · June 2026",
  });

  // Each phase is self-contained: cyan section divider → questions for that
  // phase → pink "Phase N · Answers" divider → for each question a Q-alone
  // slide and a Q+answer reveal slide. This is the live-trivia pacing:
  // read out the round, collect answers, then reveal that round's answers
  // before moving on to the next phase. Phases with no questions (Section 0
  // / team intro) emit just the section divider.
  for (const section of deckSections) {
    if (section.enabled === false) continue; // optional round toggled off
    slides.push({
      type: "section",
      sectionNumber: section.number,
      sectionTitle: section.title,
      subtitle: section.subtitle,
      body: section.body,
    });

    // Only included questions present (and get a reveal). A round whose
    // questions are all benched emits just its divider, like the team intro.
    const activeQuestions = section.questions.filter((q) => q.enabled !== false);
    if (activeQuestions.length === 0) continue;

    for (const q of activeQuestions) {
      slides.push({
        type: "question",
        number: q.number,
        text: q.text,
        points: q.points,
        bullets: q.bullets,
        matchPairs: q.matchPairs,
        codeBlock: q.codeBlock,
        imageSrc: q.questionImageSrc,
        imageSrc2: q.questionImageSrc2,
        caption: q.questionCaption,
        sourceUrl: q.questionSourceUrl,
        sourceLabel: q.sourceLabel,
      });
    }

    slides.push({
      type: "answers-divider",
      title: `PHASE ${section.number} · ANSWERS`,
      date: "Data Camp · June 2026",
    });

    for (const q of activeQuestions) {
      slides.push({
        type: "question",
        number: q.number,
        text: q.text,
        points: q.points,
        bullets: q.bullets,
        matchPairs: q.matchPairs,
        codeBlock: q.codeBlock,
        imageSrc: q.questionImageSrc,
        imageSrc2: q.questionImageSrc2,
        caption: q.questionCaption,
        sourceUrl: q.questionSourceUrl,
        sourceLabel: q.sourceLabel,
      });
      slides.push({
        type: "reveal",
        number: q.number,
        text: q.text,
        points: q.points,
        answer: q.answer,
        bullets: q.revealBullets,
        matchPairs: q.matchPairs,
        codeBlock: q.codeBlock,
        imageSrc: q.revealImageSrc,
        imageSrc2: q.revealImageSrc2,
        caption: q.revealCaption,
        sourceUrl: q.revealSourceUrl,
        sourceLabel: q.sourceLabel,
      });
    }
  }

  return slides;
}

export const DECK_TITLE = "Out of Pocket · Data Camp · June 2026";
