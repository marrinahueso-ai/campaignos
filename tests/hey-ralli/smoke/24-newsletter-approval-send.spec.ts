import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
} from "../helpers/auth";

/**
 * Newsletter Approval → Send surfaces smoke.
 * Does not send production email (gate is fail-closed by default).
 */
test.describe("Newsletter workflow surfaces", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    await loginWithTestUser(page);
  });

  test("Composer Preview is last step with Send for approval (no Send export step)", async ({
    page,
  }) => {
    await page.goto("/newsletter-composer", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);

    const main = mainContent(page);
    // Step rail ends at Preview — no standalone Send step.
    await expect(main.getByText(/^preview$/i).first()).toBeVisible();
    await expect(main.getByRole("button", { name: /^send$/i })).toHaveCount(0);

    // Jump to preview if the rail is clickable; otherwise advance via next when present.
    const previewStep = main.getByRole("button", { name: /preview/i }).first();
    if (await previewStep.count()) {
      await previewStep.click();
    }

    await expect(
      main
        .getByRole("button", { name: /send for approval/i })
        .or(main.getByText(/send for approval/i))
        .first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      main
        .getByRole("button", { name: /send test/i })
        .or(main.getByText(/send test/i))
        .first(),
    ).toBeVisible();
    await expect(
      main.getByRole("button", { name: /copy email html/i }).first(),
    ).toBeVisible();
  });

  test("Newsletters list and Newsletter Contacts load under existing shell", async ({
    page,
  }) => {
    await page.goto("/newsletters", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(
      mainContent(page)
        .getByRole("heading", { name: /newsletter/i })
        .or(mainContent(page).getByText(/newsletter/i))
        .first(),
    ).toBeVisible();

    // Invented Community Communications sidebar must not appear.
    await expect(page.getByText(/community communications/i)).toHaveCount(0);

    await page.goto("/newsletter-contacts", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      mainContent(page)
        .getByRole("heading", { name: /newsletter contacts/i })
        .or(mainContent(page).getByText(/newsletter contacts/i))
        .first(),
    ).toBeVisible();
    await expect(page.getByText(/community communications/i)).toHaveCount(0);
  });

  test("Public unsubscribe page does not require login", async ({ page }) => {
    await page.goto("/newsletter/unsubscribe", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/invalid unsubscribe link/i)).toBeVisible();
  });
});
