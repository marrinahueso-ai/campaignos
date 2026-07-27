import "server-only";

import { isOrganizationBillingExempt } from "@/lib/auth/founding-access";
import {
  getOrgBillingSnapshot,
  type OrgBillingSnapshot,
} from "@/lib/billing/org-billing";
import {
  planLabelForTier,
  type PaidPlanId,
} from "@/lib/billing/plan-catalog";
import { isStripeBillingConfigured } from "@/lib/billing/stripe";
import { shouldAttachStripeTrial } from "@/lib/billing/trial";
import { getLatestOrganization } from "@/lib/organizations/queries";
import type { Organization } from "@/types";

export type SettingsBillingContext = {
  organization: Organization | null;
  isFoundingPartner: boolean;
  billing: OrgBillingSnapshot | null;
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  planLabel: string;
  /** Paid plan only once Stripe has a subscription; null during app-only trial. */
  currentPlanId: PaidPlanId | null;
  /** Eligible for Stripe trial_period_days on next Checkout. */
  trialEligible: boolean;
};

export async function getSettingsBillingContext(): Promise<SettingsBillingContext> {
  const organization = await getLatestOrganization();
  const isFoundingPartner = organization
    ? isOrganizationBillingExempt(organization)
    : false;
  const billing = organization
    ? await getOrgBillingSnapshot(organization.id)
    : null;

  const currentPlanId: PaidPlanId | null =
    billing?.stripeSubscriptionId &&
    (billing.planTier === "starter" ||
      billing.planTier === "professional" ||
      billing.planTier === "premium")
      ? billing.planTier
      : null;

  // Founding/exempt keeps unlimited credits + waived billing, but the label
  // still reflects the org's catalog tier so Billing Ease can show full plan chrome.
  const catalogTier =
    billing?.planTier === "starter" ||
    billing?.planTier === "professional" ||
    billing?.planTier === "premium"
      ? billing.planTier
      : "professional";
  const planLabel = billing?.trialActive
    ? billing.subscriptionStatus === "trialing" && currentPlanId
      ? `${planLabelForTier(currentPlanId)} (trial)`
      : "Professional (trial)"
    : billing?.trialExpired
      ? "Starter (trial ended)"
      : isFoundingPartner
        ? `${planLabelForTier(catalogTier)} (founding)`
        : planLabelForTier(catalogTier);

  return {
    organization,
    isFoundingPartner,
    billing,
    stripeConfigured: isStripeBillingConfigured(),
    hasStripeCustomer: Boolean(billing?.stripeCustomerId),
    planLabel,
    currentPlanId,
    trialEligible: billing != null && shouldAttachStripeTrial(billing),
  };
}
