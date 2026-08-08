import type { CampaignBuilderStepId } from "@/lib/campaign-builder-v2/types";

/** Numbered progress steps (excludes the post-submit confirmation view). */
export const CAMPAIGN_BUILDER_STEPS: Array<{
  id: Exclude<CampaignBuilderStepId, "published" | "milestones">;
  label: string;
  subtitle?: string;
}> = [
  { id: "inspiration", label: "Your Creative Setup" },
  {
    id: "preview",
    label: "Preview Campaign",
    subtitle: "Edit posts, artwork, and how they go out",
  },
  { id: "review", label: "Review & Approve" },
];

export type CampaignBuilderStepperStepId =
  (typeof CAMPAIGN_BUILDER_STEPS)[number]["id"];

export const DEFAULT_CAMPAIGN_BUILDER_STEP: CampaignBuilderStepId = "inspiration";

/** Stepper steps plus confirmation + legacy Posts hash (redirects to Preview). */
const VALID_STEPS = new Set<string>([
  ...CAMPAIGN_BUILDER_STEPS.map((step) => step.id),
  "published",
  "milestones",
]);

export function isValidCampaignBuilderStep(
  step: string,
): step is CampaignBuilderStepId {
  return VALID_STEPS.has(step);
}

/** Normalize legacy `#milestones` (Posts step) onto Preview. */
export function normalizeCampaignBuilderStep(
  step: CampaignBuilderStepId,
): Exclude<CampaignBuilderStepId, "milestones"> {
  if (step === "milestones") {
    return "preview";
  }
  return step;
}

export function stepFromHash(hash: string): CampaignBuilderStepId {
  const normalized = hash.replace(/^#/, "");
  if (normalized === "milestones") {
    return "preview";
  }
  if (VALID_STEPS.has(normalized)) {
    return normalized as CampaignBuilderStepId;
  }
  return DEFAULT_CAMPAIGN_BUILDER_STEP;
}

export function campaignBuilderHref(
  eventId: string,
  step: CampaignBuilderStepId = DEFAULT_CAMPAIGN_BUILDER_STEP,
): string {
  return `/events/${eventId}/campaign-builder#${step}`;
}

/**
 * Deep link that creates a new volunteer (or thank-you) post for this event and
 * opens Preview with the artwork editor — no event picker or extra "Create" click.
 */
export type CampaignBuilderCreatePostKind = "volunteer" | "thank_you";

export function campaignBuilderCreatePostHref(
  eventId: string,
  kind: CampaignBuilderCreatePostKind = "volunteer",
): string {
  const params = new URLSearchParams({
    createPost: kind,
  });
  return `/events/${eventId}/campaign-builder?${params.toString()}#preview`;
}

/** Deep link that opens Preview with a milestone selected (edit caption/schedule/artwork). */
export function campaignBuilderPreviewMilestoneHref(
  eventId: string,
  milestoneId: string,
): string {
  const params = new URLSearchParams({
    milestone: milestoneId,
  });
  return `/events/${eventId}/campaign-builder?${params.toString()}#preview`;
}

/** Deep link that opens Preview and the Edit Artwork modal for a milestone. */
export function campaignBuilderEditArtworkHref(
  eventId: string,
  milestoneId: string,
): string {
  const params = new URLSearchParams({
    milestone: milestoneId,
    editArtwork: "1",
  });
  return `/events/${eventId}/campaign-builder?${params.toString()}#preview`;
}

export function absoluteCampaignBuilderPreviewMilestoneHref(
  eventId: string,
  milestoneId: string,
): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${campaignBuilderPreviewMilestoneHref(eventId, milestoneId)}`;
}

export function absoluteCampaignBuilderEditArtworkHref(
  eventId: string,
  milestoneId: string,
): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${campaignBuilderEditArtworkHref(eventId, milestoneId)}`;
}
