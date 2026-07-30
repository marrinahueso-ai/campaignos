const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const APPROVAL_REMINDER_DELAY_MS = 24 * HOUR_MS;
export const TRIAL_ENDING_NOTICE_DAYS = 3;

export function isApprovalReminderDue(
  requestedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const requestedAtMs = requestedAt ? Date.parse(requestedAt) : Number.NaN;
  return (
    Number.isFinite(requestedAtMs) &&
    now.getTime() - requestedAtMs >= APPROVAL_REMINDER_DELAY_MS
  );
}

export function trialDaysRemaining(
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  const trialEndMs = trialEndsAt ? Date.parse(trialEndsAt) : Number.NaN;
  if (!Number.isFinite(trialEndMs) || trialEndMs <= now.getTime()) {
    return null;
  }

  return Math.ceil((trialEndMs - now.getTime()) / DAY_MS);
}

export function isTrialEndingNoticeDue(input: {
  subscriptionStatus: string | null | undefined;
  trialEndsAt: string | null | undefined;
  now?: Date;
}): boolean {
  if (input.subscriptionStatus !== "trialing") {
    return false;
  }

  const daysRemaining = trialDaysRemaining(input.trialEndsAt, input.now);
  return (
    daysRemaining !== null &&
    daysRemaining > 0 &&
    daysRemaining <= TRIAL_ENDING_NOTICE_DAYS
  );
}

export function trialNoticeEntityKey(
  organizationId: string,
  trialEndsAt: string,
): string {
  return `${organizationId}:${trialEndsAt}`;
}
