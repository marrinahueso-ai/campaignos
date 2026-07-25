import "server-only";

import type Stripe from "stripe";
import { grantAiReserve } from "@/lib/ai/credits";
import type { AiPlanTier } from "@/lib/ai/credit-constants";
import {
  planIdFromStripePriceId,
  reserveSkuFromStripePriceId,
} from "@/lib/billing/stripe";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

async function findOrgIdByCustomer(
  customerId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function findOrgIdByMetadata(
  metadata: Stripe.Metadata | null | undefined,
): Promise<string | null> {
  const orgId = metadata?.organizationId?.trim();
  return orgId || null;
}

export async function applyPlanSubscriptionToOrg(input: {
  organizationId: string;
  planTier: AiPlanTier;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  clearTrial?: boolean;
}): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    plan_tier: input.planTier,
    subscription_status: input.subscriptionStatus,
    stripe_customer_id: input.stripeCustomerId,
    stripe_subscription_id: input.stripeSubscriptionId,
    stripe_price_id: input.stripePriceId,
  };
  if (input.clearTrial) {
    patch.trial_ends_at = null;
  }
  const { error } = await admin
    .from("organizations")
    .update(patch)
    .eq("id", input.organizationId);
  if (error) {
    console.error("[stripe-sync] org update failed:", error.message);
  }
}

export async function handleStripeCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const orgId =
    (await findOrgIdByMetadata(session.metadata)) ||
    (typeof session.customer === "string"
      ? await findOrgIdByCustomer(session.customer)
      : null);
  if (!orgId) {
    console.warn("[stripe-sync] checkout.session.completed missing org");
    return;
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : null;

  if (session.mode === "subscription") {
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : null;
    const planFromMeta = session.metadata?.planId;
    const planTier =
      planFromMeta === "starter" ||
      planFromMeta === "professional" ||
      planFromMeta === "premium"
        ? planFromMeta
        : "professional";

    await applyPlanSubscriptionToOrg({
      organizationId: orgId,
      planTier,
      subscriptionStatus: "active",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: session.metadata?.priceId ?? null,
      clearTrial: true,
    });
    return;
  }

  if (session.mode === "payment") {
    const skuFromMeta = session.metadata?.reserveSku;
    const sku =
      skuFromMeta === "reserve" ||
      skuFromMeta === "reserve_star" ||
      skuFromMeta === "reserve_max"
        ? skuFromMeta
        : reserveSkuFromStripePriceId(session.metadata?.priceId);
    if (!sku) {
      console.warn("[stripe-sync] reserve checkout missing sku");
      return;
    }
    if (customerId) {
      const admin = createAdminClient();
      await admin
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", orgId)
        .is("stripe_customer_id", null);
    }
    await grantAiReserve({
      organizationId: orgId,
      sku,
      note: `Stripe Checkout ${session.id}`,
    });
  }
}

export async function handleStripeSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : null;
  const orgId =
    (await findOrgIdByMetadata(subscription.metadata)) ||
    (customerId ? await findOrgIdByCustomer(customerId) : null);
  if (!orgId) {
    console.warn("[stripe-sync] subscription event missing org");
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const planTier =
    planIdFromStripePriceId(priceId) ??
    (subscription.metadata?.planId === "starter" ||
    subscription.metadata?.planId === "professional" ||
    subscription.metadata?.planId === "premium"
      ? subscription.metadata.planId
      : "professional");

  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    paused: "canceled",
  };
  const subscriptionStatus = statusMap[subscription.status] ?? "active";

  await applyPlanSubscriptionToOrg({
    organizationId: orgId,
    planTier,
    subscriptionStatus,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    clearTrial: subscriptionStatus === "active",
  });
}

export async function handleStripeSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : null;
  const orgId =
    (await findOrgIdByMetadata(subscription.metadata)) ||
    (customerId ? await findOrgIdByCustomer(customerId) : null);
  if (!orgId) return;

  await applyPlanSubscriptionToOrg({
    organizationId: orgId,
    planTier: "starter",
    subscriptionStatus: "canceled",
    stripeCustomerId: customerId,
    stripeSubscriptionId: null,
    stripePriceId: null,
    clearTrial: true,
  });
}
