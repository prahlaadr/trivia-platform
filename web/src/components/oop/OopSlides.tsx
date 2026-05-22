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

const ASPECT = "aspect-[16/9] [container-type:inline-size]";

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
}: {
  sectionNumber: number;
  sectionTitle: string;
  subtitle?: string;
}) {
  return (
    <div className={`relative ${ASPECT} w-full overflow-hidden bg-white`}>
      <img
        src="/oop/template-section-cyan.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0">
        {/* SECTION N label sits inside the tabbed-folder tab */}
        <p className="absolute left-[15%] top-[22%] text-[1.4cqw] font-extrabold tracking-[0.3em] text-[var(--oop-cyan)]">
          SECTION {sectionNumber}
        </p>
        {/* Title sits in the white body of the folder card */}
        <h2 className="absolute left-[10%] top-[50%] max-w-[80%] text-[4.5cqw] font-extrabold leading-tight text-black">
          {sectionTitle}
        </h2>
        {subtitle && (
          <p className="absolute left-[10%] top-[68%] text-[1.8cqw] text-black/60">
            {subtitle}
          </p>
        )}
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
  codeBlock,
}: {
  number: number;
  text: string;
  points: number;
  bullets?: string[];
  codeBlock?: string;
}) {
  return (
    <div className={`relative ${ASPECT} w-full overflow-hidden bg-white`}>
      <img
        src="/oop/template-question.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-x-[12%] top-[16%] bottom-[16%] flex flex-col items-center justify-center text-center">
        <p className="text-[2.6cqw] font-extrabold leading-snug text-black">
          {number}. {text}{" "}
          <span className="font-bold text-black/60">
            ({points} pt{points === 1 ? "" : "s"})
          </span>
        </p>
        {codeBlock && (
          <pre className="mt-[2%] inline-block overflow-x-auto rounded border-2 border-black bg-[var(--oop-navy)] p-[1.8%] text-left font-mono text-[1.9cqw] leading-snug text-[var(--oop-cyan)]">
            <code>{codeBlock}</code>
          </pre>
        )}
        {bullets && bullets.length > 0 && (
          <ul className="mt-[2.5%] inline-block space-y-[0.8%] text-left text-[2.1cqw] font-bold text-black">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-baseline gap-3">
                <span aria-hidden className="text-[1cqw]">●</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
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
  codeBlock,
}: {
  number: number;
  text: string;
  points: number;
  answer: string;
  bullets?: { text: string; correct?: boolean }[];
  imageSrc?: string;
  caption?: string;
  codeBlock?: string;
}) {
  return (
    <div className={`relative ${ASPECT} w-full overflow-hidden bg-white`}>
      <img
        src="/oop/template-question.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-x-[12%] top-[14%] bottom-[14%] flex flex-col items-center justify-center text-center">
        <p className="text-[2.1cqw] font-extrabold leading-snug text-black">
          {number}. {text}{" "}
          <span className="font-bold text-black/60">
            ({points} pt{points === 1 ? "" : "s"})
          </span>
        </p>
        {codeBlock && (
          <pre className="mt-[1.6%] inline-block overflow-x-auto rounded border-2 border-black bg-[var(--oop-navy)] p-[1.4%] text-left font-mono text-[1.6cqw] leading-snug text-[var(--oop-cyan)]">
            <code>{codeBlock}</code>
          </pre>
        )}
        {bullets && bullets.length > 0 && (
          <ul className="mt-[1.8%] inline-block space-y-[0.6%] text-left text-[1.8cqw] font-bold text-black">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-baseline gap-3">
                <span aria-hidden className="text-[1cqw]">●</span>
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
          <div className="mt-[2.5%] flex w-full flex-col items-center gap-[2%]">
            <p className="text-[2.6cqw] font-extrabold text-black">{answer}</p>
            {imageSrc && (
              <div className="max-w-[40%]">
                <img src={imageSrc} alt="" className="h-auto w-full" />
                {caption && (
                  <p className="mt-1 text-[1cqw] text-black/60">{caption}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
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
