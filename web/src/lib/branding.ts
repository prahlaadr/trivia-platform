/**
 * Branding configuration.
 *
 * Single brand: Pyaar Project Trivia. The colors are defined as Tailwind
 * classes in the components (greens + gold) — not in this file.
 */

export type BrandKey = "pyaar";

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
  pyaar: {
    name: "Pyaar Project Trivia",
    tagline: "Trivia Presenter",
    website: "trivia.pyaarproject.org",
    socialHandle: "pyaartrivia",
    socialPlatform: "Instagram",
    pageTitle: "Pyaar Project Trivia",
    pageDescription: "Trivia presenter and question bank",
    quizLabel: "Quiz",
  },
};

const DEFAULT_BRAND: BrandKey = "pyaar";

export function getBrandKey(): BrandKey {
  return DEFAULT_BRAND;
}

export function getBrand(): BrandConfig {
  return brands[DEFAULT_BRAND];
}

/** Static brand for server-side rendering (layout metadata) */
export const brand = brands[DEFAULT_BRAND];

export { brands };
