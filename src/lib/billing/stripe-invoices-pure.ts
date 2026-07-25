/**
 * Pure Stripe-invoice mapping helpers (safe for unit tests — no server-only,
 * no live Stripe client). Mirrors the capacity-usage / capacity-usage-pure
 * split: DB/Stripe-calling code (stripe-invoices.ts) delegates all mapping
 * here. Input type is a narrow structural subset of Stripe.Invoice (not the
 * SDK type itself) so tests can build fixtures without the `stripe` package.
 */

export type StripeInvoiceLike = {
  id: string;
  number: string | null;
  status: string | null;
  currency: string;
  /** Unix seconds, as returned by the Stripe API. */
  created: number;
  amount_paid: number;
  amount_due: number;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  description?: string | null;
};

export type DisplayInvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "uncollectible"
  | "void"
  | "unknown";

export type DisplayInvoice = {
  id: string;
  number: string | null;
  /** ISO timestamp. */
  createdAt: string;
  amountCents: number;
  currency: string;
  status: DisplayInvoiceStatus;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  description: string | null;
};

const KNOWN_STATUSES: readonly DisplayInvoiceStatus[] = [
  "draft",
  "open",
  "paid",
  "uncollectible",
  "void",
];

function normalizeStatus(status: string | null): DisplayInvoiceStatus {
  if (status && (KNOWN_STATUSES as readonly string[]).includes(status)) {
    return status as DisplayInvoiceStatus;
  }
  return "unknown";
}

/** Paid invoices show what was actually paid; everything else shows what's owed. */
function amountCentsForInvoice(invoice: StripeInvoiceLike): number {
  return invoice.amount_paid > 0 ? invoice.amount_paid : invoice.amount_due;
}

/** Maps a raw Stripe invoice (or a test fixture matching its shape) to the Billing History display shape. */
export function mapStripeInvoiceToDisplay(invoice: StripeInvoiceLike): DisplayInvoice {
  return {
    id: invoice.id,
    number: invoice.number ?? null,
    createdAt: new Date(invoice.created * 1000).toISOString(),
    amountCents: amountCentsForInvoice(invoice),
    currency: invoice.currency,
    status: normalizeStatus(invoice.status),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdfUrl: invoice.invoice_pdf ?? null,
    description: invoice.description ?? null,
  };
}

export function mapStripeInvoicesToDisplay(invoices: StripeInvoiceLike[]): DisplayInvoice[] {
  return invoices.map(mapStripeInvoiceToDisplay);
}

export function formatInvoiceAmount(amountCents: number, currency: string): string {
  const normalizedCurrency = currency?.trim().toUpperCase() || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
    }).format(amountCents / 100);
  } catch {
    return `$${(amountCents / 100).toFixed(2)}`;
  }
}

const STATUS_LABELS: Record<DisplayInvoiceStatus, string> = {
  draft: "Draft",
  open: "Open",
  paid: "Paid",
  uncollectible: "Uncollectible",
  void: "Void",
  unknown: "Unknown",
};

export function invoiceStatusLabel(status: DisplayInvoiceStatus): string {
  return STATUS_LABELS[status];
}

export function invoiceStatusBadgeVariant(
  status: DisplayInvoiceStatus,
): "success" | "default" | "info" | "warning" {
  if (status === "paid") return "success";
  if (status === "open") return "info";
  if (status === "uncollectible") return "warning";
  return "default";
}
