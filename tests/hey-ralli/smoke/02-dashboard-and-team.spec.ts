import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
} from "../helpers/auth";

test.describe("Authenticated navigation", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local (use a staging/test account only).",
    );
    await loginWithTestUser(page);
  });

  test("A test user can log in using environment-based test credentials", async ({
    page,
  }) => {
    await expectNoBlankScreen(page);
    expect(page.url()).not.toContain("/login");
  });

  test("Dashboard navigation loads", async ({ page }) => {
    await page.goto("/dashboard");
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("Team & Access loads", async ({ page }) => {
    await page.goto("/settings/team-access");
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(
      mainContent(page).getByRole("heading", {
        name: /people & responsibilities|team & access/i,
      }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
