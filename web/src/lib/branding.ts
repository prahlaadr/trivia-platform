/**
 * Branding configuration — change these values to rebrand the app.
 *
 * Colors are defined as CSS custom properties in globals.css.
 * Text, social handles, and metadata are defined here.
 */

export const brand = {
  /** Display name shown on title slides and headers */
  name: "Dirty South Trivia",

  /** Tagline / subtitle */
  tagline: "Pub Quiz Presenter",

  /** Website URL shown on internet-only question slides */
  website: "DirtySouthTrivia.com",

  /** Social media handle (without @) */
  socialHandle: "dstrivia",

  /** Social platform name */
  socialPlatform: "Instagram",

  /** HTML page title */
  pageTitle: "Trivia Platform — Dirty South Trivia",

  /** Meta description */
  pageDescription: "Pub quiz presenter and question bank",

  /** Label for the quiz format (e.g., "Pub Quiz") */
  quizLabel: "Pub Quiz",
} as const;
