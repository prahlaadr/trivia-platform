"use client";

import type { Slide } from "@/lib/types";
import { brand } from "@/lib/branding";

/**
 * Color Palette — edit these hex values to rebrand.
 * Also update globals.css body background if changing primary bg.
 *
 * - Deep green:   #1B4D3E (primary bg)
 * - Dark green:   #143B2E (alt bg)
 * - Navy:         #0F1B2D (dark sections)
 * - Gold/Yellow:  #FFD700 (headings, accents)
 * - White:        #FFFFFF (body text)
 * - Light green:  #4EC9B0 (answers, success)
 * - Coral red:    #E84D5A (question numbers, alerts)
 * - Cream:        #F5E6C8 (subtle text)
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
      return <div className="text-white">Unknown slide type</div>;
  }
}

// ─── Title ───────────────────────────────────────────────

function TitleSlide({ slide }: { slide: Slide }) {
  const quiz = slide.quiz!;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-[#1B4D3E]">
      <p className="text-2xl font-bold uppercase tracking-[0.3em] text-[#F5E6C8]">
        {brand.name}
      </p>
      <h1 className="text-8xl font-black uppercase text-[#FFD700] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
        {brand.quizLabel} #{quiz.quiz_number}
      </h1>
      <p className="text-3xl font-medium text-white/80">{quiz.date}</p>
      <div className="mt-4 w-16 border-t-2 border-[#FFD700]" />
      <div className="mt-3 space-y-2">
        {quiz.rounds.map((r) => (
          <p key={r.number} className="text-center text-2xl text-white">
            <span className="mr-2 font-bold text-[#FFD700]">
              {r.number}.
            </span>
            {r.title}
            {r.joker_eligible && (
              <span className="ml-2 text-base text-[#4EC9B0]">JOKER</span>
            )}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Round Title ─────────────────────────────────────────

function RoundTitleSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;
  const ptsText =
    round.round_type === "progressive"
      ? "10 / 8 / 6 / 4 / 2 Points"
      : `${round.points_per_question} Point${round.points_per_question > 1 ? "s" : ""} Per Correct Answer`;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#143B2E]">
      <p className="text-2xl font-bold uppercase tracking-[0.4em] text-[#FFD700]/70">
        Round {round.number}
      </p>
      <h2 className="max-w-4xl text-center text-7xl font-black uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
        {round.title}
      </h2>
      <div className="mt-2 w-24 border-t-2 border-[#FFD700]" />
      <p className="mt-4 text-2xl text-white/70">{ptsText}</p>
      <p
        className={`text-xl font-bold uppercase tracking-wider ${
          round.joker_eligible ? "text-[#4EC9B0]" : "text-[#E84D5A]"
        }`}
      >
        {round.joker_eligible
          ? "Joker Is IN PLAY"
          : "Joker Is NOT In Play"}
      </p>
      {round.theme_description && (
        <p className="mt-6 max-w-3xl text-center text-xl italic text-[#F5E6C8]/80">
          {round.theme_description}
        </p>
      )}
    </div>
  );
}

// ─── Internet / Freebie Question ─────────────────────────

function InternetQuestionSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#1B4D3E] px-12">
      <p className="mb-4 text-lg font-medium uppercase tracking-[0.2em] text-white/50">
        Round {round.number} &mdash; {round.title}
      </p>
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#FFD700]">
        <span className="text-6xl font-black text-[#FFD700]">1</span>
      </div>
      <p className="mb-3 text-3xl font-bold uppercase tracking-wider text-[#FFD700]">
        Internet-Only Question
      </p>
      <p className="mb-8 max-w-2xl text-center text-2xl text-white/70">
        Find this week&apos;s question and answer at
      </p>
      <p className="mb-8 text-4xl font-black text-white">
        {brand.website}
      </p>
      <div className="flex items-center gap-3 rounded-full border border-white/20 bg-white/5 px-6 py-3">
        <svg viewBox="0 0 24 24" className="h-8 w-8 fill-[#E1306C]" aria-label={brand.socialPlatform}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
        <span className="text-2xl font-bold text-white">@{brand.socialHandle}</span>
      </div>
    </div>
  );
}

// ─── Questions Overview (Review) ─────────────────────────

function QuestionsOverviewSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;

  return (
    <div className="flex h-full flex-col bg-[#1B4D3E] p-10 pt-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#FFD700]/30" />
        <p className="text-lg font-bold uppercase tracking-[0.3em] text-[#FFD700]">
          Round {round.number} &mdash; {round.title}
        </p>
        <div className="h-px flex-1 bg-[#FFD700]/30" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3">
        {round.questions.map((q) => (
          <div key={q.number}>
            {q.is_internet_only ? (
              <p className="text-xl leading-snug text-white/40 italic">
                <span className="mr-2 inline-block w-9 text-right font-bold text-[#FFD700]/40">
                  {q.number}.
                </span>
                Internet-Only Question &mdash; {brand.website}
              </p>
            ) : (
            <>
              <p className="text-xl leading-snug text-white">
                <span className="mr-2 inline-block w-9 text-right font-bold text-[#FFD700]">
                  {q.number}.
                </span>
                {q.text}
              </p>
              {q.choices.length > 0 && (
                <p className="ml-11 text-base text-white/50">
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

// ─── Single Question ─────────────────────────────────────

function QuestionSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;
  const q = slide.question!;

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#1B4D3E] px-12">
      <p className="mb-4 text-lg font-medium uppercase tracking-[0.2em] text-white/50">
        Round {round.number} &mdash; {round.title}
      </p>
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#FFD700]">
        <span className="text-6xl font-black text-[#FFD700]">{q.number}</span>
      </div>
      <p className="max-w-4xl text-center text-4xl font-medium leading-relaxed text-white">
        {q.text}
      </p>
      {q.choices.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-x-12 gap-y-4">
          {q.choices.map((c, i) => (
            <p
              key={i}
              className="rounded-lg border border-white/10 bg-white/5 px-6 py-4 text-2xl text-[#F5E6C8]"
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

// ─── Answer Reveal ───────────────────────────────────────

function AnswerSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;
  const q = slide.question!;

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#0F1B2D] px-12">
      <p className="mb-3 text-lg font-medium uppercase tracking-[0.2em] text-white/40">
        Round {round.number} &mdash; {round.title}
      </p>
      <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-3 border-[#FFD700]/50">
        <span className="text-5xl font-black text-[#FFD700]/70">{q.number}</span>
      </div>
      <p className="max-w-4xl text-center text-3xl text-white/60">{q.text}</p>
      <div className="mt-6 w-16 border-t border-[#4EC9B0]/40" />
      <p className="mt-5 max-w-4xl text-center text-6xl font-black text-[#4EC9B0] drop-shadow-[0_2px_8px_rgba(78,201,176,0.3)]">
        {q.answer}
      </p>
    </div>
  );
}

// ─── Progressive Clue ────────────────────────────────────

function ProgressiveClueSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;
  const currentIdx = slide.clueIndex!;
  const currentClue = round.clues[currentIdx];

  return (
    <div className="flex h-full flex-col bg-[#1B4D3E] p-10">
      <p className="mb-2 text-lg font-medium uppercase tracking-[0.2em] text-white/50">
        Round {round.number} &mdash; {round.title}
      </p>
      <div className="mb-8 flex items-center justify-center">
        <div className="rounded-full border-2 border-[#FFD700] bg-[#FFD700]/10 px-8 py-3">
          <span className="text-4xl font-black text-[#FFD700]">
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
                ? "border-[#FFD700] bg-white/5"
                : "border-white/10 bg-transparent"
            }`}
          >
            <span
              className={`mr-3 text-base font-bold ${
                i === currentIdx ? "text-[#FFD700]" : "text-white/30"
              }`}
            >
              {clue.points}pts
            </span>
            <span
              className={`text-2xl ${
                i === currentIdx ? "font-semibold text-white" : "text-white/50"
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

// ─── Progressive Answer ──────────────────────────────────

function ProgressiveAnswerSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#0F1B2D]">
      <p className="mb-2 text-lg font-medium uppercase tracking-[0.2em] text-white/40">
        Round {round.number} &mdash; {round.title}
      </p>
      <p className="mb-6 text-2xl font-bold uppercase tracking-wider text-white/50">
        The Answer Is...
      </p>
      <p className="text-7xl font-black text-[#4EC9B0] drop-shadow-[0_2px_8px_rgba(78,201,176,0.3)]">
        {round.progressive_answer}
      </p>
    </div>
  );
}

// ─── Video Answers ───────────────────────────────────────

function VideoAnswersSlide({ slide }: { slide: Slide }) {
  const round = slide.round!;

  return (
    <div className="flex h-full flex-col bg-[#0F1B2D] p-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#FFD700]/30" />
        <p className="text-lg font-bold uppercase tracking-[0.3em] text-[#FFD700]">
          Round {round.number} &mdash; {round.title} &mdash; Answers
        </p>
        <div className="h-px flex-1 bg-[#FFD700]/30" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4">
        {round.questions.map((q) => (
          <p key={q.number} className="text-3xl font-semibold text-[#4EC9B0]">
            <span className="mr-3 inline-block w-10 text-right text-[#FFD700]">
              {q.number}.
            </span>
            {q.answer || q.text}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Tie Breaker ─────────────────────────────────────────

function TieBreakerQuestionSlide({ slide }: { slide: Slide }) {
  const quiz = slide.quiz!;

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#1B4D3E] p-12">
      <div className="mb-8 rounded-lg border-2 border-[#FFD700] bg-[#FFD700]/10 px-10 py-4">
        <span className="text-4xl font-black uppercase tracking-wider text-[#FFD700]">
          Tie Breaker
        </span>
      </div>
      <p className="max-w-4xl text-center text-4xl font-medium leading-relaxed text-white">
        {quiz.tie_breaker_question}
      </p>
    </div>
  );
}

function TieBreakerAnswerSlide({ slide }: { slide: Slide }) {
  const quiz = slide.quiz!;

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#0F1B2D] p-12">
      <div className="mb-8 rounded-lg border-2 border-[#FFD700]/40 px-10 py-4">
        <span className="text-3xl font-black uppercase tracking-wider text-[#FFD700]/60">
          Tie Breaker
        </span>
      </div>
      <p className="max-w-4xl text-center text-3xl text-white/60">
        {quiz.tie_breaker_question}
      </p>
      <div className="mt-6 w-16 border-t border-[#4EC9B0]/40" />
      <p className="mt-5 text-6xl font-black text-[#4EC9B0] drop-shadow-[0_2px_8px_rgba(78,201,176,0.3)]">
        {quiz.tie_breaker_answer}
      </p>
    </div>
  );
}
