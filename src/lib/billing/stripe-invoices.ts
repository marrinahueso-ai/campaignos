import "server-only";

import { getStripe } from "@/lib/billing/stripe";
import {
  mapStripeInvoicesToDisplay,
  type DisplayInvoice,
} from "@/lib/billing/stripe-invoices-pure";

export type { DisplayInvoice } from "@/lib/billing/stripe-invoices-pure";

/**
 * Org's most recent Stripe invoices, for the Billing History tab. Uses the
 * shared Stripe client (src/lib/billing/stripe.ts) rather than a one-off
 * instance. Returns [] (and logs server-side) on any Stripe API failure —
 * never throws into the page render — and returns [] immediately for orgs
 * with no Stripe customer yet. Only the first page (`limit`) is fetched;
 * no pagination UI, which is fine for a Settings history list.
 */
export async function getOrgStripeInvoices(
  stripeCustomerId: string,
  limit = 12,
): Promise<DisplayInvoice[]> {
  const trimmed = stripeCustomerId?.trim();
  if (!trimmed) return [];

  try {
    const stripe = getStripe();
    const result = await stripe.invoices.list({
      customer: trimmed,
      limit,
    });
    return mapStripeInvoicesToDisplay(result.data);
  } catch (error) {
    console.error("[billing] failed to list Stripe invoices:", error);
    return [];
  }
}
