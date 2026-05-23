"use client";

import type { Slide } from "@/lib/types";
import { getBrand } from "@/lib/branding";

/**
 * Slide color rhythm (Pyaar Project brand):
 *
 *   ALL slides sit on Kasavu cream (#E8DFC8) — no jarring bg flips.
 *   The differentiator between question and answer is the answer's
 *   Madder banner: a horizontal Madder-red block that spans the slide
 *   with the answer rendered in cream/white display text on top. Same
 *   warm world, but the answer literally "stamps" itself in.
 *
 *   Presenting slides:
 *     bg     : Kasavu cream (#E8DFC8)
 *     text   : Charcoal (#3D3D3A)
 *     accent : Madder red (#8B3530) for numbers, badges, dividers
 *     Includes: title, round-title, internet-question, questions-overview,
 *               question, progressive-clue, tie-breaker-question
 *
 *   Reveal slides:
 *     bg     : Kasavu cream (#E8DFC8)
 *     re-shown question : Charcoal (#3D3D3A) / 70
 *     answer banner     : full-width Madder red (#8B3530)
 *     answer text       : Kasavu cream (#E8DFC8) display
 *     Includes: answer, progressive-answer, video-answers, tie-breaker-answer
 */

interface SlideRendererProps {
  slide: Slide;
}

export function SlideRenderer({ slide }: SlideRendererProps) {
  switch (slide.type) {
    case "title":
      return <TitleSlide slide={slide} />;
    case "round-title":
      return <RoundTitleSlide slide={slide} />;
    case "internet-question":
      return <InternetQuestionSlide slide={slide} />;
    case "questions-overview":
      return <QuestionsOverviewSlide slide={slide} />;
    case "question":
      return <QuestionSlide slide={slide} />;
    case "answer":
      return <AnswerSlide slide={slide} />;
    case "progressive-clue":
      return <ProgressiveClueSlide slide={slide} />;
    case "progressive-answer":
      return <ProgressiveAnswerSlide slide={slide} />;
    case "video-answers":
      return <VideoAnswersSlide slide={slide} />;
    case "tie-breaker-question":
      return <TieBreakerQuestionSlide slide={slide} />;
    case "tie-breaker-answer":
      return <TieBreakerAnswerSlide slide={slide} />;
    default:
      return <div className="text-[#3D3D3A]">Unknown slide type</div>;
  }
}

// ═════════════════════════════════════════════════════════════════
// LIGHT — "presenting" slides
// ═════════════════════════════════════════════════════════════════

function TitleSlide({ slide }: { slide: Slide }) {
  const quiz = slide.quiz!;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-[#E8DFC8]">
      <p className="text-2xl font-bold uppercase tracking-[0.3em] text-[#3D3D3A]/60">
        {getBrand().name}
      </p>
      <h1 className="text-4xl sm:text-6xl lg:text-8xl font-display font-black uppercase text-[#8B3530]">
        {getBrand().quizLabel} #{quiz.quiz_number}
      </h1>
      <p className="text-3xl font-medium text-[#3D3D3A]/80">{quiz.date}</p>
      <div className="mt-4 w-16 border-t-2 border-[#8B3530]" />
      <div className="mt-3 space-y-2">
        {quiz.rounds.map((r) => (
          <p key={r.number} className="text-center text-lg sm:text-2xl text-[#3D3D3A]">
            <span className="mr-2 font-bold text-[#8B3530]">{r.number}.</span>
            {r.title}
            {r.joker_eligible && (
              <span className="ml-2 text-base font-bold uppercase tracking-wider text-[#8B3530]/70">
                JOKER
              </span>
            )}
          </p>
        ))}
      </div>
    </div>
  );
}

function RoundTitleSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;
  const ptsText =
    round.round_type === "progressive"
      ? "10 / 8 / 6 / 4 / 2 Points"
      : `${round.points_per_question} Point${round.points_per_question > 1 ? "s" : ""} Per Correct Answer`;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#E8DFC8]">
      <p className="text-2xl font-bold uppercase tracking-[0.4em] text-[#8B3530]/70">
        Round {round.number}
      </p>
      <h2 className="max-w-4xl text-center text-3xl sm:text-5xl lg:text-7xl font-display font-black uppercase text-[#3D3D3A]">
        {round.title}
      </h2>
      <div className="mt-2 w-24 border-t-2 border-[#8B3530]" />
      <p className="mt-4 text-2xl text-[#3D3D3A]/70">{ptsText}</p>
      <p
        className={`text-xl font-bold uppercase tracking-wider ${
          round.joker_eligible ? "text-[#8B3530]" : "text-[#C26B3E]"
        }`}
      >
        {round.joker_eligible ? "Joker Is IN PLAY" : "Joker Is NOT In Play"}
      </p>
      {slide.isLastRound && (
        <div className="mt-6 rounded-lg border-2 border-[#8B3530] bg-[#8B3530]/10 px-6 py-3">
          <p className="text-xl font-display font-black uppercase tracking-wider text-[#8B3530]">
            Final Round — Points Are Doubled For Everyone
          </p>
        </div>
      )}
      {round.theme_description && (
        <p className="mt-6 max-w-3xl text-center text-xl italic text-[#3D3D3A]/60">
          {round.theme_description}
        </p>
      )}
    </div>
  );
}

function InternetQuestionSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#E8DFC8] px-4 sm:px-8 lg:px-12">
      <p className="mb-4 text-lg font-medium uppercase tracking-[0.2em] text-[#3D3D3A]/60">
        Round {round.number} &mdash; {round.title}
      </p>
      <div className="mb-6 flex h-16 w-16 sm:h-28 sm:w-28 items-center justify-center rounded-full border-4 border-[#8B3530]">
        <span className="text-6xl font-display font-black text-[#8B3530]">1</span>
      </div>
      <p className="mb-3 text-3xl font-bold uppercase tracking-wider text-[#8B3530]">
        Internet-Only Question
      </p>
      <p className="mb-8 max-w-2xl text-center text-2xl text-[#3D3D3A]/70">
        Find this week&apos;s question and answer at
      </p>
      <p className="mb-8 text-4xl font-display font-black text-[#3D3D3A]">
        {getBrand().website}
      </p>
      <div className="flex items-center gap-3 rounded-full border border-[#3D3D3A]/30 bg-[#3D3D3A]/5 px-6 py-3">
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-[#E1306C]" aria-label={getBrand().socialPlatform}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
        <span className="text-2xl font-bold text-[#3D3D3A]">@{getBrand().socialHandle}</span>
      </div>
    </div>
  );
}

function QuestionsOverviewSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;
  return (
    <div className="flex h-full flex-col bg-[#E8DFC8] p-10 pt-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#8B3530]/40" />
        <p className="text-lg font-bold uppercase tracking-[0.3em] text-[#8B3530]">
          Round {round.number} &mdash; {round.title}
        </p>
        <div className="h-px flex-1 bg-[#8B3530]/40" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3">
        {round.questions.map((q) => (
          <div key={q.number}>
            {q.is_internet_only ? (
              <p className="text-xl leading-snug italic text-[#3D3D3A]/50">
                <span className="mr-2 inline-block w-9 text-right font-bold text-[#8B3530]/40">
                  {q.number}.
                </span>
                Internet-Only Question &mdash; {getBrand().website}
              </p>
            ) : (
              <>
                <p className="text-xl leading-snug text-[#3D3D3A]">
                  <span className="mr-2 inline-block w-9 text-right font-bold text-[#8B3530]">
                    {q.number}.
                  </span>
                  {q.text}
                </p>
                {q.choices.length > 0 && (
                  <p className="ml-11 text-base text-[#3D3D3A]/60">
                    {q.choices
                      .map((c) =>
                        c
                          .replace(/✅/g, "")
                          .replace(/\(Correct\)/gi, "")
                          .trim()
                      )
                      .join("   |   ")}
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;
  const q = slide.question!;
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#E8DFC8] px-4 sm:px-8 lg:px-12">
      <p className="mb-4 text-lg font-medium uppercase tracking-[0.2em] text-[#3D3D3A]/60">
        Round {round.number} &mdash; {round.title}
      </p>
      <div className="mb-6 flex h-16 w-16 sm:h-28 sm:w-28 items-center justify-center rounded-full border-4 border-[#8B3530]">
        <span className="text-6xl font-display font-black text-[#8B3530]">{q.number}</span>
      </div>
      <p className="max-w-4xl text-center text-xl sm:text-3xl lg:text-4xl font-medium leading-relaxed text-[#3D3D3A]">
        {q.text}
      </p>
      {q.choices.length > 0 && (
        <div className="mt-4 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-x-12 sm:gap-y-4">
          {q.choices.map((c, i) => (
            <p
              key={i}
              className="rounded-lg border border-[#3D3D3A]/20 bg-[#3D3D3A]/5 px-4 py-2.5 sm:px-6 sm:py-4 text-lg sm:text-2xl text-[#3D3D3A]"
            >
              {c
                .replace(/✅/g, "")
                .replace(/\(Correct\)/gi, "")
                .trim()}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressiveClueSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;
  const currentIdx = slide.clueIndex!;
  const currentClue = round.clues[currentIdx];

  return (
    <div className="flex h-full flex-col bg-[#E8DFC8] p-10">
      <p className="mb-2 text-lg font-medium uppercase tracking-[0.2em] text-[#3D3D3A]/60">
        Round {round.number} &mdash; {round.title}
      </p>
      <div className="mb-8 flex items-center justify-center">
        <div className="rounded-full border-2 border-[#8B3530] bg-[#8B3530]/10 px-8 py-3">
          <span className="text-4xl font-display font-black text-[#8B3530]">
            {currentClue.points} POINTS
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-5">
        {round.clues.slice(0, currentIdx + 1).map((clue, i) => (
          <div
            key={i}
            className={`rounded-lg border-l-4 px-6 py-5 ${
              i === currentIdx
                ? "border-[#8B3530] bg-[#8B3530]/10"
                : "border-[#3D3D3A]/20 bg-transparent"
            }`}
          >
            <span
              className={`mr-3 text-base font-bold ${
                i === currentIdx ? "text-[#8B3530]" : "text-[#3D3D3A]/40"
              }`}
            >
              {clue.points}pts
            </span>
            <span
              className={`text-2xl ${
                i === currentIdx
                  ? "font-semibold text-[#3D3D3A]"
                  : "text-[#3D3D3A]/50"
              }`}
            >
              {clue.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TieBreakerQuestionSlide({ slide }: { slide: Slide }) {
  const quiz = slide.quiz!;
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#E8DFC8] p-4 sm:p-8 lg:p-12">
      <div className="mb-8 rounded-lg border-2 border-[#8B3530] bg-[#8B3530]/10 px-10 py-4">
        <span className="text-4xl font-display font-black uppercase tracking-wider text-[#8B3530]">
          Tie Breaker
        </span>
      </div>
      <p className="max-w-4xl text-center text-xl sm:text-3xl lg:text-4xl font-medium leading-relaxed text-[#3D3D3A]">
        {quiz.tie_breaker_question}
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// DARK — "reveal" slides (answer drops here)
// ═════════════════════════════════════════════════════════════════

function AnswerSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;
  const q = slide.question!;
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#E8DFC8] px-0">
      <div className="flex flex-col items-center px-4 sm:px-8 lg:px-12">
        <p className="mb-3 text-lg font-medium uppercase tracking-[0.2em] text-[#3D3D3A]/60">
          Round {round.number} &mdash; {round.title}
        </p>
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-3 border-[#8B3530]/50">
          <span className="text-4xl font-display font-black text-[#8B3530]/70">{q.number}</span>
        </div>
        <p className="max-w-4xl text-center text-2xl sm:text-3xl text-[#3D3D3A]/75">{q.text}</p>
      </div>
      {/* Madder answer banner — full-width "stamp" */}
      <div className="mt-8 w-full bg-[#8B3530] px-4 sm:px-8 lg:px-12 py-8 sm:py-12">
        <p className="max-w-5xl mx-auto text-center text-3xl sm:text-5xl lg:text-6xl font-display font-black text-[#E8DFC8]">
          {q.answer}
        </p>
      </div>
    </div>
  );
}

function ProgressiveAnswerSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#E8DFC8]">
      <div className="flex flex-col items-center">
        <p className="mb-2 text-lg font-medium uppercase tracking-[0.2em] text-[#3D3D3A]/60">
          Round {round.number} &mdash; {round.title}
        </p>
        <p className="mb-8 text-2xl font-bold uppercase tracking-wider text-[#3D3D3A]/70">
          The Answer Is...
        </p>
      </div>
      <div className="mt-2 w-full bg-[#8B3530] px-4 sm:px-8 lg:px-12 py-10 sm:py-14">
        <p className="max-w-5xl mx-auto text-center text-3xl sm:text-5xl lg:text-7xl font-display font-black text-[#E8DFC8]">
          {round.progressive_answer}
        </p>
      </div>
    </div>
  );
}

function VideoAnswersSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;
  return (
    <div className="flex h-full flex-col bg-[#E8DFC8]">
      {/* Madder header banner */}
      <div className="bg-[#8B3530] px-10 py-5">
        <p className="text-lg font-bold uppercase tracking-[0.3em] text-[#E8DFC8] text-center">
          Round {round.number} &mdash; {round.title} &mdash; Answers
        </p>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4 p-10">
        {round.questions.map((q) => (
          <p key={q.number} className="text-lg sm:text-2xl lg:text-3xl font-semibold text-[#3D3D3A]">
            <span className="mr-3 inline-block w-10 text-right font-bold text-[#8B3530]">
              {q.number}.
            </span>
            {q.answer || q.text}
          </p>
        ))}
      </div>
    </div>
  );
}

function TieBreakerAnswerSlide({ slide }: { slide: Slide }) {
  const quiz = slide.quiz!;
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#E8DFC8]">
      <div className="flex flex-col items-center px-4 sm:px-8 lg:px-12">
        <div className="mb-6 rounded-lg border-2 border-[#8B3530]/40 px-10 py-3">
          <span className="text-2xl font-display font-black uppercase tracking-wider text-[#8B3530]/70">
            Tie Breaker
          </span>
        </div>
        <p className="max-w-4xl text-center text-2xl sm:text-3xl text-[#3D3D3A]/75">
          {quiz.tie_breaker_question}
        </p>
      </div>
      <div className="mt-8 w-full bg-[#8B3530] px-4 sm:px-8 lg:px-12 py-8 sm:py-12">
        <p className="max-w-5xl mx-auto text-center text-3xl sm:text-5xl lg:text-6xl font-display font-black text-[#E8DFC8]">
          {quiz.tie_breaker_answer}
        </p>
      </div>
    </div>
  );
}
