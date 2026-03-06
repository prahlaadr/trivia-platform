"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Quiz } from "@/lib/types";
import { buildSlides } from "@/lib/slides";
import { SlideRenderer } from "./SlideRenderer";

interface PresenterProps {
  quiz: Quiz;
}

export function Presenter({ quiz }: PresenterProps) {
  const router = useRouter();
  const slides = buildSlides(quiz);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideSeconds, setSlideSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset timer whenever slide changes
  useEffect(() => {
    setSlideSeconds(0);
    timerRef.current = setInterval(() => {
      setSlideSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentSlide]);

  const exitPresenter = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    router.push("/");
  }, [router]);

  const goNext = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "Escape") {
        exitPresenter();
      } else if (e.key === "Home") {
        setCurrentSlide(0);
      } else if (e.key === "End") {
        setCurrentSlide(slides.length - 1);
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener("keydown", handleKey);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [goNext, goPrev, toggleFullscreen, exitPresenter, slides.length]);

  const slide = slides[currentSlide];
  const progress = ((currentSlide + 1) / slides.length) * 100;

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0
      ? `${mins}:${secs.toString().padStart(2, "0")}`
      : `${secs}s`;
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0F1B2D]">
      {/* Slide content */}
      <div className="h-full w-full">
        <SlideRenderer slide={slide} />
      </div>

      {/* Timer — always visible, top-right corner */}
      <div className="absolute right-4 top-4 rounded bg-black/40 px-3 py-1.5 font-mono text-sm tabular-nums text-white/50">
        {formatTime(slideSeconds)}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-black/30">
        <div
          className="h-full bg-[#FFD700] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls overlay (bottom) */}
      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-4 opacity-0 transition-opacity hover:opacity-100">
        <button
          onClick={exitPresenter}
          className="rounded bg-[#E84D5A]/80 px-3 py-1 text-sm font-bold text-white"
          title="Esc"
        >
          Exit
        </button>
        <button
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="rounded bg-black/60 px-3 py-1 text-sm text-white/80 disabled:opacity-30"
        >
          Prev
        </button>
        <span className="text-sm text-white/50">
          {currentSlide + 1} / {slides.length}
        </span>
        <button
          onClick={goNext}
          disabled={currentSlide === slides.length - 1}
          className="rounded bg-black/60 px-3 py-1 text-sm text-white/80 disabled:opacity-30"
        >
          Next
        </button>
        <button
          onClick={toggleFullscreen}
          className="rounded bg-black/60 px-3 py-1 text-sm text-white/80"
        >
          {isFullscreen ? "Exit FS" : "Fullscreen"}
        </button>
      </div>
    </div>
  );
}
