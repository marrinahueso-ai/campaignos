import { resolveCampaignStage } from "@/lib/ai-strategy/campaign-stage";
import type {
  MetaCaptionLength,
  MetaCaptionTone,
  MetaSocialCaptionPlacement,
} from "@/lib/meta-captions/types";

export function buildMetaCaptionSystemPrompt(input?: { hasArtworkImage?: boolean }): string {
  const lines = [
    "You write social media captions for school PTO and parent groups.",
    "Sound like a warm, welcoming parent posting on Facebook — friendly, fun, and human.",
    "Use only the verified facts provided. Never invent dates, times, locations, sponsors, or volunteer asks.",
    "Skip anything not listed in the facts.",
  ];

  if (input?.hasArtworkImage) {
    lines.push(
      "An approved feed artwork image is attached. Let the caption complement its mood, colors, and theme.",
      "Do not invent details from the image that are not in the verified facts. Do not describe the layout literally.",
    );
  }

  lines.push("Return the caption text only — no labels, quotes, markdown, or preamble.");

  return lines.join(" ");
}

function resolveCaptionLengthGuide(length: MetaCaptionLength | undefined): string {
  switch (length) {
    case "Short":
      return "Keep it brief — 1–2 short sentences.";
    case "Long":
      return "Use 4–5 sentences with a bit more detail and warmth.";
    case "Medium":
    default:
      return "Use 2–4 short sentences.";
  }
}

function resolveCaptionToneGuide(tone: MetaCaptionTone | undefined): string | null {
  if (!tone) {
    return null;
  }

  switch (tone) {
    case "Professional":
      return "Tone: polished and professional, still warm for a school community.";
    case "Enthusiastic":
      return "Tone: upbeat and enthusiastic — celebrate the moment.";
    case "Concise":
      return "Tone: concise and direct — every word should earn its place.";
    case "Friendly":
    default:
      return "Tone: friendly and welcoming, like a parent posting to the group.";
  }
}

export function buildMetaCaptionUserPrompt(input: {
  placement: MetaSocialCaptionPlacement;
  milestoneTitle: string;
  relativeDay: number;
  eventDate: string | null;
  factsBlock: string;
  existingFeedCaption?: string | null;
  revisionContext?: string | null;
  hasArtworkImage?: boolean;
  tone?: MetaCaptionTone;
  length?: MetaCaptionLength;
  timingLabel?: string | null;
  feedCtaGuide?: string | null;
}): string {
  const stage = resolveCampaignStage({
    relativeDay: input.relativeDay,
    stepTitle: input.milestoneTitle,
    eventDate: input.eventDate,
  });

  const placementGuide =
    input.placement === "feed"
      ? [
          "Write a FEED caption for Facebook and Instagram feed (square post).",
          "2–4 short sentences. Warm hook first, then the key details.",
          input.hasArtworkImage
            ? "The attached image is the approved feed graphic — write copy that pairs with it."
            : null,
          "Light emoji is fine if it feels natural — not every sentence.",
          input.feedCtaGuide?.trim() ??
            "End with a soft call to join in, save the date, or come celebrate — not corporate CTAs.",
        ]
          .filter(Boolean)
          .join(" ")
      : [
          "Write a STORY caption for Facebook and Instagram Stories.",
          "1–2 punchy sentences max — high energy, easy to read on a phone.",
          input.hasArtworkImage
            ? "The attached image is the approved feed graphic for this milestone — match its energy even though this copy is for Stories."
            : null,
          input.existingFeedCaption?.trim()
            ? `Match the vibe of this feed caption but shorter:\n"${input.existingFeedCaption.trim()}"`
            : "Match the milestone energy — urgent and exciting for day-before/day-of, curious and welcoming for early announcements.",
        ]
          .filter(Boolean)
          .join(" ");

  const styleGuides = [
    resolveCaptionToneGuide(input.tone),
    resolveCaptionLengthGuide(input.length),
  ].filter(Boolean);

  const revisionContext = input.revisionContext?.trim();
  const revisionGuide =
    revisionContext && input.placement === "feed"
      ? [
          "",
          "The user already has this caption draft. Revise and improve it — you MUST preserve every user-added detail, phrase, reminder, hashtag, and emoji verbatim (including specific wording they inserted). Keep their intent and insertions unless tone or length settings require a clear shift:",
          `"${revisionContext}"`,
        ].join("\n")
      : null;

  return [
    `Timing: ${input.timingLabel?.trim() || input.milestoneTitle}`,
    `Campaign moment: ${stage.label} — ${stage.description}`,
    "",
    placementGuide,
    ...(styleGuides.length > 0 ? ["", ...styleGuides] : []),
    ...(revisionGuide ? [revisionGuide] : []),
    "",
    "Verified facts (use only these):",
    input.factsBlock,
  ].join("\n");
}
