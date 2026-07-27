/**
 * Pure Stripe payment-summary mapping (safe for unit tests — no server-only).
 */

export type StripeCardPaymentMethodLike = {
  id: string;
  type: string;
  card?: {
    brand?: string | null;
    last4?: string | null;
  } | null;
};

export type StripeCustomerPaymentLike = {
  email?: string | null;
  invoice_settings?: {
    default_payment_method?: string | StripeCardPaymentMethodLike | null;
  } | null;
};

export type DisplayPaymentSummary = {
  cardLabel: string | null;
  billingEmail: string | null;
};

export type OrgStripeBillingDisplay = DisplayPaymentSummary & {
  renewsOnLabel: string | null;
};

function titleCaseBrand(brand: string): string {
  const trimmed = brand.trim();
  if (!trimmed) return "Card";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function formatCardLabel(
  brand: string | null | undefined,
  last4: string | null | undefined,
): string | null {
  const digits = last4?.trim();
  if (!digits) return null;
  const brandLabel = titleCaseBrand(brand ?? "Card");
  return `${brandLabel} ···· ${digits}`;
}

export function mapStripePaymentToDisplay(input: {
  customer: StripeCustomerPaymentLike | null;
  fallbackPaymentMethod?: StripeCardPaymentMethodLike | null;
}): DisplayPaymentSummary {
  const customer = input.customer;
  const defaultPm = customer?.invoice_settings?.default_payment_method;
  const fromDefault =
    defaultPm && typeof defaultPm !== "string" ? defaultPm : null;
  const pm = fromDefault ?? input.fallbackPaymentMethod ?? null;
  const card = pm?.type === "card" ? pm.card : null;

  return {
    cardLabel: formatCardLabel(card?.brand, card?.last4),
    billingEmail: customer?.email?.trim() || null,
  };
}

export function formatRenewalDateLabel(unixSeconds: number | null | undefined): string | null {
  if (unixSeconds == null || !Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return null;
  }
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
