import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCardLabel,
  formatRenewalDateLabel,
  mapStripePaymentToDisplay,
} from "../stripe-payment-summary-pure.ts";

describe("stripe payment summary pure helpers", () => {
  it("formats Visa ···· last4 labels", () => {
    assert.equal(formatCardLabel("visa", "4242"), "Visa ···· 4242");
    assert.equal(formatCardLabel("mastercard", "4444"), "Mastercard ···· 4444");
    assert.equal(formatCardLabel(null, null), null);
  });

  it("prefers the default payment method on the customer", () => {
    const display = mapStripePaymentToDisplay({
      customer: {
        email: "treasurer@riversidepto.example",
        invoice_settings: {
          default_payment_method: {
            id: "pm_1",
            type: "card",
            card: { brand: "visa", last4: "4242" },
          },
        },
      },
    });
    assert.equal(display.cardLabel, "Visa ···· 4242");
    assert.equal(display.billingEmail, "treasurer@riversidepto.example");
  });

  it("falls back to the first listed card when default is unset", () => {
    const display = mapStripePaymentToDisplay({
      customer: { email: "board@school.example", invoice_settings: {} },
      fallbackPaymentMethod: {
        id: "pm_2",
        type: "card",
        card: { brand: "amex", last4: "0005" },
      },
    });
    assert.equal(display.cardLabel, "Amex ···· 0005");
    assert.equal(display.billingEmail, "board@school.example");
  });

  it("formats renewal dates in UTC month/day/year", () => {
    // 2026-08-12T00:00:00.000Z
    assert.equal(formatRenewalDateLabel(1_786_492_800), "Aug 12, 2026");
    assert.equal(formatRenewalDateLabel(null), null);
  });
});
