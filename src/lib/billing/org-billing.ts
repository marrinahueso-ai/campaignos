import "server-only";

import { cache } from "react";
import { DEFAULT_PAID_PLAN_TIER, periodYmUtc } from "@/lib/ai/credit-constants";
import {
  buildOrgBillingSnapshot,
  type OrgBillingSnapshot,
} from "@/lib/billing/org-billing-pure";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

export type {
  OrgBillingSnapshot,
  SubscriptionStatus,
} from "@/lib/billing/org-billing-pure";
export {
  buildOrgBillingSnapshot,
  creditAllowanceForSnapshot,
  creditTierFromSnapshot,
  formatTrialRemaining,
  orgCapacityLimit,
  orgHasFeature,
  trialEndsAtFromNow,
} from "@/lib/billing/org-billing-pure";

export const getOrgBillingSnapshot = cache(
  async (organizationId: string): Promise<OrgBillingSnapshot | null> => {
    const orgId = organizationId.trim();
    if (!orgId || !isSupabaseAdminConfigured()) return null;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .select(
        "id, billing_exempt_at, plan_tier, subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id, stripe_price_id",
      )
      .eq("id", orgId)
      .maybeSingle();

    if (error) {
      // Pre-migration: columns may be missing — fall back to exempt / professional.
      if (error.message?.includes("plan_tier") || error.code === "42703") {
        const { data: legacy } = await admin
          .from("organizations")
          .select("id, billing_exempt_at")
          .eq("id", orgId)
          .maybeSingle();
        if (!legacy) return null;
        return buildOrgBillingSnapshot({
          id: legacy.id as string,
          billing_exempt_at: legacy.billing_exempt_at as string | null,
          plan_tier: DEFAULT_PAID_PLAN_TIER,
          subscription_status: "none",
        });
      }
      console.error("[billing] org snapshot failed:", error.message);
      return null;
    }
    if (!data) return null;
    return buildOrgBillingSnapshot(
      data as Parameters<typeof buildOrgBillingSnapshot>[0],
    );
  },
);

export { periodYmUtc };
