import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  gotoTasks,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
} from "../helpers/auth";

test.describe("Tasks workspace", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    await loginWithTestUser(page);
  });

  test("Tasks page loads with Main Table and AI generator", async ({ page }) => {
    await gotoTasks(page);
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);

    const main = mainContent(page);
    await expect(main).not.toContainText("Internal Server Error");
    await expect(
      main.getByRole("tab", { name: /main table/i }),
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { name: /ai task generator/i }),
    ).toBeVisible();
    await expect(main.getByRole("button", { name: /generate tasks/i })).toBeVisible();

    // Deferred views stay hidden.
    await expect(main.getByRole("tab", { name: /^calendar$/i })).toHaveCount(0);
    await expect(main.getByRole("tab", { name: /^timeline$/i })).toHaveCount(0);
    await expect(main.getByRole("tab", { name: /^workload$/i })).toHaveCount(0);
  });

  test("My Tasks tab opens personal view", async ({ page }) => {
    await gotoTasks(page);
    const main = mainContent(page);

    await main.getByRole("tab", { name: /my tasks/i }).click();
    await expect(page).toHaveURL(/tab=my_tasks/);
    await expect(main.getByRole("tab", { name: /my tasks/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Empty or populated are both valid — surface should not error.
    await expect(main).not.toContainText("Internal Server Error");
    await expect(
      main
        .getByText(/no tasks assigned to you|organize work|owner/i)
        .or(main.locator("table"))
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Kanban shows status and Focus board layouts", async ({ page }) => {
    await gotoTasks(page);
    const main = mainContent(page);

    await main.getByRole("tab", { name: /^kanban$/i }).click();
    await expect(page).toHaveURL(/tab=kanban/);
    await expect(main).not.toContainText("Internal Server Error");

    const emptyBoard = main.getByText(/no tasks on the board/i);
    const focusBtn = main.getByRole("button", { name: /focus board/i });

    // Empty org/access set is valid; when tasks exist, Focus board columns must render.
    if (await emptyBoard.isVisible().catch(() => false)) {
      await expect(emptyBoard).toBeVisible();
      return;
    }

    await expect(focusBtn).toBeVisible({ timeout: 20_000 });
    await focusBtn.click();
    await expect(main.getByRole("heading", { name: /^to-do$/i })).toBeVisible();
    await expect(main.getByRole("heading", { name: /^this week$/i })).toBeVisible();
    await expect(main.getByRole("heading", { name: /^in progress$/i })).toBeVisible();
    await expect(main.getByRole("heading", { name: /^done$/i })).toBeVisible();
  });

  test("Files tab routes to the Files page", async ({ page }) => {
    await gotoTasks(page);
    const main = mainContent(page);

    await main.getByRole("tab", { name: /^files$/i }).click();
    await expect(page).toHaveURL(/\/files/, { timeout: 30_000 });
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(mainContent(page)).not.toContainText("Internal Server Error");
  });
});
