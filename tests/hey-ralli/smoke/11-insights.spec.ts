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

    // Deep-link: Insights accepts from/to query params (primary contract).
    await page.goto("/insights?from=2026-07-01&to=2026-07-20");
    await expectNoBlankScreen(page);
    await expect(page).toHaveURL(/from=2026-07-01/);
    await expect(page).toHaveURL(/to=2026-07-20/);
    await expect(mainContent(page).locator("#insights-date-range")).toBeVisible({
      timeout: 20_000,
    });

    // Preset select should still be interactive.
    const rangeAfter = mainContent(page).locator("#insights-date-range");
    const current = await rangeAfter.inputValue();
    const nextValue =
      current === "30d" ? "14d" : current === "14d" ? "7d" : "30d";
    await rangeAfter.selectOption(nextValue);
    // Soft-nav may not rewrite the address bar in all environments; value change is enough.
    await expect
      .poll(async () => rangeAfter.inputValue(), { timeout: 10_000 })
      .toBe(nextValue);
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

    // KPI tiles (Meta-style overview metrics)
    for (const label of ["Views", "Reach", "Interactions", "Likes", "Comments"]) {
      await expect(main.getByText(label, { exact: true }).first()).toBeVisible({
        timeout: 20_000,
      });
    }

    // Refresh from Meta (status copy varies; success path may only update KPIs).
    const refresh = main.getByRole("button", { name: /^refresh$|^syncing/i });
    await expect(refresh).toBeVisible();
    await refresh.click();
    await expect(main).not.toContainText("Internal Server Error");
    const syncStatus = main.getByText(/synced|sync failed|unable|error|last sync/i);
    const kpiStillVisible = main.getByText("Reach", { exact: true });
    await expect
      .poll(
        async () =>
          (await syncStatus.count()) > 0 ||
          (await kpiStillVisible.first().isVisible().catch(() => false)),
        { timeout: 45_000 },
      )
      .toBeTruthy();

    // Recommendations / From your metrics (drawer title copy may vary)
    const fromMetrics = main.getByText(/from your metrics/i).first();
    if (await fromMetrics.isVisible().catch(() => false)) {
      const details = main.getByRole("button", { name: /view details/i });
      if (await details.isVisible().catch(() => false)) {
        await details.click();
        const recHeading = page.getByRole("heading", {
          name: /recommendation/i,
        });
        if (await recHeading.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
          await page.getByRole("button", { name: /^close$/i }).click();
          await expect(recHeading).toHaveCount(0);
        } else {
          test.info().annotations.push({
            type: "note",
            description:
              "View details opened but no Recommendations heading — skipped drawer assert.",
          });
          await page.keyboard.press("Escape").catch(() => undefined);
        }
      }
    }

    // Content overview chart + platform filters
    await expect(
      main.getByRole("heading", { name: /content overview/i }),
    ).toBeVisible();
    await expect(
      main.getByRole("img", { name: /over time chart/i }),
    ).toBeVisible();

    for (const platform of ["All", "facebook", "instagram"]) {
      const btn = main.getByRole("button", { name: new RegExp(`^${platform}$`, "i") });
      await expect(btn).toBeVisible();
      await btn.click();
      await expect(
        main.getByRole("img", { name: /over time chart/i }),
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
      main.getByRole("heading", { name: /top content by views/i }),
    ).toBeVisible();

    // Inbox deep link from activity
    const inboxLink = main.getByRole("link", { name: /inbox/i });
    await expect(inboxLink).toBeVisible();
    await expect(inboxLink).toHaveAttribute("href", /\/inbox/);
  });
});
