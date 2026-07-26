import { test, expect } from "@playwright/test";
import { hasTestCredentials, loginWithTestUser } from "../helpers/auth";

/**
 * Shared/kiosk-computer regression guard: sign-out must clear locally
 * cached Campaign Builder drafts + artwork backups from this browser
 * (localStorage), so the next person to sign in on the same device can't
 * read a teammate's unsaved draft artwork/captions. Unrelated preference
 * keys must survive. See src/lib/campaign-builder-v2/clear-on-signout.ts.
 */
test.describe("Shared-device sign-out cleanup", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasTestCredentials(), "Needs HEY_RALLI_TEST_EMAIL/PASSWORD");
  });

  test("sign-out clears campaign-builder localStorage, leaves other keys alone", async ({
    page,
  }) => {
    await loginWithTestUser(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      localStorage.setItem(
        "campaign-builder-v2:evt-fake",
        JSON.stringify({ eventId: "evt-fake" }),
      );
      localStorage.setItem("campaign-builder-v2-artwork:evt-fake", JSON.stringify({}));
      localStorage.setItem("cos-unrelated-preference", "keep-me");
    });

    await page.getByRole("button", { name: /^sign out$/i }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/login"), {
      timeout: 20_000,
    });

    const after = await page.evaluate(() => ({
      session: localStorage.getItem("campaign-builder-v2:evt-fake"),
      artwork: localStorage.getItem("campaign-builder-v2-artwork:evt-fake"),
      unrelated: localStorage.getItem("cos-unrelated-preference"),
    }));

    expect(after.session).toBeNull();
    expect(after.artwork).toBeNull();
    expect(after.unrelated).toBe("keep-me");
  });
});
