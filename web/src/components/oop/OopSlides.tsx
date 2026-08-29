/* Out of Pocket slide templates.
 *
 * The Cover, Section divider, and Question/Reveal layouts use the *actual*
 * template PNGs extracted from the Sep 2025 OOP PPTX (1920×1080):
 *   - template-cover.png         : pink top + white card + octopus mascot
 *   - template-section-cyan.png  : cyan with tabbed-folder card
 *   - template-question.png      : pink + white card + corner quotes + OOP mark
 *
 * Content (titles, questions, code, answers) overlays the template via
 * absolute positioning. This gives 1:1 fidelity with OOP's deck.
 */

/* eslint-disable @next/next/no-img-element */

import { FitBox } from "./FitBox";

const ASPECT = "aspect-[16/9] [container-type:size]";

/**
 * Content safe area inside template-question.png's white card.
 *
 * The pink frame, the black card border, and the decorative corner quote marks
 * are all baked into the 1920×1080 PNG, so overlaid content must stay within the
 * card's interior. Measured from the PNG: card interior spans x 7.6–92.4%,
 * y 13.6–86.4%; the corner quotes intrude only to x≈10% (top-left, y 18–28%) and
 * x≈90% (bottom-right, y 72–82%). This box clears the border and both quotes with
 * margin — top is 15% so a top-anchored heading sits below the border line, not
 * on it.
 */
const CARD_SAFE = "absolute inset-x-[12%] top-[15%] bottom-[15%]";

// ── Cover ──────────────────────────────────────────────────────────

