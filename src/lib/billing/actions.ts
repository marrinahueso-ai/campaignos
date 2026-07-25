"use server";

import { requirePermission } from "@/lib/access-templates/effective-access";
import type { AiReserveSkuId } from "@/lib/ai/credit-constants";
import type { PaidPlanId } from "@/lib/billing/plan-catalog";
import { getOrgBillingSnapshot } from "@/lib/billing/org-billing";
import {
  appBaseUrl,
  getStripe,
  isStripeBillingConfigured,
  stripePriceIdForPlan,
  stripePriceIdForReserve,
} from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type BillingActionResult =
  | { success: true; url: string }
  | { success: false; error: string };

async function requireBillingOrg(): Promise<
  | {
      ok: true;
      organizationId: string;
      userId: string;
      email: string | null;
    }
  | { ok: false; error: string }
> {
  const access = await requirePermission("manage_billing");
  if ("error" in access) {
    return { ok: false, error: access.error };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  return {
    ok: true,
    organizationId: access.organizationId,
    userId: user.id,
    email: user.email ?? null,
  };
}

async function ensureStripeCustomer(input: {
  organizationId: string;
  email: string | null;
  existingCustomerId: string | null;
}): Promise<string> {
  if (input.existingCustomerId) return input.existingCustomerId;
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: input.email ?? undefined,
    metadata: { organizationId: input.organizationId },
  });
  const admin = createAdminClient();
  await admin
    .from("organizations")
    .update({ stripe_customer_id: customer.id })
    .eq("id", input.organizationId);
  return customer.id;
}

function safeReturnPath(path: string | undefined, fallback: string): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}

export async function createPlanCheckoutSession(
  planId: PaidPlanId,
  options?: { returnPath?: string },
): Promise<BillingActionResult> {
  if (!isStripeBillingConfigured()) {
    return {
      success: false,
      error: "Stripe is not configured yet. Set STRIPE_* price IDs on the server.",
    };
  }
  const ctx = await requireBillingOrg();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const priceId = stripePriceIdForPlan(planId);
  if (!priceId) {
    return { success: false, error: "Missing Stripe price for that plan." };
  }

  const snapshot = await getOrgBillingSnapshot(ctx.organizationId);
  if (snapshot?.billingExempt) {
    return {
      success: false,
      error: "Founding partner access does not need a paid subscription.",
    };
  }

  try {
    const customerId = await ensureStripeCustomer({
      organizationId: ctx.organizationId,
      email: ctx.email,
      existingCustomerId: snapshot?.stripeCustomerId ?? null,
    });
    const stripe = getStripe();
    const base = appBaseUrl();
    const returnPath = safeReturnPath(
      options?.returnPath,
      "/settings/billing-plan",
    );
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}${returnPath}${returnPath.includes("?") ? "&" : "?"}checkout=success`,
      cancel_url: `${base}${returnPath}${returnPath.includes("?") ? "&" : "?"}checkout=canceled`,
      client_reference_id: ctx.organizationId,
      metadata: {
        organizationId: ctx.organizationId,
        planId,
        priceId,
      },
      subscription_data: {
        metadata: {
          organizationId: ctx.organizationId,
          planId,
        },
      },
      allow_promotion_codes: true,
    });
    if (!session.url) {
      return { success: false, error: "Stripe did not return a checkout URL." };
    }
    return { success: true, url: session.url };
  } catch (error) {
    console.error("[billing] checkout session failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not start checkout.",
    };
  }
}

export async function createReserveCheckoutSession(
  sku: AiReserveSkuId,
  options?: { returnPath?: string },
): Promise<BillingActionResult> {
  if (!isStripeBillingConfigured()) {
    return {
      success: false,
      error: "Stripe is not configured yet. Set STRIPE_* price IDs on the server.",
    };
  }
  const priceId = stripePriceIdForReserve(sku);
  if (!priceId) {
    return {
      success: false,
      error: "Missing Stripe price for that AI Reserve package.",
    };
  }

  const ctx = await requireBillingOrg();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const snapshot = await getOrgBillingSnapshot(ctx.organizationId);
  if (snapshot?.billingExempt) {
    return {
      success: false,
      error: "Founding partners already have unlimited AI credits.",
    };
  }

  try {
    const customerId = await ensureStripeCustomer({
      organizationId: ctx.organizationId,
      email: ctx.email,
      existingCustomerId: snapshot?.stripeCustomerId ?? null,
    });
    const stripe = getStripe();
    const base = appBaseUrl();
    const returnPath = safeReturnPath(options?.returnPath, "/settings/billing-plan");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}${returnPath}${returnPath.includes("?") ? "&" : "?"}reserve=success`,
      cancel_url: `${base}${returnPath}${returnPath.includes("?") ? "&" : "?"}reserve=canceled`,
      client_reference_id: ctx.organizationId,
      metadata: {
        organizationId: ctx.organizationId,
        reserveSku: sku,
        priceId,
      },
    });
    if (!session.url) {
      return { success: false, error: "Stripe did not return a checkout URL." };
    }
    return { success: true, url: session.url };
  } catch (error) {
    console.error("[billing] reserve checkout failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not start checkout.",
    };
  }
}

export async function createBillingPortalSession(): Promise<BillingActionResult> {
  if (!isStripeBillingConfigured()) {
    return {
      success: false,
      error: "Stripe is not configured yet.",
    };
  }
  const ctx = await requireBillingOrg();
  if (!ctx.ok) return { success: false, error: ctx.error };

  const snapshot = await getOrgBillingSnapshot(ctx.organizationId);
  if (!snapshot?.stripeCustomerId) {
    return {
      success: false,
      error: "No Stripe customer yet — choose a plan first.",
    };
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: snapshot.stripeCustomerId,
      return_url: `${appBaseUrl()}/settings/billing-plan`,
    });
    return { success: true, url: session.url };
  } catch (error) {
    console.error("[billing] portal session failed:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not open the billing portal.",
    };
  }
}
