import { test, expect } from "@playwright/test";
import {
  expectApprovalsLoaded,
  expectNoBlankScreen,
  gotoApprovals,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
} from "../helpers/auth";

/** Settings shells nest multiple <main> — prefer the innermost content main. */
function contentMain(page: Parameters<typeof mainContent>[0]) {
  return page.locator("main").last();
}

/**
 * Launch checklist coverage beyond `16-launch-smoke`.
 * Maps to docs/qa/launch-checklist.md §1.2, §1.7, §2, §3 (load), §4.1 entry, §6.1, §9, §11.
 *
 * Still human: Meta/Google OAuth, Resend email, Safari download, full CwAI generate.
 */
test.describe("Launch checklist (settings / team / billing / approvals)", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    await loginWithTestUser(page);
  });

  test("Org switcher switches when the seat has multiple memberships", async ({
    page,
  }) => {
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);

    const switcher = page.getByRole("button", { name: /^organization:/i });
    if ((await switcher.count()) === 0) {
      test.skip(true, "Test seat has only one org — switcher hidden.");
      return;
    }

    const beforeLabel = (await switcher.getAttribute("aria-label")) ?? "";
    await switcher.click();
    const options = page.getByRole("option");
    await expect(options.first()).toBeVisible({ timeout: 10_000 });
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);

    let switched = false;
    for (let i = 0; i < optionCount; i++) {
      const option = options.nth(i);
      if ((await option.getAttribute("aria-selected")) === "true") continue;
      await option.click();
      await page.waitForLoadState("domcontentloaded");
      await expectNoBlankScreen(page);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator("body")).not.toContainText(
        "Internal Server Error",
      );
      await expect
        .poll(async () => {
          return (
            (await page
              .getByRole("button", { name: /^organization:/i })
              .getAttribute("aria-label")) ?? ""
          );
        }, { timeout: 30_000 })
        .not.toBe(beforeLabel);
      switched = true;
      break;
    }
    expect(switched, "Expected to switch to another organization").toBeTruthy();
  });

  test("Organization settings load; Brand CTA uses standalone path", async ({
    page,
  }) => {
    await page.goto("/settings/organization", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error",
    );

    const main = contentMain(page);
    await expect(main.getByText(/school setup wizard/i)).toHaveCount(0);

    const brandLink = page.locator('a[href*="/onboarding/brand"]').first();
    await expect(brandLink).toBeVisible({ timeout: 15_000 });
    await expect(brandLink).toHaveAttribute("href", /standalone=1/);
    await brandLink.click();
    await page.waitForLoadState("domcontentloaded");
    await expectNoBlankScreen(page);
    await expect(page).toHaveURL(/\/onboarding\/brand/);
    await expect(page).toHaveURL(/standalone=1/);
  });

  test("Team Access lists people; person profile tabs open", async ({
    page,
  }) => {
    await page.goto("/settings/team-access", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error",
    );

    if (page.url().includes("/dashboard") || page.url().includes("/login")) {
      test.skip(true, "Seat cannot open Team Access (permission gate).");
      return;
    }

    const main = contentMain(page);
    await expect(
      main.getByRole("heading", { name: "People & Responsibilities", exact: true }),
    ).toBeVisible({ timeout: 20_000 });

    // People tab may need a click if Overview is default.
    const peopleTab = main.getByRole("tab", { name: /^people$/i });
    if ((await peopleTab.count()) > 0) {
      await peopleTab.click();
    }

    const peopleLinks = page.locator('a[href*="/settings/team-access/people/"]');
    try {
      await expect
        .poll(async () => peopleLinks.count(), { timeout: 15_000 })
        .toBeGreaterThan(0);
    } catch {
      test.skip(true, "No people profile links visible for this seat.");
      return;
    }

    await peopleLinks.first().click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/settings\/team-access\/people\//);
    await expectNoBlankScreen(page);

    const profileMain = contentMain(page);
    for (const tab of ["Overview", "Events", "Access", "Activity"]) {
      const tabBtn = profileMain.getByRole("tab", {
        name: new RegExp(`^${tab}$`, "i"),
      });
      if ((await tabBtn.count()) === 0) continue;
      await tabBtn.click();
      await expect(tabBtn).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("body")).not.toContainText(
        "Internal Server Error",
      );
    }
  });

  test("Access templates panel is reachable for admins", async ({ page }) => {
    await page.goto("/settings/team-access", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error",
    );

    if (page.url().includes("/dashboard") || page.url().includes("/login")) {
      test.skip(true, "Seat cannot open Team Access (permission gate).");
      return;
    }

    const main = contentMain(page);
    const templatesControl = main
      .getByRole("tab", { name: /access templates/i })
      .or(main.getByRole("button", { name: /access templates/i }))
      .or(main.getByRole("link", { name: /access templates/i }));

    if ((await templatesControl.count()) === 0) {
      test.skip(true, "Access templates control not visible for this seat.");
      return;
    }

    await templatesControl.first().click();
    await expectNoBlankScreen(page);
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error",
    );
    await expect(
      main
        .getByText(/admin|president|developer|contributor|view only/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Approvals hub loads pending / scheduled chrome", async ({ page }) => {
    await gotoApprovals(page);
    await expectApprovalsLoaded(page);
    await expectNoBlankScreen(page);
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error",
    );
    const main = contentMain(page);
    await expect(
      main
        .getByText(/pending|scheduled|published|changes requested|no approvals/i)
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Billing plan page loads without Stripe errors", async ({ page }) => {
    await page.goto("/settings/billing-plan", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);
    const body = page.locator("body");
    await expect(body).not.toContainText("Internal Server Error");
    await expect(body).not.toContainText(/payment failed/i);
    await expect(
      page
        .getByRole("heading", { name: /billing|plan|founding/i })
        .or(page.getByText(/founding partner|your plan|billing/i))
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Calendar import entry page loads (no OAuth)", async ({ page }) => {
    await page.goto("/calendar/import", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    await expect(page).toHaveURL(/\/calendar\/import/);
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error",
    );
    const main = contentMain(page);
    await expect(
      main
        .getByRole("heading", { name: /import/i })
        .or(main.getByText(/google calendar|ics|\.ics|subscribe/i))
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Tasks page loads with New Task control", async ({ page }) => {
    await page.goto("/tasks", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);
    const main = contentMain(page);
    await expect(main.getByRole("heading", { name: /^tasks$/i })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.locator("body")).not.toContainText(
      "Internal Server Error",
    );
    await expect(
      main.getByRole("button", { name: /new task/i }).first(),
    ).toBeVisible();
    await expect(main.getByRole("tab", { name: /main table/i })).toBeVisible();
  });
});
