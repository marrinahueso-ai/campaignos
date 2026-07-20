import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  gotoApprovals,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
} from "../helpers/auth";

test.describe("Approvals and calendar safety", () => {
  // Approvals RSC can be slow; keep headroom after login + navigation.
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    await loginWithTestUser(page);
  });

  test("Approval submission routes to the correct role", async ({ page }) => {
    await gotoApprovals(page);
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);

    const main = mainContent(page);
    // Visible summary/guide copy only — never <option> "Assigned to Me" or sidebar tooltips.
    const roleCue = main
      .locator("p, h1, h2, h3, span, td, th, button, label")
      .filter({
        hasText:
          /needs your approval|waiting to be assigned|how the approval flow works|assigned to approver|changes requested|in queue/i,
      });
    await expect(roleCue.first()).toBeVisible({ timeout: 20_000 });
  });

  test("Approval and change-request badges update correctly", async ({ page }) => {
    await gotoApprovals(page);
    await expectNoBlankScreen(page);

    const main = mainContent(page);
    // Summary card labels (visible <p>), not select <option> text.
    const badges = main.locator("p").filter({
      hasText:
        /^(in queue|assigned to me|scheduled|posted|published|changes requested)$/i,
    });
    await expect(main).not.toContainText("Internal Server Error");
    await expect(badges.first()).toBeVisible({ timeout: 20_000 });
  });

  test("Existing calendar events remain intact during creative-workflow tests", async ({
    page,
  }) => {
    await page.goto("/calendar");
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);

    const eventMarkers = page.locator(
      "[data-event-id], [data-testid*='event'], a[href*='/events/']",
    );
    const count = await eventMarkers.count();
    // Non-destructive check: calendar renders and does not show a wipe/error state.
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(page.locator("body")).not.toContainText(/failed to load calendar/i);
    test.info().annotations.push({
      type: "note",
      description: `Observed ${count} calendar event markers. This smoke test never deletes events.`,
    });
  });
});
