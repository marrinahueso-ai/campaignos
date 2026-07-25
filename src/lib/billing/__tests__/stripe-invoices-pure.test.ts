import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatInvoiceAmount,
  invoiceStatusBadgeVariant,
  invoiceStatusLabel,
  mapStripeInvoiceToDisplay,
  mapStripeInvoicesToDisplay,
  type StripeInvoiceLike,
} from "../stripe-invoices-pure.ts";

/**
 * stripe-invoices.ts itself is server-only (live Stripe client) and can't be
 * imported directly in this test runner — same constraint as gates.ts /
 * capacity-usage.ts. These pure helpers are exactly what it delegates all
 * mapping to.
 */

function invoice(overrides: Partial<StripeInvoiceLike>): StripeInvoiceLike {
  return {
    id: "in_123",
    number: "INV-0001",
    status: "paid",
    currency: "usd",
    created: 1_753_000_000,
    amount_paid: 7900,
    amount_due: 0,
    hosted_invoice_url: "https://invoice.stripe.com/i/abc",
    invoice_pdf: "https://files.stripe.com/abc.pdf",
    description: null,
    ...overrides,
  };
}

describe("mapStripeInvoiceToDisplay", () => {
  it("maps a paid invoice using amount_paid and a normalized ISO date", () => {
    const display = mapStripeInvoiceToDisplay(invoice({}));
    assert.equal(display.id, "in_123");
    assert.equal(display.number, "INV-0001");
    assert.equal(display.amountCents, 7900);
    assert.equal(display.currency, "usd");
    assert.equal(display.status, "paid");
    assert.equal(display.hostedInvoiceUrl, "https://invoice.stripe.com/i/abc");
    assert.equal(display.invoicePdfUrl, "https://files.stripe.com/abc.pdf");
    assert.equal(display.createdAt, new Date(1_753_000_000 * 1000).toISOString());
  });

  it("falls back to amount_due for unpaid invoices (open/draft/uncollectible)", () => {
    const display = mapStripeInvoiceToDisplay(
      invoice({ status: "open", amount_paid: 0, amount_due: 12900 }),
    );
    assert.equal(display.amountCents, 12900);
    assert.equal(display.status, "open");
  });

  it("normalizes null/unknown status to 'unknown' rather than passing through raw", () => {
    const display = mapStripeInvoiceToDisplay(invoice({ status: null }));
    assert.equal(display.status, "unknown");

    const weird = mapStripeInvoiceToDisplay(invoice({ status: "some_future_status" }));
    assert.equal(weird.status, "unknown");
  });

  it("handles missing hosted_invoice_url / invoice_pdf / number gracefully", () => {
    const display = mapStripeInvoiceToDisplay(
      invoice({ hosted_invoice_url: null, invoice_pdf: undefined, number: null }),
    );
    assert.equal(display.hostedInvoiceUrl, null);
    assert.equal(display.invoicePdfUrl, null);
    assert.equal(display.number, null);
  });

  it("carries through the invoice description when present", () => {
    const display = mapStripeInvoiceToDisplay(
      invoice({ description: "Hey Ralli Premium — monthly subscription" }),
    );
    assert.equal(display.description, "Hey Ralli Premium — monthly subscription");
  });
});

describe("mapStripeInvoicesToDisplay", () => {
  it("maps a list and preserves order", () => {
    const list = mapStripeInvoicesToDisplay([
      invoice({ id: "in_1" }),
      invoice({ id: "in_2" }),
    ]);
    assert.deepEqual(list.map((i) => i.id), ["in_1", "in_2"]);
  });

  it("returns [] for an empty list", () => {
    assert.deepEqual(mapStripeInvoicesToDisplay([]), []);
  });
});

describe("formatInvoiceAmount", () => {
  it("formats cents as a USD currency string", () => {
    assert.equal(formatInvoiceAmount(7900, "usd"), "$79.00");
  });

  it("uppercases a lowercase currency code before formatting", () => {
    assert.equal(formatInvoiceAmount(100, "usd"), "$1.00");
  });

  it("falls back to a plain $ string for an unrecognized currency", () => {
    assert.equal(formatInvoiceAmount(500, "not-a-currency"), "$5.00");
  });
});

describe("invoiceStatusLabel / invoiceStatusBadgeVariant", () => {
  it("labels every known status distinctly", () => {
    assert.equal(invoiceStatusLabel("paid"), "Paid");
    assert.equal(invoiceStatusLabel("open"), "Open");
    assert.equal(invoiceStatusLabel("draft"), "Draft");
    assert.equal(invoiceStatusLabel("uncollectible"), "Uncollectible");
    assert.equal(invoiceStatusLabel("void"), "Void");
    assert.equal(invoiceStatusLabel("unknown"), "Unknown");
  });

  it("maps paid to success, open to info, uncollectible to warning, others to default", () => {
    assert.equal(invoiceStatusBadgeVariant("paid"), "success");
    assert.equal(invoiceStatusBadgeVariant("open"), "info");
    assert.equal(invoiceStatusBadgeVariant("uncollectible"), "warning");
    assert.equal(invoiceStatusBadgeVariant("draft"), "default");
    assert.equal(invoiceStatusBadgeVariant("void"), "default");
    assert.equal(invoiceStatusBadgeVariant("unknown"), "default");
  });
});
