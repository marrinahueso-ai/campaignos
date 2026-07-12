import type { CampaignBuilderStepId } from "@/lib/campaign-builder-v2/types";

export const CAMPAIGN_BUILDER_STEPS: Array<{
  id: CampaignBuilderStepId;
  label: string;
  subtitle?: string;
}> = [
  { id: "inspiration", label: "Inspiration & Input" },
  { id: "milestones", label: "Milestones" },
  { id: "preview", label: "Preview Campaign", subtitle: "Create content one milestone at a time" },
  { id: "review", label: "Review & Approve" },
  { id: "published", label: "Published" },
];

export const DEFAULT_CAMPAIGN_BUILDER_STEP: CampaignBuilderStepId = "inspiration";

const VALID_STEPS = new Set<string>(CAMPAIGN_BUILDER_STEPS.map((step) => step.id));

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
