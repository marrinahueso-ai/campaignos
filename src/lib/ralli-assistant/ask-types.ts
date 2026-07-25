/**
 * Client-safe Ask Ralli types (no server imports).
 * Keep the Dialog / UI off `ask.ts` so webpack never pulls server modules into the browser.
 */

export type AskRalliSource =
  | "faq"
  | "ai"
  | "ops"
  | "org"
  | "content"
  | "insights"
  | "pto";
