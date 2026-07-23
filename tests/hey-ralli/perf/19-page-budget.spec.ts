import { test, expect, chromium, type Browser } from "@playwright/test";
import {
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
  signOutViaUi,
} from "../helpers/auth";
import {
  PAGE_BUDGET_MS,
  expectWithinBudget,
  formatSample,
  measureAction,
  measureNavigation,
  readyHeading,
  readJsHeap,
  type PerfSample,
} from "../helpers/perf";

/**
 * Load + memory budget: each page / save should be ready in ≤ 2s.
 *
 * Prefer Production: `HEY_RALLI_BASE_URL=https://heyralli.com npm run test:hey-ralli:perf`
 * (`next dev` cold compiles inflate timings.)
 *
 * Collects ALL route samples before asserting so one slow page does not hide others.
 */
test.describe("Page load & save budget (≤ 2s)", () => {
  test.describe.configure({ timeout: 300_000 });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    await loginWithTestUser(page);
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
  });

  test("Core nav pages load within 2s (full reload)", async ({ page }) => {
    const routes: Array<{
      label: string;
      url: string;
      ready: (p: typeof page) => Promise<void>;
    }> = [
      {
        label: "Dashboard",
        url: "/dashboard",
        ready: async (p) => {
          await expect(p).not.toHaveURL(/\/login/);
          await expect(
            mainContent(p)
              .getByRole("heading")
              .or(mainContent(p).getByText(/today|what.?s next|waiting on you/i))
              .first(),
          ).toBeVisible({ timeout: 30_000 });
        },
      },
      {
        label: "Calendar",
        url: "/calendar",
        ready: async (p) => {
          await expect(
            mainContent(p)
              .getByRole("heading", { level: 1 })
              .or(mainContent(p).getByRole("link", { name: /^import$/i }))
              .first(),
          ).toBeVisible({ timeout: 30_000 });
        },
      },
      {
        label: "Events",
        url: "/events",
        ready: async (p) => {
          await expect(p).toHaveURL(/\/events/);
          await expect(
            mainContent(p)
              .getByRole("heading")
              .or(mainContent(p).getByRole("link", { name: /view details/i }))
              .first(),
          ).toBeVisible({ timeout: 30_000 });
        },
      },
      {
        label: "Tasks",
        url: "/tasks",
        ready: (p) => readyHeading(p, /^tasks$/i),
      },
      {
        label: "Approvals",
        url: "/approvals",
        ready: async (p) => {
          await expect(
            mainContent(p).getByRole("heading", { name: /approvals/i }),
          ).toBeVisible({ timeout: 30_000 });
        },
      },
      {
        label: "Insights",
        url: "/insights",
        ready: (p) => readyHeading(p, /^insights$/i),
      },
      {
        label: "Create with AI",
        url: "/create-with-ai",
        ready: async (p) => {
          await expect(p).not.toHaveURL(/\/login/);
          await expect(
            p
              .getByRole("heading", {
                name: /your creative setup|choose an event|create with ai/i,
              })
              .or(p.getByText(/creative studio|opening creative setup/i))
              .first(),
          ).toBeVisible({ timeout: 45_000 });
        },
      },
      {
        label: "Org settings",
        url: "/settings/organization",
        ready: async (p) => {
          await expect(p.locator("body")).not.toContainText(
            "Internal Server Error",
          );
          await expect(
            p
              .getByRole("heading", { name: /organization|settings|branding/i })
              .first(),
          ).toBeVisible({ timeout: 30_000 });
        },
      },
      {
        label: "Meta settings",
        url: "/settings/meta",
        ready: async (p) => {
          await expect(
            p.getByRole("heading", {
              name: /facebook\s*&\s*instagram|^meta$/i,
            }),
          ).toBeVisible({ timeout: 30_000 });
        },
      },
      {
        label: "Billing",
        url: "/settings/billing-plan",
        ready: async (p) => {
          await expect(
            p
              .getByRole("heading", { name: /billing|plan|founding/i })
              .or(p.getByText(/founding partner|your plan/i))
              .first(),
          ).toBeVisible({ timeout: 30_000 });
        },
      },
      {
        label: "Team Access",
        url: "/settings/team-access",
        ready: async (p) => {
          await expect(
            p.getByRole("heading", {
              name: /people & responsibilities|team & access/i,
            }),
          ).toBeVisible({ timeout: 30_000 });
        },
      },
    ];

    const samples: PerfSample[] = [];
    for (const route of routes) {
      const sample = await measureNavigation(
        page,
        route.label,
        route.url,
        route.ready,
      );
      samples.push(sample);
    }

    const heap = await readJsHeap(page);
    // eslint-disable-next-line no-console
    console.log("\n=== Full reload samples (budget 2000ms) ===");
    for (const sample of samples) {
      // eslint-disable-next-line no-console
      console.log(
        `${sample.durationMs <= PAGE_BUDGET_MS ? "PASS" : "FAIL"} ${formatSample(sample)}`,
      );
    }
    if (heap.usedJsHeapMb != null) {
      // eslint-disable-next-line no-console
      console.log(
        `Heap after sweep: ${heap.usedJsHeapMb} / ${heap.totalJsHeapMb} MB`,
      );
      expect(heap.usedJsHeapMb).toBeLessThan(250);
    }

    await test.info().attach("perf-full-reload.json", {
      body: JSON.stringify(samples, null, 2),
      contentType: "application/json",
    });

    const failures = samples.filter((s) => s.durationMs > PAGE_BUDGET_MS);
    expect(
      failures,
      failures.map((s) => formatSample(s)).join("\n") || "ok",
    ).toEqual([]);
  });

  test("Client-side sidebar navigations within 2s", async ({ page }) => {
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page).not.toHaveURL(/\/login/);

    const hops: Array<{ label: string; linkName: RegExp; ready: () => Promise<void> }> =
      [
        {
          label: "→ Calendar",
          linkName: /^calendar$/i,
          ready: async () => {
            await expect(page).toHaveURL(/\/calendar/);
            await expect(
              mainContent(page)
                .getByRole("heading", { level: 1 })
                .or(mainContent(page).getByRole("link", { name: /^import$/i }))
                .first(),
            ).toBeVisible({ timeout: 30_000 });
          },
        },
        {
          label: "→ Events",
          linkName: /^events$/i,
          ready: async () => {
            await expect(page).toHaveURL(/\/events/);
            await expect(
              mainContent(page).getByRole("heading").first(),
            ).toBeVisible({ timeout: 30_000 });
          },
        },
        {
          label: "→ Tasks",
          linkName: /^tasks$/i,
          ready: async () => {
            await expect(page).toHaveURL(/\/tasks/);
            await readyHeading(page, /^tasks$/i);
          },
        },
        {
          label: "→ Approvals",
          linkName: /approval/i,
          ready: async () => {
            await expect(page).toHaveURL(/\/approvals/);
            await expect(
              mainContent(page).getByRole("heading", { name: /approvals/i }),
            ).toBeVisible({ timeout: 30_000 });
          },
        },
        {
          label: "→ Insights",
          linkName: /^insights$/i,
          ready: async () => {
            await expect(page).toHaveURL(/\/insights/);
            await readyHeading(page, /^insights$/i);
          },
        },
        {
          label: "→ Dashboard",
          linkName: /^dashboard$/i,
          ready: async () => {
            await expect(page).toHaveURL(/\/dashboard/);
            await expect(
              mainContent(page)
                .getByRole("heading")
                .or(mainContent(page).getByText(/today|what.?s next/i))
                .first(),
            ).toBeVisible({ timeout: 30_000 });
          },
        },
      ];

    const samples: PerfSample[] = [];
    for (const hop of hops) {
      const link = page
        .locator("aside, nav, [data-sidebar]")
        .getByRole("link", { name: hop.linkName })
        .first();
      if ((await link.count()) === 0) {
        samples.push({
          label: `${hop.label} (link missing — skipped)`,
          durationMs: 0,
          usedJsHeapMb: null,
          totalJsHeapMb: null,
        });
        continue;
      }
      const sample = await measureAction(
        page,
        hop.label,
        async () => {
          await link.click();
        },
        hop.ready,
      );
      samples.push(sample);
    }

    // eslint-disable-next-line no-console
    console.log("\n=== Client nav samples (budget 2000ms) ===");
    for (const sample of samples) {
      if (sample.label.includes("skipped")) {
        // eslint-disable-next-line no-console
        console.log(`SKIP ${sample.label}`);
        continue;
      }
      // eslint-disable-next-line no-console
      console.log(
        `${sample.durationMs <= PAGE_BUDGET_MS ? "PASS" : "FAIL"} ${formatSample(sample)}`,
      );
    }

    await test.info().attach("perf-client-nav.json", {
      body: JSON.stringify(samples, null, 2),
      contentType: "application/json",
    });

    const failures = samples.filter(
      (s) => !s.label.includes("skipped") && s.durationMs > PAGE_BUDGET_MS,
    );
    expect(
      failures,
      failures.map((s) => formatSample(s)).join("\n") || "ok",
    ).toEqual([]);
  });

  test("Tasks New Task control responds within 2s", async ({ page }) => {
    await page.goto("/tasks", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await readyHeading(page, /^tasks$/i);
    const main = mainContent(page);
    const newTask = main.getByRole("button", { name: /new task/i }).first();
    await expect(newTask).toBeVisible({ timeout: 15_000 });

    const sample = await measureAction(
      page,
      "Tasks: click New Task → composer/chrome",
      async () => {
        await newTask.click();
      },
      async () => {
        // Dropdown, dialog, or inline row — any immediate UI response.
        await expect(
          page
            .getByRole("dialog")
            .or(page.getByRole("menu"))
            .or(main.locator("input, textarea").first())
            .or(main.getByText(/untitled|new task|task name/i))
            .first(),
        ).toBeVisible({ timeout: 10_000 });
      },
    );

    // eslint-disable-next-line no-console
    console.log(formatSample(sample));
    expectWithinBudget(sample);
  });

  test("Sign-out → sign-in within 3s of submit", async ({ page }) => {
    await signOutViaUi(page);
    const email = process.env.HEY_RALLI_TEST_EMAIL!.trim();
    const password = process.env.HEY_RALLI_TEST_PASSWORD!.trim();
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);

    const sample = await measureAction(
      page,
      "Sign-in submit → app shell",
      async () => {
        await page.getByRole("button", { name: /^sign in$/i }).click();
      },
      async () => {
        await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
          timeout: 20_000,
        });
      },
    );
    // eslint-disable-next-line no-console
    console.log(formatSample(sample));
    expectWithinBudget(sample, 3_000);
  });
});

