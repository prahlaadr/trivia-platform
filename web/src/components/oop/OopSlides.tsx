/* Out of Pocket slide templates — faithful recreations of the Sep 2025 deck.
 * Each component is sized at a 16:9 aspect ratio; in the presenter they fill
 * the viewport, in the showcase they render at scale.
 *
 * Octopus mascot + OOP wordmark are placeholders — drop SVGs into
 * public/oop/ and the components will pick them up.
 */

const ASPECT = "aspect-[16/9]";

function OopWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-extrabold tracking-tight ${className}`}
    >
      <span aria-hidden className="text-[1.2em] leading-none">⚕</span>
      <span>OUT-OF-POCKET</span>
    </span>
  );
}

function OpenQuote({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M14 36c0-12 6-18 14-22l4 6c-6 3-10 7-10 14h6v14H14V36zm22 0c0-12 6-18 14-22l4 6c-6 3-10 7-10 14h6v14H36V36z"
        fill="white"
        stroke="black"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseQuote({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M50 28c0 12-6 18-14 22l-4-6c6-3 10-7 10-14h-6V16h14v12zm-22 0c0 12-6 18-14 22l-4-6c6-3 10-7 10-14H14V16h14v12z"
        fill="white"
        stroke="black"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
    <div
      className={`relative ${ASPECT} w-full overflow-hidden bg-[var(--oop-pink)]`}
    >
      {/* white interior with black border */}
      <div className="absolute inset-3 rounded-md border-4 border-black bg-white">
        <div className="flex h-full flex-col px-12 py-10">
          {date && (
            <p className="self-end text-sm font-bold tracking-widest text-black/40">
              {date}
            </p>
          )}
          <OopWordmark className="mt-1 text-lg" />
          <h1 className="mt-10 text-7xl font-extrabold leading-none">{title}</h1>
          {subtitle && <p className="mt-6 text-2xl">{subtitle}</p>}
          <div className="mt-auto h-1 w-3/4 bg-black" />
        </div>
        {/* octopus mascot placeholder */}
        <div
          aria-hidden
          className="absolute -right-6 top-12 h-44 w-44 select-none text-[10rem] leading-none text-[var(--oop-pink)]"
        >
          🐙
        </div>
      </div>
    </div>
  );
}

// ── Section divider ────────────────────────────────────────────────

export function OopSectionSlide({
  sectionNumber,
  sectionTitle,
  subtitle,
}: {
  sectionNumber: number;
  sectionTitle: string;
  subtitle?: string;
}) {
  return (
    <div className={`relative ${ASPECT} w-full overflow-hidden bg-[var(--oop-cyan)]`}>
      {/* tabbed-folder card */}
      <div className="absolute inset-x-3 bottom-3 top-24">
        {/* the folder tab */}
        <div className="absolute -top-12 left-20 flex h-12 w-72 items-end">
          <div className="relative h-full w-full">
            <div
              className="absolute inset-0 rounded-t-xl border-4 border-b-0 border-black bg-white"
              style={{
                clipPath:
                  "polygon(0% 100%, 0% 30%, 12% 0%, 88% 0%, 100% 30%, 100% 100%)",
              }}
            />
            <p className="relative flex h-full items-center justify-center text-sm font-extrabold tracking-[0.3em] text-[var(--oop-cyan)]">
              SECTION {sectionNumber}
            </p>
          </div>
        </div>
        {/* main body */}
        <div className="h-full rounded-md border-4 border-black bg-white">
          <div className="flex h-full flex-col px-12 py-14">
            <h2 className="text-5xl font-extrabold">{sectionTitle}</h2>
            {subtitle && (
              <p className="mt-3 text-xl text-black/60">{subtitle}</p>
            )}
            <div className="mt-8 h-1 w-3/4 bg-black" />
            <div className="mt-auto self-end">
              <OopWordmark className="text-sm" />
            </div>
          </div>
        </div>
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
}: {
  number: number;
  text: string;
  points: number;
  bullets?: string[];
}) {
  return (
    <div className={`relative ${ASPECT} w-full overflow-hidden bg-[var(--oop-pink)]`}>
      <div className="absolute inset-8 rounded-md border-4 border-black bg-white">
        <OpenQuote className="absolute -left-6 -top-2 h-14 w-14" />
        <CloseQuote className="absolute -bottom-2 -right-6 h-14 w-14" />
        <div className="flex h-full flex-col px-14 py-10">
          <p className="text-3xl font-extrabold leading-snug">
            {number}. {text}{" "}
            <span className="font-bold text-black/60">({points} pt{points === 1 ? "" : "s"})</span>
          </p>
          {bullets && bullets.length > 0 && (
            <ul className="mt-6 space-y-2 text-2xl font-bold">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span aria-hidden className="text-base">●</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto self-end">
            <OopWordmark className="text-xs" />
          </div>
        </div>
      </div>
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
  imageSrc,
  caption,
}: {
  number: number;
  text: string;
  points: number;
  answer: string;
  bullets?: { text: string; correct?: boolean }[];
  imageSrc?: string;
  caption?: string;
}) {
  return (
    <div className={`relative ${ASPECT} w-full overflow-hidden bg-[var(--oop-pink)]`}>
      <div className="absolute inset-8 rounded-md border-4 border-black bg-white">
        <OpenQuote className="absolute -left-6 -top-2 h-14 w-14" />
        <CloseQuote className="absolute -bottom-2 -right-6 h-14 w-14" />
        <div className="flex h-full flex-col px-14 py-10">
          <p className="text-2xl font-extrabold leading-snug">
            {number}. {text}{" "}
            <span className="font-bold text-black/60">({points} pt{points === 1 ? "" : "s"})</span>
          </p>
          {bullets && bullets.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-xl font-bold">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span aria-hidden className="text-base">●</span>
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
          <div className="mt-6 flex flex-1 items-start gap-6">
            <p className="text-3xl font-extrabold">{answer}</p>
            {imageSrc && (
              <div className="ml-auto max-w-[40%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageSrc} alt="" className="h-auto w-full" />
                {caption && (
                  <p className="mt-1 text-xs text-black/60">{caption}</p>
                )}
              </div>
            )}
          </div>
          <div className="mt-auto self-end">
            <OopWordmark className="text-xs" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Answers divider ────────────────────────────────────────────────

export function OopAnswersDividerSlide({ date }: { date?: string }) {
  return <OopCoverSlide title="ANSWERS" date={date} />;
}
