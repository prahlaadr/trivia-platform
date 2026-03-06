import type { Quiz, Round, Slide } from "./types";

/**
 * Build an ordered array of slides from a Quiz.
 * Flow per standard round:
 *   1. Round title slide
 *   2. Each question shown one by one
 *   3. All questions overview (review)
 *   4. For each question: question slide → answer reveal slide
 * Progressive rounds: one slide per clue (accumulating) → answer slide
 * Video rounds: answers list slide
 * End: tie breaker question → answer
 */
export function buildSlides(quiz: Quiz): Slide[] {
  const slides: Slide[] = [];

  // Title slide
  slides.push({ type: "title", quiz });

  const lastRoundNum = quiz.rounds.length > 0
    ? quiz.rounds[quiz.rounds.length - 1].number
    : -1;

  for (const round of quiz.rounds) {
    const isLastRound = round.number === lastRoundNum;

    // Round title
    slides.push({
      type: "round-title",
      round,
      roundNumber: round.number,
      roundTitle: round.title,
      isLastRound,
    });

    if (round.round_type === "progressive") {
      // One slide per clue
      for (let i = 0; i < round.clues.length; i++) {
        slides.push({
          type: "progressive-clue",
          round,
          clueIndex: i,
          roundNumber: round.number,
          roundTitle: round.title,
        });
      }
      // Answer reveal
      slides.push({
        type: "progressive-answer",
        round,
        roundNumber: round.number,
        roundTitle: round.title,
      });
    } else if (round.round_type === "video") {
      // Video rounds: just show answers
      slides.push({
        type: "video-answers",
        round,
        roundNumber: round.number,
        roundTitle: round.title,
      });
    } else {
      // Standard rounds
      if (round.questions.length > 0) {
        // 1. Questions one by one
        for (const question of round.questions) {
          slides.push({
            type: question.is_internet_only ? "internet-question" : "question",
            round,
            question,
            roundNumber: round.number,
            roundTitle: round.title,
          });
        }

        // 2. All questions review (all questions including internet)
        slides.push({
          type: "questions-overview",
          round,
          roundNumber: round.number,
          roundTitle: round.title,
        });

        // 3. Answer reveal: question → answer for each
        for (const question of round.questions) {
          // Internet question gets its own slide type in reveal too
          slides.push({
            type: question.is_internet_only ? "internet-question" : "question",
            round,
            question,
            roundNumber: round.number,
            roundTitle: round.title,
          });
          if (!question.is_internet_only) {
            slides.push({
              type: "answer",
              round,
              question,
              roundNumber: round.number,
              roundTitle: round.title,
            });
          }
        }
      }
    }
  }

  // Tie breaker
  if (quiz.tie_breaker_question) {
    slides.push({ type: "tie-breaker-question", quiz });
    slides.push({ type: "tie-breaker-answer", quiz });
  }

  return slides;
}
