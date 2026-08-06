/**
 * Prompt for one standalone library background (never a contact sheet).
 */
export function buildBackgroundLibraryVariationPrompt(input: {
  sourceTitle: string;
  variationIndex: number;
  batchSize: number;
}): string {
  const title = input.sourceTitle.trim() || "school / PTO inspiration";
  return [
    `Create a single standalone decorative background image for a reusable design library (variation ${input.variationIndex} of ${input.batchSize}).`,
    `Inspiration theme: ${title}.`,
    "This must be ONE complete background scene or texture — suitable later as an inspiration reference for flyers, social posts, and other school communications.",
    "Do not lock the composition to a specific social crop; leave flexible negative space so designers can overlay headlines and event details.",
    "Vary mood, color emphasis, and composition from other variations while staying true to the attached inspiration.",
    "CRITICAL: Output exactly one image. Never create a grid, collage, contact sheet, mood board, multi-panel layout, tiled thumbnails, or multiple scenes in one frame.",
    "No readable event names, dates, logos, URLs, QR codes, or long paragraphs of text on the graphic.",
    "Tasteful, warm, community-friendly school aesthetic — fun but not childish clutter.",
  ].join(" ");
}
