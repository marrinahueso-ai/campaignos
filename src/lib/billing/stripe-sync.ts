import "server-only";

import type Stripe from "stripe";
import { grantAiReserve } from "@/lib/ai/credits";
import type { AiPlanTier } from "@/lib/ai/credit-constants";
import {
  planIdFromStripePriceId,
  reserveSkuFromStripePriceId,
} from "@/lib/billing/stripe";
import { trialEndIsoFromStripeUnix } from "@/lib/billing/trial";
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
  /** ISO timestamp from Stripe trial_end; null clears when paid/active. */
  trialEndsAt?: string | null;
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
  } else if (input.trialEndsAt !== undefined) {
    patch.trial_ends_at = input.trialEndsAt;
  }
  const { error } = await admin
    .from("organizations")
    .update(patch)
    .eq("id", input.organizationId);
  if (error) {
    console.error("[stripe-sync] org update failed:", error.message);
  }
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): string {
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
  return statusMap[status] ?? "active";
}

function planTierFromSubscription(
  subscription: Stripe.Subscription,
  priceId: string | null,
  fallbackMeta?: string | null,
): AiPlanTier {
  return (
    planIdFromStripePriceId(priceId) ??
    (fallbackMeta === "starter" ||
    fallbackMeta === "professional" ||
    fallbackMeta === "premium"
      ? fallbackMeta
      : subscription.metadata?.planId === "starter" ||
          subscription.metadata?.planId === "professional" ||
          subscription.metadata?.planId === "premium"
        ? subscription.metadata.planId
        : "professional")
  );
}

async function applyStripeSubscription(
  organizationId: string,
  subscription: Stripe.Subscription,
  customerId: string | null,
): Promise<void> {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const planTier = planTierFromSubscription(subscription, priceId);
  const subscriptionStatus = mapStripeSubscriptionStatus(subscription.status);
  const trialEndsAt = trialEndIsoFromStripeUnix(subscription.trial_end);

  await applyPlanSubscriptionToOrg({
    organizationId,
    planTier,
    subscriptionStatus,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    // Keep / sync trial window while Stripe is trialing; clear once paid.
    ...(subscriptionStatus === "trialing"
      ? { trialEndsAt, clearTrial: false }
      : subscriptionStatus === "active"
        ? { clearTrial: true }
        : trialEndsAt
          ? { trialEndsAt }
          : {}),
  });
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

    // Prefer full subscription object so trial_end / trialing status are correct.
    if (subscriptionId) {
      try {
        const { getStripe } = await import("@/lib/billing/stripe");
        const subscription =
          await getStripe().subscriptions.retrieve(subscriptionId);
        await applyStripeSubscription(orgId, subscription, customerId);
        return;
      } catch (err) {
        console.error(
          "[stripe-sync] failed to retrieve subscription after checkout:",
          err,
        );
      }
    }

    const trialDays = Number(session.metadata?.stripe_trial_days ?? "0");
    const isTrialing = Number.isFinite(trialDays) && trialDays > 0;
    await applyPlanSubscriptionToOrg({
      organizationId: orgId,
      planTier,
      subscriptionStatus: isTrialing ? "trialing" : "active",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: session.metadata?.priceId ?? null,
      clearTrial: !isTrialing,
      ...(isTrialing
        ? {
            trialEndsAt: new Date(
              Date.now() + trialDays * 24 * 60 * 60 * 1000,
            ).toISOString(),
          }
        : {}),
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

    // Stripe may retry webhooks — grant at most once per Checkout session.
    const checkoutNote = `Stripe Checkout ${session.id}`;
    const admin = createAdminClient();
    const { data: existingGrant } = await admin
      .from("organization_ai_credit_ledger")
      .select("id")
      .eq("organization_id", orgId)
      .eq("entry_type", "reserve_grant")
      .eq("note", checkoutNote)
      .maybeSingle();
    if (existingGrant?.id) {
      return;
    }

    await grantAiReserve({
      organizationId: orgId,
      sku,
      note: checkoutNote,
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

  await applyStripeSubscription(orgId, subscription, customerId);
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
