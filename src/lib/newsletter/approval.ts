/**
 * Newsletter ↔ Approvals hub bridge helpers.
 * Reuses `approval_scheduling_items` (same queue as Create with AI Social /
 * flyer composer), but org-scoped instead of event-scoped.
 * Identity: campaign_milestone_id = newsletter:{newsletterId}
 */

export const NEWSLETTER_MILESTONE_PREFIX = "newsletter:";

export const NEWSLETTER_CAMPAIGN_NAME = "Newsletter";

export function buildNewsletterMilestoneId(newsletterId: string): string {
  const id = newsletterId.trim();
  if (!id) {
    throw new Error("Newsletter id is required to build a milestone id.");
  }
  if (id.startsWith(NEWSLETTER_MILESTONE_PREFIX)) {
    return id;
  }
  return `${NEWSLETTER_MILESTONE_PREFIX}${id}`;
}

export function isNewsletterMilestoneId(
  value: string | null | undefined,
): boolean {
  return Boolean(value?.startsWith(NEWSLETTER_MILESTONE_PREFIX));
}

/** Extracts the raw newsletter id from a `newsletter:{id}` milestone id. */
export function parseNewsletterIdFromMilestoneId(
  value: string | null | undefined,
): string | null {
  if (!isNewsletterMilestoneId(value)) return null;
  const id = value!.slice(NEWSLETTER_MILESTONE_PREFIX.length).trim();
  return id || null;
}

function appUrlBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

/** Deep link to the newsletter detail / review view. */
export function newsletterDetailHref(
  newsletterId: string,
  options?: { absolute?: boolean },
): string {
  const path = `/newsletters/${encodeURIComponent(newsletterId)}`;
  return options?.absolute ? `${appUrlBase()}${path}` : path;
}

/** Deep link back into the newsletter composer (new draft when no id). */
export function newsletterComposerHref(
  newsletterId?: string | null,
  options?: { absolute?: boolean },
): string {
  const path = newsletterId?.trim()
    ? `/newsletter-composer?newsletterId=${encodeURIComponent(newsletterId.trim())}`
    : "/newsletter-composer";
  return options?.absolute ? `${appUrlBase()}${path}` : path;
}
