import { test, expect, type Page } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
  signOutViaUi,
} from "../helpers/auth";
import {
  expectNoSecretLeaksInPage,
  expectStripeWebhookHardened,
} from "../helpers/security";
import {
  measureNavigation,
  PAGE_BUDGET_MS,
  formatSample,
  type PerfSample,
} from "../helpers/perf";

/**
 * AI credits + billing Phases 1–6: UI/UX, security, and load budgets.
 *
 * Covers:
 *   1 Metering / sidebar widget
 *   2 Soft warn / exhausted messaging
 *   3 Owner Credits tab (when allowlisted)
 *   4 Owner grant UI (when Credits tab loads)
 *   4.5 Catalog sync (marketing + settings)
 *   5 Stripe Checkout / trial / plan gates surfaces
 *   6 Hard-block copy + webhook hardening
 *
 * Requires: HEY_RALLI_TEST_EMAIL / HEY_RALLI_TEST_PASSWORD
 * Prefer Production for Stripe CTAs:
 *   HEY_RALLI_BASE_URL=https://heyralli.com npm run test:hey-ralli -- \
 *     tests/hey-ralli/smoke/21-ai-credits-billing-phases.spec.ts
 */

function contentMain(page: Page) {
  return page.locator("main").last();
}

async function gotoBilling(page: Page) {
  await page.goto("/settings/billing-plan", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page).not.toHaveURL(/\/login/);
  await expectNoBlankScreen(page);
}

