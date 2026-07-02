import type {
  DefaultCtaStyle,
  EmojiUsage,
  NewsletterLength,
  TrainingDocumentType,
  WritingStyle,
} from "@/types/organization-intelligence";

export const WRITING_STYLES: { value: WritingStyle; label: string }[] = [
  { value: "friendly", label: "Friendly & Welcoming" },
  { value: "professional", label: "Professional" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "warm", label: "Warm & Community-Focused" },
  { value: "concise", label: "Concise & Direct" },
  { value: "formal", label: "Formal" },
];

export const CTA_STYLES: { value: DefaultCtaStyle; label: string }[] = [
  { value: "direct", label: "Direct — clear action (Register today)" },
  { value: "soft_invite", label: "Soft invite — warm nudge (We hope to see you)" },
  { value: "question", label: "Question — engagement hook (Ready to join us?)" },
  { value: "link_forward", label: "Link-forward — see details below" },
  { value: "volunteer_focused", label: "Volunteer-focused — sign up to help" },
];

export const EMOJI_USAGE_OPTIONS: { value: EmojiUsage; label: string }[] = [
  { value: "none", label: "None — no emoji" },
  { value: "minimal", label: "Minimal — 0–1 per post" },
  { value: "moderate", label: "Moderate — 1–3 per post" },
  { value: "frequent", label: "Frequent — expressive social tone" },
];

export const NEWSLETTER_LENGTH_OPTIONS: {
  value: NewsletterLength;
  label: string;
}[] = [
  { value: "short", label: "Short — 2–3 sentences" },
  { value: "medium", label: "Medium — 1 short paragraph" },
  { value: "long", label: "Long — 2–3 paragraphs" },
];

export const TRAINING_DOCUMENT_TYPES: {
  value: TrainingDocumentType;
  label: string;
  hint: string;
}[] = [
  { value: "pdf", label: "PDF", hint: "General reference PDF" },
  {
    value: "docx",
    label: "DOCX",
    hint: "Word document with past communications",
  },
  {
    value: "newsletter",
    label: "Newsletter",
    hint: "Past school or PTO newsletter issue",
  },
  {
    value: "facebook_export",
    label: "Facebook Export",
    hint: "Exported Facebook post history",
  },
  {
    value: "website_article",
    label: "Website Article",
    hint: "School website announcement or blog post",
  },
  {
    value: "principal_letter",
    label: "Principal Letter",
    hint: "Principal message or staff communication",
  },
  {
    value: "canva_pdf",
    label: "Canva PDF",
    hint: "Exported Canva flyer or graphic PDF",
  },
];

export const CHANNEL_PREFERENCE_HINT =
  "List your preferred channels and any notes — e.g. Facebook primary, newsletter monthly, Instagram for photos.";

export const MAX_PROFILE_TEXT_LENGTH = 4000;
export const MAX_TONE_LENGTH = 500;
export const MAX_TRAINING_TITLE_LENGTH = 120;
export const MAX_TRAINING_NOTES_LENGTH = 1000;
export const MAX_TRAINING_FILE_BYTES = 25 * 1024 * 1024;

export const ALLOWED_TRAINING_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/html",
  "text/csv",
  "application/json",
  "application/zip",
  "application/octet-stream",
];