export function OopCoverSlide({
  title,
  subtitle,
  date,
}: {
  title: string;
  subtitle?: string;
  date?: string;
}) {
  return (
    <div className={`relative ${ASPECT} w-full overflow-hidden bg-white`}>
      <img
        src="/oop/template-cover.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0">
        {date && (
          <p className="absolute right-[6%] top-[6%] text-[1.4cqw] font-bold tracking-widest text-black/40">
            {date}
          </p>
        )}
        <img
          src="/oop/oop-wordmark.svg"
          alt="OUT-OF-POCKET"
          className="absolute left-[10%] top-[16%] h-[3cqw] w-auto"
        />
        <h1 className="absolute left-[10%] top-[34%] text-[7cqw] font-extrabold leading-none text-black">
          {title}
        </h1>
        {subtitle && (
          <p className="absolute left-[10%] top-[60%] text-[2.2cqw] text-black">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Section divider ────────────────────────────────────────────────

export function OopSectionSlide({
  sectionNumber,
  sectionTitle,
  subtitle,
  body,
}: {
  sectionNumber: number;
  sectionTitle: string;
  subtitle?: string;
  body?: string;
}) {
  return (
    <div className={`relative ${ASPECT} w-full overflow-hidden bg-white`}>
      <img
        src="/oop/template-section-cyan.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0">
        {/* SECTION N + tagline, flex-centered inside the white folder tab.
            The box matches the tab protrusion measured from
            template-section-cyan.png (1920×1080): the white lobe spans
            y 22.3%–34.4% and x 12%–43%. items-center + text-center keep the
            (possibly 2-line) header centered in the lobe, clear of the notch. */}
        <div className="absolute left-[12.1%] top-[22.3%] h-[12.1%] w-[31%] flex items-center justify-center text-center text-[1.5cqw] font-extrabold leading-[1.15] text-[var(--oop-cyan)]">
          <p>
            <span className="tracking-[0.22em]">SECTION {sectionNumber}</span>
            {subtitle ? ` ${subtitle}` : ""}
          </p>
        </div>
        {/* Content stacks vertically and stays clear of the baked-in black
            divider line near the bottom of the card. */}
        <div className="absolute inset-x-[10%] top-[44%] bottom-[15%] flex flex-col gap-[1.5cqh] overflow-hidden">
          <h2 className="text-[4cqw] font-extrabold leading-tight text-black">
            {sectionTitle}
          </h2>
          {body && (
            <p className="text-[1.5cqw] leading-snug text-black">{body}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Matching layout (shared by question + reveal) ──────────────────

type MatchPair = { term: string; definition: string };

/** Stable shuffle of definitions (sorted by text) so they don't line up with
 *  their terms and don't reshuffle on every render. */
function shuffledDefs(pairs: MatchPair[]) {
  return pairs
    .map((p, i) => ({ ...p, n: i + 1 }))
    .slice()
    .sort((a, b) => a.definition.localeCompare(b.definition));
}

function MatchHeading({ number, text, points }: { number: number; text: string; points: number }) {
  return (
    <p className="shrink-0 text-center text-[34px] font-extrabold leading-snug text-black">
      {number}. {text}{" "}
      <span className="font-bold text-black/60">({points} pt{points === 1 ? "" : "s"})</span>
    </p>
  );
}

// Question: both columns — numbered terms (left) + lettered, shuffled defs (right).
// The two-column block is authored at a fixed design width (defs wrap within it)
// and FitBox scales the whole group up to fill the card.
function OopMatchQuestion({ number, text, points, pairs }: { number: number; text: string; points: number; pairs: MatchPair[] }) {
  const defs = shuffledDefs(pairs);
  return (
    <div className={`relative ${ASPECT} w-full overflow-hidden bg-white`}>
      <img src="/oop/template-question.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className={CARD_SAFE}>
        <FitBox align="top" designWidth={1240} refitKey={`mq-${number}-${text}`}>
          <div className="flex w-full flex-col gap-[28px]">
            <MatchHeading number={number} text={text} points={points} />
            <div className="flex w-full gap-[48px]">
              <ul className="w-[30%] shrink-0 space-y-[18px] text-[30px] font-extrabold leading-tight text-black">
                {pairs.map((p, i) => (
                  <li key={i}>
                    <span className="text-[var(--oop-navy)]">{i + 1}.</span> {p.term}
                  </li>
                ))}
              </ul>
              <ul className="flex-1 space-y-[16px] text-[26px] leading-tight text-black">
                {defs.map((d, i) => (
                  <li key={i} className="flex gap-[10px]">
                    <span className="font-extrabold text-[var(--oop-navy)]">{String.fromCharCode(65 + i)}.</span>
                    <span>{d.definition}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </FitBox>
      </div>
    </div>
  );
}

// Reveal: each term beside its correct definition, in order.
function OopMatchReveal({ number, text, points, pairs }: { number: number; text: string; points: number; pairs: MatchPair[] }) {
  return (
    <div className={`relative ${ASPECT} w-full overflow-hidden bg-white`}>
      <img src="/oop/template-question.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className={CARD_SAFE}>
        <FitBox align="center" designWidth={1240} refitKey={`mr-${number}-${text}`}>
          <div className="flex w-full flex-col gap-[26px]">
            <MatchHeading number={number} text={text} points={points} />
            <ul className="flex w-full flex-col space-y-[16px] text-[27px] leading-tight text-black">
              {pairs.map((p, i) => (
                <li key={i} className="flex gap-[16px]">
                  <span className="w-[26%] shrink-0 font-extrabold text-[var(--oop-navy)]">
                    {i + 1}. {p.term}
                  </span>
                  <span className="flex-1">{p.definition}</span>
                </li>
              ))}
            </ul>
          </div>
        </FitBox>
      </div>
    </div>
  );
}

// ── Question ───────────────────────────────────────────────────────

export function OopQuestionSlide({
  number,
  text,
  points,
  bullets,
  matchPairs,
  codeBlock,
  imageSrc,
  imageSrc2,
  caption,
  sourceUrl,
  sourceLabel,
}: {
  number: number;
  text: string;
  points: number;
  bullets?: string[];
  matchPairs?: MatchPair[];
  codeBlock?: string;
  imageSrc?: string;
  imageSrc2?: string;
  caption?: string;
  sourceUrl?: string;
  sourceLabel?: string;
}) {
  if (matchPairs && matchPairs.length > 0) {
    return <OopMatchQuestion number={number} text={text} points={points} pairs={matchPairs} />;
  }
  return (
    <div className={`relative ${ASPECT} w-full overflow-hidden bg-white`}>
      <img
        src="/oop/template-question.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Heading pinned to the top, body grown to fill — the whole group is
          scaled by FitBox to use the full card (readable in large rooms). */}
      <div className={CARD_SAFE}>
        <FitBox align="top" designWidth={900} refitKey={`q-${number}-${text}`}>
          <div className="flex flex-col items-center gap-[22px] text-center">
            <p className="text-[40px] font-extrabold leading-snug text-black">
              {number}. {text}{" "}
              <span className="font-bold text-black/60">
                ({points} pt{points === 1 ? "" : "s"})
              </span>
            </p>
            {codeBlock && (
              <pre className="inline-block whitespace-pre rounded border-2 border-black bg-[var(--oop-navy)] px-6 py-5 text-left font-mono text-[34px] leading-snug text-[var(--oop-cyan)]">
                <code>{codeBlock}</code>
              </pre>
            )}
            {bullets && bullets.length > 0 && (
              <ul className="inline-block space-y-[12px] text-left text-[34px] font-bold text-black">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <span aria-hidden className="text-[18px]">●</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {(imageSrc || imageSrc2) && (
              <div className="flex items-center justify-center gap-[32px]">
                {imageSrc && (
                  <img src={imageSrc} alt="" className="h-[340px] w-auto max-w-[440px] object-contain" />
                )}
                {imageSrc2 && (
                  <img src={imageSrc2} alt="" className="h-[340px] w-auto max-w-[440px] object-contain" />
                )}
              </div>
            )}
            {caption && (
              <p className="text-[18px] text-black/60">{caption}</p>
            )}
          </div>
        </FitBox>
      </div>
      {/* Source link lives outside FitBox: its scale transform creates a
          stacking context that would trap the link's z-index below the
          presenter's tap-zone overlay, breaking click-through. Anchored as
          constant-size chrome so it stays clickable and legible. */}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-[4%] right-[5%] z-20 text-[1.2cqw] text-[var(--oop-navy)] underline decoration-2 underline-offset-2 hover:text-black"
        >
          {sourceLabel ?? "source"} ↗
        </a>
      )}
    </div>
  );
}

// ── Reveal (question + answer) ────────────────────────────────────

export function OopRevealSlide({
  number,
  text,
  points,
  answer,
  bullets,
  matchPairs,
  imageSrc,
  imageSrc2,
  caption,
  codeBlock,
  sourceUrl,
  sourceLabel,
}: {
  number: number;
  text: string;
  points: number;
  answer: string;
  bullets?: { text: string; correct?: boolean }[];
  matchPairs?: MatchPair[];
  imageSrc?: string;
  imageSrc2?: string;
  caption?: string;
  codeBlock?: string;
  sourceUrl?: string;
  sourceLabel?: string;
}) {
  if (matchPairs && matchPairs.length > 0) {
    return <OopMatchReveal number={number} text={text} points={points} pairs={matchPairs} />;
  }
  return (
    <div className={`relative ${ASPECT} w-full overflow-hidden bg-white`}>
      <img
        src="/oop/template-question.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Reveal holds more (question + answer + support), so the same FitBox
          naturally settles a touch smaller than the question — parity without
          separate tuning. */}
      <div className={CARD_SAFE}>
        <FitBox align="top" designWidth={900} refitKey={`r-${number}-${text}`}>
          <div className="flex flex-col items-center gap-[18px] text-center">
            <p className="text-[34px] font-extrabold leading-snug text-black">
              {number}. {text}{" "}
              <span className="font-bold text-black/60">
                ({points} pt{points === 1 ? "" : "s"})
              </span>
            </p>
            {codeBlock && (
              <pre className="inline-block whitespace-pre rounded border-2 border-black bg-[var(--oop-navy)] px-6 py-5 text-left font-mono text-[30px] leading-snug text-[var(--oop-cyan)]">
                <code>{codeBlock}</code>
              </pre>
            )}
            {bullets && bullets.length > 0 && (
              <ul className="inline-block space-y-[10px] text-left text-[30px] font-bold text-black">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <span aria-hidden className="text-[18px]">●</span>
                    <span>
                      {b.text}
                      {b.correct && (
                        <span className="ml-2 font-extrabold text-[var(--oop-cyan)]">
                          real!
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {answer && (
              <p className="text-[42px] font-extrabold text-black">{answer}</p>
            )}
            {(imageSrc || imageSrc2) && (
              <div className="flex items-center justify-center gap-[32px]">
                {imageSrc && (
                  <img src={imageSrc} alt="" className="h-[240px] w-auto max-w-[400px] object-contain" />
                )}
                {imageSrc2 && (
                  <img src={imageSrc2} alt="" className="h-[240px] w-auto max-w-[400px] object-contain" />
                )}
              </div>
            )}
            {caption && (
              <p className="text-[18px] text-black/60">{caption}</p>
            )}
          </div>
        </FitBox>
      </div>
      {/* See OopQuestionSlide: source link sits outside FitBox to stay
          clickable above the presenter's tap-zone overlay. */}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-[4%] right-[5%] z-20 text-[1.2cqw] text-[var(--oop-navy)] underline decoration-2 underline-offset-2 hover:text-black"
        >
          {sourceLabel ?? "source"} ↗
        </a>
      )}
    </div>
  );
}

// ── Answers divider ────────────────────────────────────────────────

export function OopAnswersDividerSlide({
  title = "ANSWERS",
  date,
}: {
  title?: string;
  date?: string;
}) {
  return <OopCoverSlide title={title} date={date} />;
}
