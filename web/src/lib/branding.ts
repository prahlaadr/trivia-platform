/**
 * Branding configuration — supports toggling between brands.
 *
 * Colors are defined as CSS custom properties in globals.css.
 * Text, social handles, and metadata are defined here.
 */

export type BrandKey = "dirty-south" | "pyaar";

interface BrandConfig {
  name: string;
  tagline: string;
  website: string;
  socialHandle: string;
  socialPlatform: string;
  pageTitle: string;
  pageDescription: string;
  quizLabel: string;
}

const brands: Record<BrandKey, BrandConfig> = {
  "dirty-south": {
    name: "Dirty South Trivia",
    tagline: "Pub Quiz Presenter",
    website: "DirtySouthTrivia.com",
    socialHandle: "dstrivia",
    socialPlatform: "Instagram",
    pageTitle: "Trivia Platform — Dirty South Trivia",
    pageDescription: "Pub quiz presenter and question bank",
    quizLabel: "Pub Quiz",
  },
  pyaar: {
    name: "Pyaar Trivia",
    tagline: "Trivia Platform",
    website: "pyaar-trivia.vercel.app",
    socialHandle: "pyaartrivia",
    socialPlatform: "Instagram",
    pageTitle: "Pyaar Trivia",
    pageDescription: "Trivia platform — presenter, scorekeeper, and test bank",
    quizLabel: "Quiz",
  },
};

const DEFAULT_BRAND: BrandKey = "dirty-south";

export function getBrandKey(): BrandKey {
  if (typeof window === "undefined") return DEFAULT_BRAND;
  return (localStorage.getItem("trivia-brand") as BrandKey) || DEFAULT_BRAND;
}

export function setBrandKey(key: BrandKey) {
  localStorage.setItem("trivia-brand", key);
}

export function getBrand(): BrandConfig {
  return brands[getBrandKey()];
}

/** Static brand for server-side rendering (layout metadata) */
export const brand = brands[DEFAULT_BRAND];

export { brands };
