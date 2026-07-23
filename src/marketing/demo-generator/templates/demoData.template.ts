/**
 * TEMPLATE — copy into src/marketing/demos/[DemoName]/demoData.ts
 * Replace placeholders. Keep all visitor-facing copy here.
 */

export const DEMO_DATA = {
  // school: "...",
  // titles, statuses, captions, metrics…
  exampleTitle: "[TITLE]",
  startingStatus: "[START STATUS]",
  finalStatus: "[FINAL STATUS]",
} as const;

export type DemoData = typeof DEMO_DATA;
