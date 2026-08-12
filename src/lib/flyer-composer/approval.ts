/**
 * Flyer composer ↔ Approvals hub bridge helpers.
 * Reuses `approval_scheduling_items` (same queue as Create with AI Social).
 * Identity: campaign_milestone_id = flyer-composer:{submissionKey}
 * When the durable library is used, submissionKey is the flyer.id.
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

/** Extracts the raw flyer / submission key from a `flyer-composer:{id}` milestone id. */
export function parseFlyerIdFromMilestoneId(
  value: string | null | undefined,
): string | null {
  if (!isFlyerComposerMilestoneId(value)) return null;
  const id = value!.slice(FLYER_COMPOSER_MILESTONE_PREFIX.length).trim();
  return id || null;
}

function appUrlBase(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * Deep link back to Flyer builder / Preview.
 * With `flyerId`: durable library edit at `/create-with-ai/flyer?flyerId=`.
 * Without: legacy Preview deep link (`?view=result`).
 */
export function flyerComposerEditHref(options?: {
  flyerId?: string | null;
  absolute?: boolean;
}): string {
  const flyerId = options?.flyerId?.trim();
  const path = flyerId
    ? `/create-with-ai/flyer?flyerId=${encodeURIComponent(flyerId)}`
    : "/create-with-ai/flyer?view=result";
  if (!options?.absolute) return path;
  return `${appUrlBase()}${path}`;
}

/** Deep link to the flyer changes-requested view. */
export function flyerChangesHref(
  flyerId: string,
  options?: { absolute?: boolean },
): string {
  const path = `/flyers/${encodeURIComponent(flyerId.trim())}/changes`;
  return options?.absolute ? `${appUrlBase()}${path}` : path;
}

/** Deep link to the flyer review / status view. */
export function flyerReviewHref(
  flyerId: string,
  options?: { absolute?: boolean },
): string {
  const path = `/flyers/${encodeURIComponent(flyerId.trim())}/review`;
  return options?.absolute ? `${appUrlBase()}${path}` : path;
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
