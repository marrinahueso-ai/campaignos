import { test, expect } from "@playwright/test";
import { expectNoBlankScreen } from "../helpers/auth";

test.describe("App load", () => {
  test("The app loads without a blank screen", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok() || response?.status() === 307 || response?.status() === 302).toBeTruthy();
    await expectNoBlankScreen(page);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("A user can reach the login page", async ({ page }) => {
    await page.goto("/login");
    await expectNoBlankScreen(page);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});
