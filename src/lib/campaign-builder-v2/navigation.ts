import type { CampaignBuilderStepId } from "@/lib/campaign-builder-v2/types";

/** Numbered progress steps (excludes the post-submit confirmation view). */
export const CAMPAIGN_BUILDER_STEPS: Array<{
  id: Exclude<CampaignBuilderStepId, "published">;
  label: string;
  subtitle?: string;
}> = [
  { id: "inspiration", label: "Your Creative Setup" },
  { id: "milestones", label: "Campaign Milestones" },
  { id: "preview", label: "Preview Campaign", subtitle: "Create content one milestone at a time" },
  { id: "review", label: "Review & Approve" },
];

export type CampaignBuilderStepperStepId =
  (typeof CAMPAIGN_BUILDER_STEPS)[number]["id"];

export const DEFAULT_CAMPAIGN_BUILDER_STEP: CampaignBuilderStepId = "inspiration";

/** Stepper steps plus the Sent-for-approval confirmation hash/view. */
const VALID_STEPS = new Set<string>([
  ...CAMPAIGN_BUILDER_STEPS.map((step) => step.id),
  "published",
]);

export function isValidCampaignBuilderStep(
  step: string,
): step is CampaignBuilderStepId {
  return VALID_STEPS.has(step);
}

export function stepFromHash(hash: string): CampaignBuilderStepId {
  const normalized = hash.replace(/^#/, "");
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
