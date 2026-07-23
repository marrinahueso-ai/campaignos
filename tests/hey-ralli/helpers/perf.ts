import { expect, type Page } from "@playwright/test";
import { mainContent } from "./auth";

/** Soft-launch budget: interactive content ready in under 2s after navigation/action. */
export const PAGE_BUDGET_MS = 2_000;

export type PerfSample = {
  label: string;
  durationMs: number;
  usedJsHeapMb: number | null;
  totalJsHeapMb: number | null;
};

export async function readJsHeap(page: Page): Promise<{
  usedJsHeapMb: number | null;
  totalJsHeapMb: number | null;
}> {
  return page.evaluate(() => {
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
    };
    if (!perf.memory) {
      return { usedJsHeapMb: null, totalJsHeapMb: null };
    }
    return {
      usedJsHeapMb: Math.round((perf.memory.usedJSHeapSize / 1024 / 1024) * 10) / 10,
      totalJsHeapMb: Math.round((perf.memory.totalJSHeapSize / 1024 / 1024) * 10) / 10,
    };
  });
}

/**
 * Navigate and measure wall time until `ready` resolves.
 * Prefer ready = primary heading visible (usable page), not networkidle.
 */
export async function measureNavigation(
  page: Page,
  label: string,
  url: string,
  ready: (page: Page) => Promise<void>,
): Promise<PerfSample> {
  const started = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await ready(page);
  const durationMs = Date.now() - started;
  const heap = await readJsHeap(page);
  return { label, durationMs, ...heap };
}

/** Measure a UI action (save / submit) until `ready` resolves. */
export async function measureAction(
  page: Page,
  label: string,
  action: () => Promise<void>,
  ready: () => Promise<void>,
): Promise<PerfSample> {
  const started = Date.now();
  await action();
  await ready();
  const durationMs = Date.now() - started;
  const heap = await readJsHeap(page);
  return { label, durationMs, ...heap };
}

export function expectWithinBudget(sample: PerfSample, budgetMs = PAGE_BUDGET_MS): void {
  expect(
    sample.durationMs,
    `${sample.label} took ${sample.durationMs}ms (budget ${budgetMs}ms)` +
      (sample.usedJsHeapMb != null
        ? `; JS heap ~${sample.usedJsHeapMb}MB used / ${sample.totalJsHeapMb}MB total`
        : ""),
  ).toBeLessThanOrEqual(budgetMs);
}

export function formatSample(sample: PerfSample): string {
  const heap =
    sample.usedJsHeapMb != null
      ? ` · heap ${sample.usedJsHeapMb}/${sample.totalJsHeapMb} MB`
      : "";
  return `${sample.label}: ${sample.durationMs}ms${heap}`;
}

export async function readyHeading(
  page: Page,
  name: RegExp | string,
): Promise<void> {
  await expect(page).not.toHaveURL(/\/login/);
  await expect(
    mainContent(page).getByRole("heading", { name }).first(),
  ).toBeVisible({ timeout: PAGE_BUDGET_MS + 5_000 });
}
