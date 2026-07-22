import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
} from "../helpers/auth";

/**
 * Value-first onboarding smoke:
 * Welcome → create event → overlay (Calendar → Brand → Team → Meta) →
 * Helpful next steps Set up now + Later both update checklist state.
 *
 * Soft-skips when HEY_RALLI_TEST_* credentials are missing.
 */
test.describe("Value-first onboarding", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    await loginWithTestUser(page);
  });

  test("overlay and Helpful next steps Set up now / Later update both ways", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await page.goto("/settings/school-setup", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);

    const restart = page.getByRole("button", {
      name: /start from the welcome screen/i,
    });
    if (await restart.isVisible().catch(() => false)) {
      await Promise.all([
        page
          .waitForURL(/\/onboarding/, { timeout: 30_000 })
          .catch(() => undefined),
        restart.click(),
      ]);
    }
    // Force Welcome; create-event clears stale skip flags for a clean stepper.
    await page.goto("/onboarding?welcome=1", {
      waitUntil: "domcontentloaded",
    });

    await expect(
      mainContent(page).getByRole("heading", {
        name: /what event are you planning first/i,
      }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel(/onboarding progress/i)).toContainText(
      /1\.\s*Event/i,
    );

    await page.getByRole("button", { name: /create my first event/i }).click();
    await page.waitForURL(/\/events\/create/, { timeout: 30_000 });
    await expect(page).toHaveURL(/onboarding=1/);

    const stamp = Date.now();
    await page.getByLabel(/event title/i).fill(`Onboarding smoke ${stamp}`);
    const d = new Date();
    d.setDate(d.getDate() + 21);
    await page.getByLabel(/event date/i).fill(d.toISOString().slice(0, 10));
    await page.getByRole("button", { name: /save & continue/i }).click();
    await page.waitForURL(/\/events\/[^/]+/, { timeout: 60_000 });
    await expect(page).toHaveURL(/onboarding=calendar/);

    await expect(
      page.getByRole("heading", {
        name: /save hours by importing your school calendar/i,
      }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel(/onboarding progress/i)).toContainText(
      /2\.\s*Calendar/i,
    );

    // Overlay Later → Brand in place
    await page.getByRole("button", { name: /^do this later$/i }).click();
    await expect(
      page.getByRole("heading", {
        name: /make every campaign look like your school/i,
      }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/onboarding=brand/);
    await expect(page.getByLabel(/onboarding progress/i)).toContainText(
      /3\.\s*Brand/i,
    );

    // Overlay Set up now (primary) → brand page
    await page.getByRole("button", { name: /set up brand/i }).click();
    await page.waitForURL(/\/onboarding\/brand/, { timeout: 30_000 });
    await expect(
      mainContent(page).getByRole("heading", {
        name: /build your brand kit/i,
      }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /skip for now/i }).click();
    await page.waitForURL(/\/onboarding\/invite/, {
      timeout: 30_000,
    });

    await page.getByRole("button", { name: /^do this later$/i }).click();
    // Invite skip → Meta (event overlay or dedicated meta page)
    await page.waitForURL(/onboarding=meta|\/onboarding\/meta|\/settings\/meta/, {
      timeout: 30_000,
    });

    if (page.url().includes("onboarding=meta")) {
      await expect(
        page.getByRole("heading", {
          name: /connect facebook/i,
        }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByLabel(/onboarding progress/i)).toContainText(
        /5\.\s*Meta/i,
      );
      await page.getByRole("button", { name: /^do this later$/i }).click();
    } else if (page.url().includes("/onboarding/meta")) {
      await page.getByRole("button", { name: /^do this later$/i }).click();
    }

    await page.waitForURL(/\/dashboard|\/events\//, { timeout: 30_000 }).catch(
      () => undefined,
    );

    // Helpful next steps — skipped steps surface even on mature orgs
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const checklist = page.getByRole("region", { name: /helpful next steps/i });
    await expect(checklist).toBeVisible({ timeout: 45_000 });

    const calendarCard = page.locator(
      '[data-onboarding-checklist-item="calendar"]',
    );
    await expect(calendarCard).toHaveAttribute("data-done", "false");
    await expect(
      calendarCard.getByRole("link", { name: /set up now/i }),
    ).toBeVisible();

    // Later → checklist updates (done or removed once no pending remain)
    await calendarCard.getByRole("button", { name: /^later$/i }).click();
    await expect
      .poll(async () => {
        const card = page.locator(
          '[data-onboarding-checklist-item="calendar"]',
        );
        if ((await card.count()) === 0) return "gone";
        return (await card.getAttribute("data-done")) ?? "missing";
      }, { timeout: 20_000 })
      .toMatch(/^(true|gone)$/);

    // Set up now → invite route (if still pending)
    const invitePending = page.locator(
      '[data-onboarding-checklist-item="invite"][data-done="false"]',
    );
    if ((await invitePending.count()) > 0) {
      await invitePending.getByRole("link", { name: /set up now/i }).click();
      await page.waitForURL(/\/onboarding\/invite/, { timeout: 30_000 });
      await expect(
        mainContent(page).getByRole("heading", { name: /invite your team/i }),
      ).toBeVisible();
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    }

    // Dismiss any remaining pending cards via Later
    for (const id of ["brand", "invite", "meta"] as const) {
      const pendingCard = page.locator(
        `[data-onboarding-checklist-item="${id}"][data-done="false"]`,
      );
      if ((await pendingCard.count()) === 0) continue;
      await pendingCard.getByRole("button", { name: /^later$/i }).click();
      await expect
        .poll(async () => {
          const card = page.locator(
            `[data-onboarding-checklist-item="${id}"]`,
          );
          if ((await card.count()) === 0) return "gone";
          return (await card.getAttribute("data-done")) ?? "missing";
        }, { timeout: 20_000 })
        .toMatch(/^(true|gone)$/);
    }

    // Canonical calendar + single brand path (standalone from settings hides stepper)
    await page.goto("/calendar/import", { waitUntil: "domcontentloaded" });
    await expectNoBlankScreen(page);
    await expect(page).toHaveURL(/\/calendar\/import/);

    await page.goto("/onboarding/brand?standalone=1", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      mainContent(page).getByRole("heading", {
        name: /build your brand kit/i,
      }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel(/onboarding progress/i)).toHaveCount(0);

    // Get started still reachable (checklist shell, no wizard)
    await page.goto("/settings/school-setup", {
      waitUntil: "domcontentloaded",
    });
    await expectNoBlankScreen(page);
    await expect(
      page.getByRole("heading", {
        name: /helpful next steps|ready when you are|a few helpful next steps/i,
      }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
