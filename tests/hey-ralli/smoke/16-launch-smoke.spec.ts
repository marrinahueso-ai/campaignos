import { test, expect } from "@playwright/test";
import {
  expectCreateWithAiLoaded,
  expectInsightsLoaded,
  expectNoBlankScreen,
  expectTasksLoaded,
  gotoCalendar,
  gotoEventsHome,
  gotoInsights,
  gotoMetaSettings,
  gotoTasks,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
  signOutViaUi,
} from "../helpers/auth";

/**
 * Launch / pre-handoff smoke: sign-out+sign-in, core nav pages, Events Home
 * View Details regression, Create with AI Creative Setup landing.
 *
 * Does NOT exercise Meta/Google OAuth, Resend email, or Safari download.
 * Maps to launch-checklist §1.1 (sign-out/in), §5.1, §9.3, §12.2–12.6 and
 * pre-handoff §4.1–4.3 (logged-in page loads).
 */
test.describe("Launch smoke (nav + Create with AI landing)", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    await loginWithTestUser(page);
  });

  test("Sign out then sign back in lands in the app", async ({ page }) => {
    await expectNoBlankScreen(page);
    expect(page.url()).not.toContain("/login");

    await signOutViaUi(page);
    await loginWithTestUser(page);
    await expectNoBlankScreen(page);
    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("Today / dashboard, Calendar, Meta, Tasks, Insights load", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");

    await gotoCalendar(page);
    await expectNoBlankScreen(page);
    const calendarMain = mainContent(page);
    // Import entry (OAuth not required). Prefer the toolbar Import link;
    // fall back to Import list / older "Import calendar" copy.
    await expect(
      calendarMain
        .getByRole("link", { name: /^import$/i })
        .or(calendarMain.getByRole("link", { name: /import calendar/i }))
        .or(calendarMain.getByRole("button", { name: /import list/i }))
        .first(),
    ).toBeVisible();
    // Google path: settings link or import-page CTA — either proves entry exists.
    const googleOnCalendar = calendarMain.getByRole("link", {
      name: /google calendar/i,
    });
    if (await googleOnCalendar.count()) {
      await expect(googleOnCalendar.first()).toBeVisible();
    } else {
      await expect(
        calendarMain.getByRole("link", { name: /^import$/i }).first(),
      ).toHaveAttribute("href", /\/calendar\/import/);
    }

    await gotoMetaSettings(page);
    await expectNoBlankScreen(page);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    // Connected badge or Connect CTA — either is fine; do not start OAuth.
    await expect(
      page
        .getByRole("heading", { name: /facebook\s*&\s*instagram|^meta$/i })
        .or(page.getByRole("link", { name: /connect with facebook|reconnect with facebook/i }))
        .or(page.getByText(/connected for|connect once for/i))
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    await gotoTasks(page);
    await expectTasksLoaded(page);
    await expectNoBlankScreen(page);

    await gotoInsights(page);
    await expectInsightsLoaded(page);
    await expectNoBlankScreen(page);
  });

  test("Events Home shows View Details and no row kebab actions", async ({
    page,
  }) => {
    await gotoEventsHome(page);
    await expectNoBlankScreen(page);
    const main = mainContent(page);
    await expect(main).not.toContainText("Internal Server Error");

    const viewDetails = main.getByRole("link", { name: /^view details$/i });
    const count = await viewDetails.count();
    if (count === 0) {
      test.skip(true, "No events on Events Home for this test seat.");
      return;
    }

    await expect(viewDetails.first()).toBeVisible();
    // Row kebab / CampaignRowActions must not appear on Events Home list.
    await expect(
      main.getByRole("button", { name: /more actions|open menu|row actions/i }),
    ).toHaveCount(0);
    await expect(main.locator("[data-testid='campaign-row-actions']")).toHaveCount(
      0,
    );
  });

  test("Create with AI lands on Creative Setup without brand-kit banner", async ({
    page,
  }) => {
    await page.goto("/create-with-ai", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);

    // Empty hub (no events / no upload permission) is rare for the staging seat;
    // when events exist we should land in the builder on Creative Setup.
    const hubOpening = page.getByText(/opening creative setup/i);
    if (await hubOpening.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(page).toHaveURL(/\/events\/[^/]+\/campaign-builder/, {
        timeout: 45_000,
      });
    }

    if (page.url().includes("/create-with-ai")) {
      // Stay on hub only when there are no usable events — still not a choose-event list.
      const main = mainContent(page);
      await expect(main).not.toContainText(/choose an event to continue/i);
      test.info().annotations.push({
        type: "note",
        description:
          "Stayed on /create-with-ai hub (no default event). Brand-kit banner assert skipped.",
      });
      return;
    }

    await expect(page).toHaveURL(/\/events\/[^/]+\/campaign-builder/);
    await expectCreateWithAiLoaded(page);
    const main = mainContent(page);
    await expect(
      main.getByRole("heading", { name: /your creative setup/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Removed banner — do not match the "Add logos in your brand kit" helper link.
    await expect(main.getByText(/using your brand kit/i)).toHaveCount(0);

    await expect(main.getByRole("heading", { name: /^logo$/i })).toBeVisible();
    await expect(main.getByRole("heading", { name: /^colors$/i })).toBeVisible();
    await expect(
      main.getByText(/organization palette|inspiration palette|custom palette/i).first(),
    ).toBeVisible();
  });

  test("Owner /ops dashboard loads or redirects non-owners cleanly", async ({
    page,
  }) => {
    await page.goto("/ops", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");

    const onOps = /\/ops\/?$/.test(new URL(page.url()).pathname);
    if (onOps) {
      const main = mainContent(page);
      await expect(
        main.getByRole("heading", { name: /owner dashboard/i }),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        main.getByRole("heading", { name: /developers signed/i }),
      ).toBeVisible();
    } else {
      // Non-owner seats (e.g. local.developer@…) redirect to /dashboard.
      await expect(page).toHaveURL(/\/dashboard/);
      test.info().annotations.push({
        type: "note",
        description:
          "Test user cannot access /ops (redirected to dashboard). Use an Owner seat for Developers signed smoke.",
      });
    }
  });
});
