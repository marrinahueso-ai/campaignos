import "server-only";

import Stripe from "stripe";
import type { AiReserveSkuId } from "@/lib/ai/credit-constants";
import type { PaidPlanId } from "@/lib/billing/plan-catalog";

let stripeClient: Stripe | null = null;

function envPresent(name: string): boolean {
  const value = process.env[name]?.trim();
  if (!value) return false;
  // Ignore common placeholder pastes from .env.example
  if (value.endsWith("...") || value.includes("sk_test_...") || value.includes("price_...")) {
    return false;
  }
  return true;
}

/** True when Checkout can create sessions (secret + plan prices). */
export function isStripeBillingConfigured(): boolean {
  return (
    envPresent("STRIPE_SECRET_KEY") &&
    envPresent("STRIPE_PRICE_STARTER") &&
    envPresent("STRIPE_PRICE_PROFESSIONAL") &&
    envPresent("STRIPE_PRICE_PREMIUM")
  );
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2026-06-24.dahlia",
      typescript: true,
    });
  }
  return stripeClient;
}

export function stripePriceIdForPlan(planId: PaidPlanId): string | null {
  const map: Record<PaidPlanId, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL,
    premium: process.env.STRIPE_PRICE_PREMIUM,
  };
  return map[planId]?.trim() || null;
}

export function stripePriceIdForReserve(sku: AiReserveSkuId): string | null {
  const map: Record<AiReserveSkuId, string | undefined> = {
    reserve: process.env.STRIPE_PRICE_RESERVE,
    reserve_star: process.env.STRIPE_PRICE_RESERVE_STAR,
    reserve_max: process.env.STRIPE_PRICE_RESERVE_MAX,
  };
  return map[sku]?.trim() || null;
}

export function planIdFromStripePriceId(
  priceId: string | null | undefined,
): PaidPlanId | null {
  if (!priceId) return null;
  const entries: [PaidPlanId, string | undefined][] = [
    ["starter", process.env.STRIPE_PRICE_STARTER],
    ["professional", process.env.STRIPE_PRICE_PROFESSIONAL],
    ["premium", process.env.STRIPE_PRICE_PREMIUM],
  ];
  for (const [planId, envPrice] of entries) {
    if (envPrice?.trim() === priceId) return planId;
  }
  return null;
}

export function reserveSkuFromStripePriceId(
  priceId: string | null | undefined,
): AiReserveSkuId | null {
  if (!priceId) return null;
  const entries: [AiReserveSkuId, string | undefined][] = [
    ["reserve", process.env.STRIPE_PRICE_RESERVE],
    ["reserve_star", process.env.STRIPE_PRICE_RESERVE_STAR],
    ["reserve_max", process.env.STRIPE_PRICE_RESERVE_MAX],
  ];
  for (const [sku, envPrice] of entries) {
    if (envPrice?.trim() === priceId) return sku;
  }
  return null;
}

export function appBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (fromEnv) {
    return fromEnv.startsWith("http") ? fromEnv.replace(/\/$/, "") : `https://${fromEnv.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
