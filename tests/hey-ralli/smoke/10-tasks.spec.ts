import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  gotoTasks,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
} from "../helpers/auth";

test.describe("Tasks workspace (Ease)", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    await loginWithTestUser(page);
  });

  test("Tasks page loads with Team/Mine scope and Status board", async ({
    page,
  }) => {
    await gotoTasks(page);
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);

    const main = mainContent(page);
    await expect(main).not.toContainText("Internal Server Error");
    await expect(main.getByRole("heading", { name: /^tasks$/i })).toBeVisible();

    await expect(main.getByRole("group", { name: /who.s tasks/i })).toBeVisible();
    await expect(main.getByRole("group", { name: /who.s tasks/i }).getByText(/^team$/i)).toBeVisible();
    await expect(main.getByRole("group", { name: /who.s tasks/i }).getByText(/^mine$/i)).toBeVisible();

    await expect(main.getByText(/^status$/i).first()).toBeVisible();
    await expect(main.getByRole("tab", { name: /^list$/i })).toHaveCount(0);
    await expect(main.getByRole("tab", { name: /^focus$/i })).toHaveCount(0);
    await expect(main.getByRole("tab", { name: /^custom$/i })).toHaveCount(0);

    await expect(main.getByRole("button", { name: /ask ai for tasks/i })).toBeVisible();
    await expect(main.getByRole("button", { name: /^add task$/i })).toBeVisible();

    await expect(main.getByRole("tab", { name: /main table/i })).toHaveCount(0);
    await expect(main.getByRole("tab", { name: /^my tasks$/i })).toHaveCount(0);
  });

  test("Mine scope shows personal tasks without erroring", async ({ page }) => {
    await gotoTasks(page);
    const main = mainContent(page);

    await main.getByRole("group", { name: /who.s tasks/i }).getByText(/^mine$/i).click();
    await expect(page).toHaveURL(/scope=mine/);
    await expect(main).not.toContainText("Internal Server Error");

    await expect(
      main
        .getByText(/no tasks on the board|nothing assigned to you/i)
        .or(main.getByText(/^to do$/i))
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Status board renders event-linked columns", async ({ page }) => {
    await gotoTasks(page);
    const main = mainContent(page);
    await expect(main).not.toContainText("Internal Server Error");

    const emptyBoard = main.getByText(/no tasks on the board/i);
    if (await emptyBoard.isVisible().catch(() => false)) {
      await expect(emptyBoard).toBeVisible();
    } else {
      await expect(main.getByText(/^to do$/i)).toBeVisible({ timeout: 20_000 });
      await expect(main.getByText(/^done$/i)).toBeVisible();
      await expect(main.getByText(/^needs review$/i)).toBeVisible();
    }
  });

  test("Add task opens the Pilot modal", async ({ page }) => {
    await gotoTasks(page);
    const main = mainContent(page);

    await main.getByRole("button", { name: /^add task$/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByRole("heading", { name: /add a task/i })).toBeVisible();
    await expect(dialog.getByText(/tell your team what needs doing/i)).toBeVisible();
  });

  test("Opening a task shows the edit modal with notes", async ({ page }) => {
    await gotoTasks(page);
    const main = mainContent(page);

    const taskTitle = main.locator("h4").first();
    if ((await taskTitle.count()) === 0) {
      test.skip(true, "No tasks available to open in this environment.");
      return;
    }

    await taskTitle.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByLabel(/^notes$/i)).toBeVisible();
    await expect(main).not.toContainText("Internal Server Error");
  });
});