test.describe("Concurrent load (5 parallel sessions)", () => {
  test.describe.configure({ timeout: 300_000 });

  test("Five parallel warm dashboards — report + budget", async () => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );

    const browser: Browser = await chromium.launch();
    try {
      const contexts = await Promise.all(
        Array.from({ length: 5 }, async () => {
          const context = await browser.newContext();
          const page = await context.newPage();
          await loginWithTestUser(page);
          await page.goto("/dashboard", {
            waitUntil: "domcontentloaded",
            timeout: 90_000,
          });
          return { context, page };
        }),
      );

      const results = await Promise.all(
        contexts.map(async ({ page }, index) =>
          measureNavigation(
            page,
            `Concurrent dashboard #${index + 1}`,
            "/dashboard",
            async (p) => {
              await expect(p).not.toHaveURL(/\/login/);
              await expect(
                mainContent(p)
                  .getByRole("heading")
                  .or(mainContent(p).getByText(/today|what.?s next/i))
                  .first(),
              ).toBeVisible({ timeout: 45_000 });
            },
          ),
        ),
      );

      // eslint-disable-next-line no-console
      console.log("\n=== Concurrent dashboard load ===");
      for (const sample of results) {
        // eslint-disable-next-line no-console
        console.log(
          `${sample.durationMs <= PAGE_BUDGET_MS ? "PASS" : "FAIL"} ${formatSample(sample)}`,
        );
      }

      await Promise.all(contexts.map(({ context }) => context.close()));

      const failures = results.filter((s) => s.durationMs > PAGE_BUDGET_MS);
      expect(
        failures,
        failures.map((s) => formatSample(s)).join("\n") || "ok",
      ).toEqual([]);
    } finally {
      await browser.close();
    }
  });
});
