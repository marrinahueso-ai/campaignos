/**
 * Manual Instagram Email scheduling helpers.
 *
 * Neutral preview → persistence fields for story-kit email delivery.
 * No approver routing, Meta publish, or approval decisions.
 */

import { combineLocalDateAndTimeToIso } from "../utils/dates.ts";
import type { MilestonePreviewContent } from "./types.ts";

export function previewHasManualStoryKit(
  preview: Pick<
    MilestonePreviewContent,
    "deliveryMethod" | "enabledFormats" | "manualEmailTo"
  >,
): boolean {
  return (
    preview.deliveryMethod === "manual-email" ||
    preview.enabledFormats.includes("instagram-story-manual") ||
    Boolean(preview.manualEmailTo.trim())
  );
}

/** Email send time from Create with AI email date/time fields. */
export function resolveManualEmailSendIso(
  preview: MilestonePreviewContent,
): string | null {
  if (!previewHasManualStoryKit(preview)) {
    return null;
  }

  return combineLocalDateAndTimeToIso(
    preview.emailSendDate,
    preview.emailSendTime,
  );
}

/** Fields written for Manual Email / hybrid story kits (not Meta schedule_at). */
export function buildManualEmailPersistenceFields(
  preview: MilestonePreviewContent,
): {
  manual_email_to: string | null;
  manual_email_send_at: string | null;
} {
  return {
    manual_email_to: preview.manualEmailTo.trim() || null,
    manual_email_send_at: resolveManualEmailSendIso(preview),
  };
}

/** One caption for the story kit email — story/instagram wins, else feed. */
export function resolveStoryKitCaption(
  storyCaption: string | null | undefined,
  feedCaption: string | null | undefined,
): string {
  return storyCaption?.trim() || feedCaption?.trim() || "";
}

/** Cron due timestamp: dedicated email time, else Meta/schedule_at fallback. */
export function resolveManualUploadEmailDueAt(row: {
  manual_email_send_at?: string | null;
  schedule_at?: string | null;
}): string | null {
  return row.manual_email_send_at ?? row.schedule_at ?? null;
}

const DEFAULT_CATCHUP_HOURS = 48;

export function isManualUploadEmailDue(
  emailSendAt: string | null,
  now: Date,
  catchupHours: number = DEFAULT_CATCHUP_HOURS,
): boolean {
  if (!emailSendAt) {
    return true;
  }

  const scheduled = new Date(emailSendAt);
  if (Number.isNaN(scheduled.getTime())) {
    return true;
  }

  const msUntil = scheduled.getTime() - now.getTime();
  if (msUntil > 0) {
    return false;
  }

  const hoursLate = Math.abs(msUntil) / 3_600_000;
  return hoursLate <= catchupHours;
}
