import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasNoUploadCredentials,
  loginWithNoUploadUser,
  mainContent,
  testEventId,
} from "../helpers/auth";

/**
 * Phase B Mode A: view all event cards, work only on assigned events.
 *
 * Uses HEY_RALLI_TEST_NO_UPLOAD_* (staging seat with access template
 * view_all_events + access_assigned_events_only, assigned to HEY_RALLI_TEST_EVENT_ID).
 */
test.describe("Mode A assigned-event access", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasNoUploadCredentials(),
      "Skipped: set HEY_RALLI_TEST_NO_UPLOAD_EMAIL and HEY_RALLI_TEST_NO_UPLOAD_PASSWORD (Mode A + no-upload seat).",
    );
    test.skip(
      !testEventId(),
      "Skipped: set HEY_RALLI_TEST_EVENT_ID to the single event assigned to the Mode A seat.",
    );
    await loginWithNoUploadUser(page);
  });

  test("sees all event cards but can only open the assigned event", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const assignedId = testEventId()!;

    await page.goto("/events", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);

    const main = mainContent(page);
    const eventLinks = main.locator('a[href^="/events/"]');
    await expect(eventLinks.first()).toBeVisible({ timeout: 60_000 });

    // Ignore /events/create and other non-id routes; only real event UUID cards.
    const eventIdPath =
      /^\/events\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
    const hrefs = await eventLinks.evaluateAll((anchors) =>
      anchors.map((a) => a.getAttribute("href") || ""),
    );
    const uniqueIds = [
      ...new Set(
        hrefs
          .map((href) => href.split("?")[0] ?? "")
          .map((href) => eventIdPath.exec(href)?.[1])
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    expect(
      uniqueIds.length,
      "Mode A should list more than one event card (view_all_events)",
    ).toBeGreaterThan(1);

    const unassignedId = uniqueIds.find((id) => id !== assignedId);
    expect(
      unassignedId,
      "Events list should include at least one event not assigned to this seat",
    ).toBeTruthy();

    // Assigned event: deep link works (getEventById succeeds).
    await page.goto(`/events/${assignedId}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectNoBlankScreen(page);
    await expect(page).toHaveURL(new RegExp(`/events/${assignedId}`));
    await expect(page.locator("body")).not.toContainText(
      /this page could not be found/i,
    );
    // Event workspace should render a real heading / shell, not a 404.
    await expect(
      mainContent(page)
        .getByRole("heading")
        .or(mainContent(page).getByText(/stock the fridge|overview|planning/i))
        .first(),
    ).toBeVisible({ timeout: 60_000 });

    // Unassigned event: getEventById returns null → notFound().
    // App Router may still report HTTP 200 while streaming; assert final UI.
    await page.goto(`/events/${unassignedId}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expectNoBlankScreen(page);
    await expect(page.locator("body")).toContainText(
      /this page could not be found/i,
      { timeout: 60_000 },
    );
  });
});
