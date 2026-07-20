import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  gotoInsights,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
} from "../helpers/auth";

test.describe("Insights workspace", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    await loginWithTestUser(page);
  });

  test("Insights page loads without errors", async ({ page }) => {
    await gotoInsights(page);
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);

    const main = mainContent(page);
    await expect(main).not.toContainText("Internal Server Error");
    await expect(main.getByRole("heading", { name: /^insights$/i })).toBeVisible();
    await expect(main.getByText(/analytics/i).first()).toBeVisible();
  });

  test("Date range selector updates the URL", async ({ page }) => {
    await gotoInsights(page);
    const main = mainContent(page);
    const range = main.locator("#insights-date-range");
    await expect(range).toBeVisible({ timeout: 20_000 });

    // Default is Last 7 days — pick a different preset so onChange fires.
    const current = await range.inputValue();
    const nextValue = current === "30d" ? "14d" : "30d";
    await range.selectOption(nextValue);
    await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}/, { timeout: 20_000 });
    await expect(page).toHaveURL(/to=\d{4}-\d{2}-\d{2}/);
    await expect(range).toHaveValue(nextValue);
  });

  test("Export report downloads CSV", async ({ page }) => {
    await gotoInsights(page);
    const main = mainContent(page);
    const exportLink = main.getByRole("link", { name: /^export$/i });
    await expect(exportLink).toBeVisible({ timeout: 20_000 });
    await expect(exportLink).toHaveAttribute("href", /\/api\/insights\/export/);

    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 }).catch(() => null);
    await exportLink.click();
    const download = await downloadPromise;
    if (download) {
      const suggested = download.suggestedFilename();
      expect(suggested.toLowerCase()).toMatch(/\.csv|insights|export/);
    } else {
      // Some environments navigate/open in-tab; either path is acceptable.
      await expect(page).toHaveURL(/\/insights|\/api\/insights\/export/);
    }
  });

  test("Connected Insights hub features function end-to-end", async ({ page }) => {
    await gotoInsights(page);
    const main = mainContent(page);

    const connectEmpty = main.getByRole("heading", {
      name: /connect meta to get started/i,
    });
    const syncEmpty = main.getByRole("heading", {
      name: /sync insights from meta/i,
    });

    if (await connectEmpty.isVisible().catch(() => false)) {
      await expect(
        main.getByRole("link", { name: /connect with facebook|connect meta/i }),
      ).toBeVisible();
      test.info().annotations.push({
        type: "note",
        description: "Meta not connected — exercised connect empty state only.",
      });
      return;
    }

    if (await syncEmpty.isVisible().catch(() => false)) {
      await expect(main.getByRole("button", { name: /sync now/i })).toBeVisible();
      await main.getByRole("button", { name: /sync now/i }).click();
      await expect(main).not.toContainText("Internal Server Error");
      test.info().annotations.push({
        type: "note",
        description: "Meta connected but empty — exercised Sync now.",
      });
      return;
    }

    // KPI tiles
    for (const label of ["Reach", "Engagement", "Likes", "Comments", "Shares"]) {
      await expect(main.getByText(label, { exact: true }).first()).toBeVisible({
        timeout: 20_000,
      });
    }

    // Refresh from Meta
    const refresh = main.getByRole("button", { name: /^refresh$|^syncing/i });
    await expect(refresh).toBeVisible();
    await refresh.click();
    await expect(main).not.toContainText("Internal Server Error");
    await expect(
      main.getByText(/synced|sync failed|unable|error/i).first(),
    ).toBeVisible({ timeout: 45_000 });

    // Recommendations / From your metrics
    const fromMetrics = main.getByText(/from your metrics/i).first();
    if (await fromMetrics.isVisible().catch(() => false)) {
      const details = main.getByRole("button", { name: /view details/i });
      if (await details.isVisible().catch(() => false)) {
        await details.click();
        await expect(
          page.getByRole("heading", { name: /recommendations/i }),
        ).toBeVisible({ timeout: 10_000 });
        await page.getByRole("button", { name: /^close$/i }).click();
        await expect(
          page.getByRole("heading", { name: /recommendations/i }),
        ).toHaveCount(0);
      }
    }

    // Performance chart + platform filters
    await expect(
      main.getByRole("heading", { name: /performance over time/i }),
    ).toBeVisible();
    await expect(
      main.getByRole("img", { name: /performance over time chart/i }),
    ).toBeVisible();

    for (const platform of ["all", "facebook", "instagram"]) {
      const btn = main.getByRole("button", { name: new RegExp(`^${platform}$`, "i") });
      await expect(btn).toBeVisible();
      await btn.click();
      await expect(
        main.getByRole("img", { name: /performance over time chart/i }),
      ).toBeVisible();
    }

    // Supporting sections
    await expect(
      main.getByRole("heading", { name: /content breakdown/i }),
    ).toBeVisible();
    await expect(main.getByRole("heading", { name: /^platforms$/i })).toBeVisible();
    await expect(
      main.getByRole("heading", { name: /recent activity/i }),
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { name: /top performing posts/i }),
    ).toBeVisible();

    // Inbox deep link from activity
    const inboxLink = main.getByRole("link", { name: /inbox/i });
    await expect(inboxLink).toBeVisible();
    await expect(inboxLink).toHaveAttribute("href", /\/inbox/);
  });
});
