import type {
  NewsletterFontFamily,
  NewsletterFontSize,
  NewsletterTextAlign,
} from "@/lib/newsletter-composer/types";

export const NEWSLETTER_FONT_OPTIONS: {
  id: NewsletterFontFamily;
  label: string;
  stack: string;
}[] = [
  { id: "georgia", label: "Georgia", stack: "Georgia, 'Times New Roman', serif" },
  { id: "arial", label: "Arial", stack: "Arial, Helvetica, sans-serif" },
  { id: "helvetica", label: "Helvetica", stack: "Helvetica, Arial, sans-serif" },
  { id: "verdana", label: "Verdana", stack: "Verdana, Geneva, sans-serif" },
  { id: "times", label: "Times", stack: "'Times New Roman', Times, serif" },
];

export const NEWSLETTER_FONT_SIZE_OPTIONS: {
  id: NewsletterFontSize;
  label: string;
}[] = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
];

export const NEWSLETTER_ALIGN_OPTIONS: {
  id: NewsletterTextAlign;
  label: string;
}[] = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

/** Fixed heading-image band so uploads don’t change email layout height. */
export const HEADING_IMAGE_DISPLAY = {
  width: 560,
  height: 180,
} as const;

export function newsletterFontStack(
  family: NewsletterFontFamily | null | undefined,
  fallback: string,
): string {
  if (!family) return fallback;
  return (
    NEWSLETTER_FONT_OPTIONS.find((f) => f.id === family)?.stack ?? fallback
  );
}

export function newsletterHeadingFontPx(
  size: NewsletterFontSize | null | undefined,
): number {
  switch (size) {
    case "sm":
      return 20;
    case "lg":
      return 32;
    case "xl":
      return 40;
    case "md":
    default:
      return 26;
  }
}

export function newsletterBodyFontPx(
  size: NewsletterFontSize | null | undefined,
): number {
  switch (size) {
    case "sm":
      return 12;
    case "lg":
      return 16;
    case "xl":
      return 18;
    case "md":
    default:
      return 14;
  }
}

export function newsletterHeaderTitleFontPx(
  size: NewsletterFontSize | null | undefined,
): number {
  switch (size) {
    case "sm":
      return 20;
    case "lg":
      return 28;
    case "xl":
      return 34;
    case "md":
    default:
      return 24;
  }
}
