/**
 * "Actually canceled" lockout signal (pure — safe for Edge middleware + unit tests).
 *
 * Safe DB signal: `organizations.subscription_status = 'canceled'` is written by
 * exactly one code path — `handleStripeSubscriptionDeleted` / `applyStripeSubscription`
 * in src/lib/billing/stripe-sync.ts, which only runs from real Stripe subscription
 * webhooks (`customer.subscription.deleted` / `.updated`). It is never the default
 * or initial value:
 *   - Column default (20260725040000_organization_billing_stripe.sql) is `'none'`.
 *   - New org creation (src/lib/organizations/mutations.ts) sets `'trialing'` (or
 *     `'none'` for founding-exempt orgs) — never `'canceled'`.
 *   - Every other write site (checkout-completed, subscription-updated) maps a live
 *     Stripe subscription status; only a real subscription that Stripe canceled can
 *     produce `'canceled'`.
 * So `subscription_status === "canceled"` can only occur for an org that once had a
 * real Stripe subscription which was then canceled/deleted — never for a fresh,
 * trial-only, or pre-Stripe "Starter fallback" org. Combined with the billing-exempt
 * bypass (constraint: founding orgs never get locked out even if a legacy row has
 * subscription_status=canceled from before they were made exempt).
 */

export type OrgLockoutSignalRow = {
  billing_exempt_at?: string | null;
  subscription_status?: string | null;
};

export type OrgLockoutSignalSnapshot = {
  billingExempt: boolean;
  subscriptionStatus: string | null;
};

/** Raw-row form (Supabase select shape) — used by Edge middleware / org-gate. */
export function isCanceledSubscriptionLockout(row: OrgLockoutSignalRow): boolean {
  if (row.billing_exempt_at) return false;
  return row.subscription_status === "canceled";
}

/** OrgBillingSnapshot form — used wherever a snapshot is already loaded. */
export function isSnapshotCanceledLockout(
  snapshot: OrgLockoutSignalSnapshot,
): boolean {
  if (snapshot.billingExempt) return false;
  return snapshot.subscriptionStatus === "canceled";
}

/** Dedicated route a canceled org's members are redirected to and may still reach. */
export const BILLING_CANCELED_PATH = "/billing/canceled";
