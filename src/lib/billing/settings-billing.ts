import "server-only";

import { isOrganizationBillingExempt } from "@/lib/auth/founding-access";
import { paidPlanIdFromTier } from "@/lib/billing/entitlements";
import {
  getOrgBillingSnapshot,
  type OrgBillingSnapshot,
} from "@/lib/billing/org-billing";
import {
  planLabelForTier,
  PRE_STRIPE_DEFAULT_PLAN_ID,
  type PaidPlanId,
} from "@/lib/billing/plan-catalog";
import { isStripeBillingConfigured } from "@/lib/billing/stripe";
import { getLatestOrganization } from "@/lib/organizations/queries";
import type { Organization } from "@/types";

export type SettingsBillingContext = {
  organization: Organization | null;
  isFoundingPartner: boolean;
  billing: OrgBillingSnapshot | null;
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  planLabel: string;
  currentPlanId: PaidPlanId;
};

export async function getSettingsBillingContext(): Promise<SettingsBillingContext> {
  const organization = await getLatestOrganization();
  const isFoundingPartner = organization
    ? isOrganizationBillingExempt(organization)
    : false;
  const billing = organization
    ? await getOrgBillingSnapshot(organization.id)
    : null;

  const currentPlanId: PaidPlanId =
    paidPlanIdFromTier(
      billing?.trialActive
        ? "trial"
        : billing?.planTier === "starter" ||
            billing?.planTier === "professional" ||
            billing?.planTier === "premium"
          ? billing.planTier
          : PRE_STRIPE_DEFAULT_PLAN_ID,
    ) ?? PRE_STRIPE_DEFAULT_PLAN_ID;

  const planLabel = isFoundingPartner
    ? "Founding Partner"
    : billing?.trialActive
      ? "Professional (trial)"
      : billing?.trialExpired
        ? "Starter (trial ended)"
        : planLabelForTier(
            billing?.planTier === "starter" ||
              billing?.planTier === "professional" ||
              billing?.planTier === "premium"
              ? billing.planTier
              : "professional",
          );

  return {
    organization,
    isFoundingPartner,
    billing,
    stripeConfigured: isStripeBillingConfigured(),
    hasStripeCustomer: Boolean(billing?.stripeCustomerId),
    planLabel,
    currentPlanId,
  };
}
