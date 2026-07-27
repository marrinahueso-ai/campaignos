import "server-only";

import { getStripe } from "@/lib/billing/stripe";
import {
  formatRenewalDateLabel,
  mapStripePaymentToDisplay,
  type OrgStripeBillingDisplay,
} from "@/lib/billing/stripe-payment-summary-pure";

export type {
  DisplayPaymentSummary,
  OrgStripeBillingDisplay,
} from "@/lib/billing/stripe-payment-summary-pure";

/**
 * Card on file + billing email + renewal date from Stripe.
 * Returns nulls (never throws) when Stripe is unavailable or the customer
 * has no payment method yet — Settings Ease shows honest empty copy.
 */
export async function getOrgStripeBillingDisplay(input: {
  stripeCustomerId: string | null | undefined;
  stripeSubscriptionId: string | null | undefined;
}): Promise<OrgStripeBillingDisplay> {
  const customerId = input.stripeCustomerId?.trim() || null;
  const subscriptionId = input.stripeSubscriptionId?.trim() || null;

  if (!customerId) {
    return { cardLabel: null, billingEmail: null, renewsOnLabel: null };
  }

  try {
    const stripe = getStripe();
    const [customer, paymentMethods, subscription] = await Promise.all([
      stripe.customers.retrieve(customerId, {
        expand: ["invoice_settings.default_payment_method"],
      }),
      stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      }),
      subscriptionId
        ? stripe.subscriptions.retrieve(subscriptionId)
        : Promise.resolve(null),
    ]);

    if (customer.deleted) {
      return { cardLabel: null, billingEmail: null, renewsOnLabel: null };
    }

    const payment = mapStripePaymentToDisplay({
      customer,
      fallbackPaymentMethod: paymentMethods.data[0] ?? null,
    });

    const periodEnd =
      subscription && !("deleted" in subscription && subscription.deleted)
        ? // Stripe API versions differ: prefer top-level, then first item.
          ((subscription as { current_period_end?: number }).current_period_end ??
            (
              subscription as {
                items?: { data?: Array<{ current_period_end?: number }> };
              }
            ).items?.data?.[0]?.current_period_end ??
            null)
        : null;

    return {
      ...payment,
      renewsOnLabel: formatRenewalDateLabel(periodEnd),
    };
  } catch (error) {
    console.error("[billing] failed to load Stripe payment summary:", error);
    return { cardLabel: null, billingEmail: null, renewsOnLabel: null };
  }
}
