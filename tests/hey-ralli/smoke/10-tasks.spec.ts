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

  test("Tasks page loads with Team/Mine scope and List/Status/Focus/Custom views", async ({
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

    await expect(main.getByRole("tab", { name: /^list$/i })).toBeVisible();
    await expect(main.getByRole("tab", { name: /^status$/i })).toBeVisible();
    await expect(main.getByRole("tab", { name: /^focus$/i })).toBeVisible();
    await expect(main.getByRole("tab", { name: /^custom$/i })).toBeVisible();

    await expect(main.getByRole("button", { name: /ask ai for tasks/i })).toBeVisible();
    await expect(main.getByRole("button", { name: /^add task$/i })).toBeVisible();

    // Old dense chrome is gone.
    await expect(main.getByRole("tab", { name: /main table/i })).toHaveCount(0);
    await expect(main.getByRole("tab", { name: /^my tasks$/i })).toHaveCount(0);
    await expect(main.getByRole("tab", { name: /^board$/i })).toHaveCount(0);
  });

  test("Mine scope shows a personal, event-grouped list", async ({ page }) => {
    await gotoTasks(page);
    const main = mainContent(page);

    await main.getByRole("group", { name: /who.s tasks/i }).getByText(/^mine$/i).click();
    await expect(page).toHaveURL(/scope=mine/);
    await expect(main).not.toContainText("Internal Server Error");

    // Empty or populated are both valid — surface should not error.
    await expect(
      main
        .getByText(/nothing assigned to you|no tasks yet/i)
        .or(main.locator("table"))
        .or(main.locator("article"))
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Status and Focus boards render event-linked columns", async ({ page }) => {
    await gotoTasks(page);
    const main = mainContent(page);

    await main.getByRole("tab", { name: /^status$/i }).click();
    await expect(page).toHaveURL(/view=board/);
    await expect(main).not.toContainText("Internal Server Error");

    const emptyBoard = main.getByText(/no tasks on the board/i);
    if (await emptyBoard.isVisible().catch(() => false)) {
      await expect(emptyBoard).toBeVisible();
    } else {
      await expect(main.getByText(/^to do$/i)).toBeVisible({ timeout: 20_000 });
      await expect(main.getByText(/^done$/i)).toBeVisible();
    }

    await main.getByRole("tab", { name: /^focus$/i }).click();
    await expect(page).toHaveURL(/view=focus/);
    await expect(main).not.toContainText("Internal Server Error");
    if (!(await emptyBoard.isVisible().catch(() => false))) {
      await expect(main.getByText(/^to-do$/i)).toBeVisible({ timeout: 20_000 });
      await expect(main.getByText(/^this week$/i)).toBeVisible();
      await expect(main.getByText(/^in progress$/i)).toBeVisible();
    }
  });

  test("Custom board offers a column editor", async ({ page }) => {
    await gotoTasks(page);
    const main = mainContent(page);

    await main.getByRole("tab", { name: /^custom$/i }).click();
    await expect(page).toHaveURL(/view=custom/);
    await expect(main).not.toContainText("Internal Server Error");
    await expect(main.getByRole("heading", { name: /custom board/i })).toBeVisible();
    await expect(main.getByRole("button", { name: /add column/i })).toBeVisible();
    await expect(main.getByRole("button", { name: /open board/i })).toBeVisible();
  });

  test("Opening a task shows the notes drawer", async ({ page }) => {
    await gotoTasks(page);
    const main = mainContent(page);

    const taskTitle = main
      .locator("table button strong")
      .or(main.locator("article button strong"))
      .first();
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
