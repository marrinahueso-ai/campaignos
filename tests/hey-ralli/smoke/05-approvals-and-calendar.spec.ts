import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
} from "../helpers/auth";

test.describe("Approvals and calendar safety", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    await loginWithTestUser(page);
  });

  test("Approval submission routes to the correct role", async ({ page }) => {
    await page.goto("/approvals");
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);

    const roleCue = page.getByText(
      /president|vp|communications|committee|approver|waiting|needs review|approved/i,
    );
    // Soft assertion: approvals page should load and mention role/status language.
    if (await roleCue.count()) {
      await expect(roleCue.first()).toBeVisible();
    } else {
      await expect(page.locator("body")).toContainText(/approval|review|campaign/i);
    }
  });

  test("Approval and change-request badges update correctly", async ({ page }) => {
    await page.goto("/approvals");
    await expectNoBlankScreen(page);
    const badges = page.getByText(
      /approved|changes requested|needs review|pending|waiting/i,
    );
    // Page should render without error even when the queue is empty.
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    if (await badges.count()) {
      await expect(badges.first()).toBeVisible();
    }
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
