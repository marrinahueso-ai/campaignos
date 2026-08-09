import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
  testEventId,
} from "../helpers/auth";

/**
 * Smoke: Event Workspace hub + interior pages (no event-wide rail).
 */
test.describe("Event Workspace redesign paths", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    test.skip(
      !hasTestCredentials() || !testEventId(),
      "Skipped: need HEY_RALLI_TEST_EMAIL/PASSWORD and HEY_RALLI_TEST_EVENT_ID.",
    );
    page = await browser.newPage();
    await loginWithTestUser(page);
  });

  test.afterAll(async () => {
    await page?.close();
  });

  async function openEvent(
    query = "",
  ): Promise<{ eventId: string; main: Locator }> {
    const eventId = testEventId()!;
    const href = `/events/${eventId}${query}`;
    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    await expectNoBlankScreen(page);
    const main = mainContent(page);
    await expect(main).toBeVisible({ timeout: 30_000 });
    await expect(main).not.toContainText("Internal Server Error");
    await expect(main).not.toContainText("Application error");
    await expect(main).not.toContainText("Confirm access code");
    return { eventId, main };
  }

  test("default Overview loads and workspace cards navigate", async () => {
    const { eventId, main } = await openEvent();

    await expect(page).toHaveURL(new RegExp(`/events/${eventId}(?:\\?|$|#)`));
    await expect(page).not.toHaveURL(/[?&]tab=/);

    await expect(main.getByText(/back to events/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(main.getByText(/official artwork/i)).toBeVisible();
    await expect(main.getByText(/^event workspace$/i).first()).toBeVisible();
    await expect(main.getByRole("heading", { name: /^planning$/i })).toBeVisible();
    await expect(main.getByRole("heading", { name: /^approvals$/i })).toBeVisible();
    await expect(main.getByRole("heading", { name: /^volunteers$/i })).toBeVisible();
    await expect(main.getByRole("heading", { name: /^community$/i })).toBeVisible();

    await main.getByRole("heading", { name: /^approvals$/i }).click();
    await expect(page).toHaveURL(/[?&]tab=approvals/);
    await expect(page.getByTestId("event-workspace-back-to-event")).toBeVisible();
    await expect(main.getByRole("heading", { name: /^approvals$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("event-detail-tab-group-planning")).toHaveCount(0);

    await page.getByTestId("event-workspace-back-to-event").click();
    await expect(page).not.toHaveURL(/[?&]tab=/);
    await expect(main.getByText(/^event workspace$/i).first()).toBeVisible();
  });

  test("Planning shell: Tasks / Notes / Files deep links + sub-tabs", async () => {
    const { main } = await openEvent("?tab=tasks");

    await expect(page.getByTestId("event-workspace-back-to-events")).toBeVisible();
    await expect(page.getByTestId("event-workspace-back-to-event")).toHaveCount(0);
    await expect(main.getByRole("heading", { name: /^planning$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("event-detail-tab-tasks")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByTestId("event-detail-tasks-ease-panel")).toBeVisible({
      timeout: 30_000,
    });

    await page.getByTestId("event-detail-tab-notes").click();
    await expect(page).toHaveURL(/[?&]tab=notes/);
    await expect(page.getByTestId("event-detail-tab-notes")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(main.getByRole("heading", { name: /^planning$/i })).toBeVisible();

    await page.getByTestId("event-detail-tab-files").click();
    await expect(page).toHaveURL(/[?&]tab=files/);
    await expect(page.getByTestId("event-detail-tab-files")).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.getByTestId("event-workspace-back-to-events").click();
    await expect(page).toHaveURL(/\/events\/?(\?|$)/);
  });

  test("Approvals card workspace loads (content or empty)", async () => {
    const { main } = await openEvent("?tab=approvals");

    await expect(page.getByTestId("event-workspace-back-to-event")).toBeVisible();
    await expect(main.getByRole("heading", { name: /^approvals$/i })).toBeVisible({
      timeout: 30_000,
    });

    const needsReview = main.getByText(/needs your review/i);
    const allContent = main.getByText(/all event content|communication overview/i);
    const empty = main.getByText(/no content yet/i);
    const everythingReviewed = main.getByText(/everything reviewed/i);

    await expect(
      needsReview.or(allContent).or(empty).or(everythingReviewed).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("Volunteers workspace loads (connected or empty connect state)", async () => {
    const { main } = await openEvent("?tab=volunteers");

    await expect(page.getByTestId("event-workspace-back-to-event")).toBeVisible();

    const connected = main.getByRole("heading", { name: /^volunteers$/i });
    const empty = main.getByText(/no signup connected|connect signupgenius/i);
    const fully = main.getByText(/fully staffed|operational goal reached/i);
    const coverage = main.getByRole("button", { name: /^coverage$/i });

    await expect(
      connected.or(empty).or(fully).or(coverage).first(),
    ).toBeVisible({ timeout: 45_000 });

    if (await coverage.isVisible().catch(() => false)) {
      await coverage.click();
      await main.getByRole("button", { name: /^people$/i }).click();
      await main.getByRole("button", { name: /^items$/i }).click();
    }
  });

  test("Community: Team + Vendors deep links and sections", async () => {
    const { main } = await openEvent("?tab=responsibilities");

    await expect(page.getByTestId("event-workspace-back-to-event")).toBeVisible();
    await expect(main.getByRole("heading", { name: /^community$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("event-detail-tab-responsibilities")).toBeVisible();
    await expect(main.getByRole("heading", { name: /^team$/i })).toBeVisible();
    await expect(main.getByRole("heading", { name: /vendors/i })).toBeVisible();
  });

  test("Insights and Activity load inside Event shell", async () => {
    const { main } = await openEvent("?tab=insights");
    await expect(page.getByTestId("event-workspace-back-to-event")).toBeVisible();
    await expect(
      page
        .getByTestId("event-insights-panel")
        .or(page.getByTestId("event-detail-tab-insights"))
        .or(main.getByText(/insights|connect|no posts|sync/i))
        .first(),
    ).toBeVisible({ timeout: 45_000 });

    await openEvent("?tab=activity");
    await expect(page.getByTestId("event-workspace-back-to-event")).toBeVisible();
    await expect(mainContent(page)).not.toContainText("Internal Server Error");
  });

  test("Create with AI deep link still opens", async () => {
    const { main } = await openEvent("?tab=create-with-ai");
    await expect(page.getByTestId("event-detail-tab-create-with-ai")).toBeVisible({
      timeout: 30_000,
    });
    await expect(main).not.toContainText("Internal Server Error");
  });
});
