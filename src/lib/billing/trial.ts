/**
 * 14-day free trial rules (app + Stripe).
 * Product: docs/ops/ai-credits-matrix.md
 */

import { BILLING_TRIAL } from "@/lib/billing/plan-catalog";
import type { OrgBillingSnapshot } from "@/lib/billing/org-billing-pure";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Attach a Stripe subscription trial on first Checkout only.
 * Skip if founding, already paid/active, already had a Stripe sub, or app trial expired.
 */
export function shouldAttachStripeTrial(snapshot: OrgBillingSnapshot): boolean {
  if (snapshot.billingExempt) return false;
  if (
    snapshot.subscriptionStatus === "active" ||
    snapshot.subscriptionStatus === "past_due"
  ) {
    return false;
  }
  // Already consumed a Stripe subscription (including prior cancel).
  if (snapshot.stripeSubscriptionId) return false;
  // App trial finished without converting — charge immediately.
  if (snapshot.trialExpired) return false;
  return true;
}

/**
 * Days to send Stripe as trial_period_days (1–14).
 * If already mid app-trial, use remaining days so the window doesn't restart.
 */
export function stripeTrialPeriodDays(
  snapshot: OrgBillingSnapshot,
  now: Date = new Date(),
): number {
  if (snapshot.trialActive && snapshot.trialEndsAt) {
    const remaining = Math.ceil(
      (Date.parse(snapshot.trialEndsAt) - now.getTime()) / DAY_MS,
    );
    return Math.max(1, Math.min(BILLING_TRIAL.days, remaining));
  }
  return BILLING_TRIAL.days;
}

export function trialEndIsoFromStripeUnix(
  trialEndUnix: number | null | undefined,
): string | null {
  if (trialEndUnix == null || !Number.isFinite(trialEndUnix)) return null;
  return new Date(trialEndUnix * 1000).toISOString();
}
