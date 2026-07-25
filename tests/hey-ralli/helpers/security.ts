import { expect, type Page, type APIRequestContext } from "@playwright/test";

/** Patterns that must never appear in rendered HTML or JSON error bodies. */
const SECRET_LEAK_PATTERNS: RegExp[] = [
  /\bsk_live_[A-Za-z0-9]+\b/,
  /\bsk_test_[A-Za-z0-9]+\b/,
  /\bwhsec_[A-Za-z0-9]+\b/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/, // JWT-like
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?[A-Za-z0-9._-]{20,}/i,
  /STRIPE_SECRET_KEY\s*[:=]\s*["']?sk_/i,
  /STRIPE_WEBHOOK_SECRET\s*[:=]\s*["']?whsec_/i,
];

export async function expectNoSecretLeaksInPage(page: Page): Promise<void> {
  const html = await page.content();
  for (const pattern of SECRET_LEAK_PATTERNS) {
    expect(
      pattern.test(html),
      `Page HTML must not contain secret pattern: ${pattern}`,
    ).toBe(false);
  }
  // Publishable keys are OK client-side; secret keys are not.
  expect(html).not.toMatch(/sk_live_/);
  expect(html).not.toMatch(/sk_test_/);
}

export async function expectStripeWebhookHardened(
  request: APIRequestContext,
  baseURL: string,
): Promise<void> {
  const root = baseURL.replace(/\/$/, "");
  const url = `${root}/api/stripe/webhook`;

  const getRes = await request.get(url);
  expect(
    [404, 405, 400, 503].includes(getRes.status()),
    `GET webhook should not succeed (got ${getRes.status()})`,
  ).toBeTruthy();

  const noSig = await request.post(url, {
    data: JSON.stringify({ type: "ping" }),
    headers: { "content-type": "application/json" },
  });
  expect(
    [400, 503].includes(noSig.status()),
    `POST without signature must be rejected (got ${noSig.status()})`,
  ).toBeTruthy();
  const noSigBody = await noSig.text();
  expect(noSigBody).not.toMatch(/sk_live_|sk_test_|whsec_/);

  const badSig = await request.post(url, {
    data: "{}",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "t=1,v1=deadbeef",
    },
  });
  expect(
    [400, 503].includes(badSig.status()),
    `POST with bad signature must be rejected (got ${badSig.status()})`,
  ).toBeTruthy();
  const badBody = await badSig.text();
  expect(badBody).not.toMatch(/sk_live_|sk_test_|whsec_/);
  expect(badBody.toLowerCase()).not.toContain("constructevent");
}
