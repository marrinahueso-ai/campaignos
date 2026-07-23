import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasUnsignedDeveloperCredentials,
  loginWithUnsignedDeveloper,
  mainContent,
} from "../helpers/auth";

/**
 * Developer agreements gate smoke (unsigned seat only).
 *
 * Requires env (never commit passwords):
 *   HEY_RALLI_QA_UNSIGNED_EMAIL=qa.unsigned.developer@heyralli.dev
 *   HEY_RALLI_QA_UNSIGNED_PASSWORD=…
 *
 * Skipped when those vars are missing. Does NOT countersign, Resend email,
 * or Safari download — those stay manual (docs/qa/developer-agreements.md).
 */
test.describe("Developer agreements gate", () => {
  test.describe.configure({ timeout: 90_000 });

  test("Unsigned developer is gated to Complete your developer agreements", async ({
    page,
  }) => {
    test.skip(
      !hasUnsignedDeveloperCredentials(),
      "Skipped: set HEY_RALLI_QA_UNSIGNED_EMAIL and HEY_RALLI_QA_UNSIGNED_PASSWORD in .env.local (unsigned developer seat; do not commit).",
    );

    await loginWithUnsignedDeveloper(page);
    await expectNoBlankScreen(page);

    // Middleware should send mustSign developers to /account/agreements.
    await expect(page).toHaveURL(/\/account\/agreements/, { timeout: 30_000 });
    await expect(page.locator("body")).not.toContainText("Internal Server Error");

    const shell = page.locator("body");
    await expect(
      shell.getByRole("heading", {
        name: /complete your developer agreements/i,
      }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(shell.getByText(/required agreement/i).first()).toBeVisible();

    // Visiting a protected app route should bounce back to the gate.
    await page.goto("/events", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page).toHaveURL(/\/account\/agreements/, { timeout: 30_000 });
    await expect(
      mainContent(page)
        .getByRole("heading", {
          name: /complete your developer agreements/i,
        })
        .or(
          page.getByRole("heading", {
            name: /complete your developer agreements/i,
          }),
        )
        .first(),
    ).toBeVisible();
  });
});
