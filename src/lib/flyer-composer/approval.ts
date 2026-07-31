/**
 * Flyer composer ↔ Approvals hub bridge helpers.
 * Reuses `approval_scheduling_items` (same queue as Create with AI Social).
 * Identity: campaign_milestone_id = flyer-composer:{submissionKey}
 */

export const FLYER_COMPOSER_MILESTONE_PREFIX = "flyer-composer:";

export const FLYER_COMPOSER_CAMPAIGN_NAME = "Flyer";

export function buildFlyerComposerMilestoneId(submissionKey: string): string {
  const key = submissionKey.trim();
  if (!key) {
    throw new Error("Flyer approval submission key is required.");
  }
  if (key.startsWith(FLYER_COMPOSER_MILESTONE_PREFIX)) {
    return key;
  }
  return `${FLYER_COMPOSER_MILESTONE_PREFIX}${key}`;
}

export function isFlyerComposerMilestoneId(
  value: string | null | undefined,
): boolean {
  return Boolean(value?.startsWith(FLYER_COMPOSER_MILESTONE_PREFIX));
}

/** Deep link back to Flyer Preview (selected version lives in local draft). */
export function flyerComposerEditHref(options?: {
  absolute?: boolean;
}): string {
  const path = "/create-with-ai/flyer?view=result";
  if (!options?.absolute) return path;
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

export function flyerComposerApprovalTitle(input: {
  headline?: string | null;
  orgName?: string | null;
  templateName?: string | null;
}): string {
  const headline = input.headline?.trim();
  if (headline) return headline;
  const org = input.orgName?.trim();
  if (org) return `${org} flyer`;
  const template = input.templateName?.trim();
  if (template) return template;
  return "Flyer";
}

export function isPersistableFlyerApprovalImageUrl(
  url: string | null | undefined,
): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:image/")
  );
}
