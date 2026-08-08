import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  testInviteToken,
} from "../helpers/auth";

test.describe("Invite accept / password setup", () => {
  test("Invalid invite token shows a clear not-found state", async ({
    page,
  }) => {
    const response = await page.goto("/invite/not-a-real-invite-token");
    expect(
      response?.ok() ||
        response?.status() === 200 ||
        response?.status() === 404,
    ).toBeTruthy();
    await expectNoBlankScreen(page);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(page.getByText(/invite not found/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /go to sign in|sign in/i }).first(),
    ).toBeVisible();
  });

  test("Pending invite token shows password setup form", async ({ page }) => {
    const token = testInviteToken();
    test.skip(
      !token,
      "Skipped: set HEY_RALLI_TEST_INVITE_TOKEN to a staging pending invite token to exercise password setup UI.",
    );

    await page.goto(`/invite/${encodeURIComponent(token!)}`);
    await expectNoBlankScreen(page);
    await expect(page).toHaveURL(new RegExp(`/invite/`));
    await expect(page).toHaveURL(new RegExp(`/invite/`));
    await expectNoBlankScreen(page);

    const expired = page.getByRole("heading", { name: /invite expired/i });
    const invited = page.getByRole("heading", {
      name: /you’ve been invited|you've been invited/i,
    });
    await expect(expired.or(invited)).toBeVisible({ timeout: 20_000 });

    if (await expired.isVisible()) {
      await expect(
        page.getByRole("link", { name: /back to log in|log in/i }).first(),
      ).toBeVisible();
      return;
    }

    // New accounts: password setup. Existing accounts: sign-in CTA.
    const createPassword = page.getByLabel(/create password/i);
    if (await createPassword.isVisible()) {
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /join /i })).toBeVisible();
    } else {
      await expect(
        page.getByRole("link", { name: /sign in to join/i }),
      ).toBeVisible();
    }
  });
});