test.describe("AI credits & billing — Phases 1–6", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local",
    );
    await loginWithTestUser(page);
  });

  test("Phase 1–2: sidebar AI credits widget meters balance (or unlimited)", async ({
    page,
  }) => {
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);

    const widget = page
      .getByText(/^AI credits$/i)
      .or(page.getByLabel(/AI credits/i))
      .first();
    await expect(widget).toBeVisible({ timeout: 30_000 });

    const body = page.locator("body");
    const unlimited = await body.getByText(/^Unlimited$/i).count();
    const metered = await body.getByText(/\d+\s*\/\s*\d+\s*used/i).count();
    const compact = await page.getByLabel(/AI credits:/i).count();
    expect(
      unlimited + metered + compact,
      "Expected AI credits widget (unlimited, used/allowance, or compact)",
    ).toBeGreaterThan(0);

    await expectNoSecretLeaksInPage(page);
  });

  test("Phase 4.5–5: Billing & Plan shows plan + credits honesty", async ({
    page,
  }) => {
    await gotoBilling(page);
    const main = contentMain(page);

    await expect(
      main.getByRole("heading", { name: /^billing\s*&\s*plan$/i }),
    ).toBeVisible({ timeout: 30_000 });

    await expect(
      main
        .getByText(
          /founding partner|professional|starter|premium|trial|your plan/i,
        )
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    // Credits copy should mention pause/hard-stop or unlimited — not "ships later".
    const bodyText = (await main.innerText()).toLowerCase();
    expect(bodyText).not.toContain("hard stop at 0 ships later");
    expect(
      /unlimited|ai credits|reserve|pauses when|out of ai credits|running low|soft warn/i.test(
        bodyText,
      ),
    ).toBeTruthy();

    await expect(
      main.getByRole("link", { name: /plan\s*&\s*pricing|compare plans/i }),
    ).toBeVisible();
    await expectNoSecretLeaksInPage(page);
  });

  test("Usage tab: shows AI credits, capacity usage, and recent activity sections", async ({
    page,
  }) => {
    await gotoBilling(page);
    const main = contentMain(page);

    await expect(
      main.getByRole("link", { name: /^usage$/i }),
    ).toBeVisible({ timeout: 20_000 });

    await page.goto("/settings/billing-plan?tab=usage", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);

    await expect(
      main.getByRole("heading", { name: /^billing\s*&\s*plan$/i }),
    ).toBeVisible({ timeout: 30_000 });

    await expect(
      main.getByRole("heading", { name: /^ai credits$/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      main.getByRole("heading", { name: /^capacity usage$/i }),
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { name: /^recent activity$/i }),
    ).toBeVisible();

    await expectNoSecretLeaksInPage(page);
  });

  test("Phase 4.5–5: Plan & Pricing tab catalog matches locked prices", async ({
    page,
  }) => {
    await page.goto("/settings/billing-plan?tab=plan", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    const main = contentMain(page);

    await expect(
      main.getByRole("heading", { name: /^billing\s*&\s*plan$/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      main.getByRole("link", { name: /plan\s*&\s*pricing/i, exact: false }),
    ).toBeVisible();

    const text = await main.innerText();
    expect(text).toMatch(/\$49/);
    expect(text).toMatch(/\$79/);
    expect(text).toMatch(/\$129/);
    expect(text).toMatch(/400/);
    expect(text).toMatch(/1,?200|1200/);
    expect(text).toMatch(/2,?500|2500/);
    expect(text).toMatch(/AI Reserve/i);
    expect(text).toMatch(/\$250/);

    // CTA language: trial or choose / coming soon / founding
    expect(text).toMatch(
      /start free trial|start 14-day|choose |coming soon|not required|current plan|unlimited/i,
    );

    await expectNoSecretLeaksInPage(page);
  });

  test("Phase 5: Marketing /pricing catalog + trial messaging", async ({
    page,
  }) => {
    await page.goto("/pricing", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);

    const text = await page.locator("body").innerText();
    expect(text).toMatch(/\$49/);
    expect(text).toMatch(/\$79/);
    expect(text).toMatch(/\$129/);
    expect(text).toMatch(/14.?day/i);
    expect(text).toMatch(/600/);
    expect(text).toMatch(/Premium/i);

    await expectNoSecretLeaksInPage(page);
  });

  test("Phase 5: Stripe Checkout opens for a plan when configured", async ({
    page,
  }) => {
    await page.goto("/settings/billing-plan?tab=plan", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    const main = contentMain(page);

    const comingSoon = main.getByRole("button", { name: /coming soon/i });
    if ((await comingSoon.count()) > 0 && (await comingSoon.first().isVisible())) {
      test.skip(true, "Stripe not configured on this environment");
      return;
    }

    const founding = await main.getByText(/founding partner/i).count();
    if (founding > 0) {
      test.skip(true, "Founding partner — Checkout not required");
      return;
    }

    const cta = main
      .getByRole("button", {
        name: /start free trial|start 14-day|choose (starter|professional|premium)|subscribe/i,
      })
      .first();

    if ((await cta.count()) === 0) {
      test.skip(true, "No plan Checkout CTA visible for this seat");
      return;
    }

    await expect(cta).toBeEnabled({ timeout: 10_000 });

    const popupPromise = page
      .waitForEvent("popup", { timeout: 8_000 })
      .catch(() => null);
    const navPromise = page
      .waitForURL(/checkout\.stripe\.com/, { timeout: 45_000 })
      .then(() => "nav" as const)
      .catch(() => null);

    await cta.click();
    const popup = await popupPromise;
    const nav = popup ? null : await navPromise;

    if (popup) {
      await popup.waitForURL(/checkout\.stripe\.com/, { timeout: 45_000 });
      const stripeText = await popup.locator("body").innerText();
      expect(stripeText).toMatch(/month|trial|subscribe|hey ralli/i);
      await popup.close().catch(() => undefined);
      await page.bringToFront();
    } else if (nav === "nav" || page.url().includes("checkout.stripe.com")) {
      const stripeText = await page.locator("body").innerText();
      expect(stripeText).toMatch(/month|trial|subscribe|hey ralli/i);
      // Same-tab Stripe redirect — return to app without closing the browser.
      await page.goto("/settings/billing-plan?tab=plan", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
    } else {
      const body = await page.locator("body").innerText();
      expect(body).not.toMatch(/internal server error/i);
      test.info().annotations.push({
        type: "note",
        description: `Checkout stayed in-app at ${page.url()} — check Stripe env / permissions`,
      });
    }

    if (!page.isClosed()) {
      await expectNoSecretLeaksInPage(page);
    }
  });

  test("Phase 3–4: Owner Credits tab loads or is gated", async ({ page }) => {
    await page.goto("/ops/ai-apis?tab=credits", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);

    const url = page.url();
    if (/\/login|\/dashboard|\/account\/agreements/.test(url)) {
      test.info().annotations.push({
        type: "note",
        description: `Owner Credits gated — redirected to ${url}`,
      });
      return;
    }

    const main = contentMain(page);
    const denied = main.getByText(/not authorized|access denied|forbidden/i);
    if ((await denied.count()) > 0) {
      await expect(denied.first()).toBeVisible();
      return;
    }

    await expect(
      main
        .getByRole("heading", { name: /credits|ai\s*&\s*apis/i })
        .or(main.getByText(/credit|reserve|grant|exhausted|soft/i))
        .first(),
    ).toBeVisible({ timeout: 30_000 });

    // Grant form when Owner Credits panel ships
    const grant = main.getByText(/grant|bonus|reserve|adjustment/i);
    if ((await grant.count()) > 0) {
      await expect(grant.first()).toBeVisible();
    }

    await expectNoSecretLeaksInPage(page);
  });

  test("Phase 5 gates: Ask Ralli surface loads (feature gate does not crash)", async ({
    page,
  }) => {
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page).not.toHaveURL(/\/login/);
    await expectNoBlankScreen(page);

    // Same open path as smoke/12 — pinned sidebar card.
    const openLabeled = page.getByRole("button", { name: /^ask ralli/i });
    const openCompact = page.getByRole("button", {
      name: /^hey ralli assistant$/i,
    });
    if (await openLabeled.isVisible().catch(() => false)) {
      await openLabeled.click();
    } else if (await openCompact.isVisible().catch(() => false)) {
      await openCompact.click();
    } else if (
      await page
        .getByText("Hey Ralli Assistant", { exact: true })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await page.getByText("Hey Ralli Assistant", { exact: true }).first().click();
    } else {
      test.info().annotations.push({
        type: "note",
        description:
          "Ask Ralli control hidden — valid if plan gate removes the feature",
      });
      await expect(page.locator("body")).not.toContainText(
        "Internal Server Error",
      );
      return;
    }

    const dialog = page.getByRole("dialog", { name: /hey ralli assistant/i });
    await expect(dialog).toBeVisible({ timeout: 25_000 });
    await expect(
      dialog
        .getByText(/try a question|upgrade|billing|out of ai credits|today's summary/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error",
    );
    await expectNoSecretLeaksInPage(page);
  });

  test("Phase 6 + security: Stripe webhook rejects unsigned traffic", async ({
    request,
    baseURL,
  }) => {
    await expectStripeWebhookHardened(request, baseURL ?? "http://localhost:3000");
  });

  test("Security: signed-out pricing has no secret leaks", async ({ page }) => {
    await signOutViaUi(page);
    await page.goto("/pricing", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    await expectNoSecretLeaksInPage(page);

    // Signed-out Checkout should not expose secret env; CTAs go to login or Checkout.
    const html = await page.content();
    expect(html).not.toContain("STRIPE_SECRET_KEY");
    expect(html).not.toContain("SUPABASE_SERVICE_ROLE");
  });

  test("Perf: billing surfaces ready within soft budget (report all)", async ({
    page,
  }) => {
    const samples: PerfSample[] = [];
    const routes: Array<{
      label: string;
      url: string;
      ready: (p: Page) => Promise<void>;
    }> = [
      {
        label: "Billing & Plan",
        url: "/settings/billing-plan",
        ready: async (p) => {
          await expect(
            contentMain(p).getByRole("heading", {
              name: /^billing\s*&\s*plan$/i,
            }),
          ).toBeVisible({ timeout: 45_000 });
        },
      },
      {
        label: "Plan & Pricing tab",
        url: "/settings/billing-plan?tab=plan",
        ready: async (p) => {
          await expect(
            contentMain(p).getByRole("heading", {
              name: /^billing\s*&\s*plan$/i,
            }),
          ).toBeVisible({ timeout: 45_000 });
        },
      },
      {
        label: "Pricing (marketing)",
        url: "/pricing",
        ready: async (p) => {
          await expect(p.getByText(/\$79|\$129|Premium/i).first()).toBeVisible({
            timeout: 45_000,
          });
        },
      },
    ];

    for (const route of routes) {
      samples.push(
        await measureNavigation(page, route.label, route.url, route.ready),
      );
    }

    for (const sample of samples) {
      test.info().annotations.push({
        type: "perf",
        description: `${formatSample(sample)} (soft budget ${PAGE_BUDGET_MS}ms)`,
      });
    }

    const slow = samples.filter((s) => s.durationMs > PAGE_BUDGET_MS * 3);
    // Soft report: fail only if catastrophically slow (>6s) on local/prod.
    expect(
      slow.map((s) => `${s.label}=${s.durationMs}ms`),
      "Billing pages should be interactive under 6s",
    ).toEqual([]);
  });

  test("UX: Billing navigation links are reachable", async ({ page }) => {
    await gotoBilling(page);
    const main = contentMain(page);
    const links = [
      /payment method/i,
      /billing history/i,
      /manage plan/i,
      /upgrade|downgrade/i,
      /cancel plan/i,
    ];

    for (const name of links) {
      const link = main.getByRole("link", { name }).first();
      await expect(link, `Missing billing link ${name}`).toBeVisible({
        timeout: 15_000,
      });
      await link.click();
      await expectNoBlankScreen(page);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator("body")).not.toContainText(
        "Internal Server Error",
      );
      await page.goto("/settings/billing-plan", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
    }
  });
});

test.describe("AI credits & billing — unauthenticated security", () => {
  test("Ops AI APIs is not public", async ({ page }) => {
    await page.goto("/ops/ai-apis?tab=credits", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page).toHaveURL(/\/login|\/dashboard|\/account/);
    await expectNoSecretLeaksInPage(page);
  });

  test("Webhook GET does not dump configuration", async ({ request, baseURL }) => {
    const res = await request.get(
      `${(baseURL ?? "http://localhost:3000").replace(/\/$/, "")}/api/stripe/webhook`,
    );
    const text = await res.text();
    expect(text).not.toMatch(/sk_live_|whsec_|STRIPE_SECRET/);
    expect(res.status()).not.toBe(200);
  });
});
