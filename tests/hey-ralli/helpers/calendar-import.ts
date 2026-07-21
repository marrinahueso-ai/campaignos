import { expect, type Locator, type Page } from "@playwright/test";
import { mainContent } from "./auth";

export type IcsEventSpec = {
  uid: string;
  summary: string;
  /** YYYY-MM-DD */
  date: string;
};

/** Format a YYYY-MM-DD date as an ICS VALUE=DATE (YYYYMMDD). */
export function toIcsDate(date: string): string {
  return date.replace(/-/g, "");
}

/** Build a minimal VCALENDAR string for upload smokes. */
export function buildIcsCalendar(events: IcsEventSpec[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hey Ralli//Calendar Import Dedupe Smoke//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTART;VALUE=DATE:${toIcsDate(event.date)}`,
      `SUMMARY:${event.summary}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

/**
 * Prefer dates in the upcoming school-year window so staging active years
 * (typically Aug–Jun) accept the rows without fighting summer rollover.
 */
export function stagingSmokeDates(runMs = Date.now()): {
  initial: string;
  updated: string;
} {
  const year = new Date(runMs).getFullYear();
  // Oct / Nov of the current calendar year (or next if already past Nov).
  const month = new Date(runMs).getMonth(); // 0-based
  const baseYear = month >= 10 ? year + 1 : year;
  return {
    initial: `${baseYear}-10-15`,
    updated: `${baseYear}-11-12`,
  };
}

export function formatDisplayDate(date: string): RegExp {
  const [y, m, d] = date.split("-").map(Number);
  const local = new Date(y!, m! - 1, d!);
  const formatted = local.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  // Escape for RegExp; allow flexible whitespace.
  const escaped = formatted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped.replace(/\s+/g, "\\s+"));
}

export async function gotoCalendarImport(page: Page): Promise<void> {
  await page.goto("/calendar/import", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page).toHaveURL(/\/calendar\/import/, { timeout: 30_000 });
  await expect(
    mainContent(page).getByRole("heading", {
      name: /import school calendar/i,
    }),
  ).toBeVisible({ timeout: 45_000 });
}

export async function uploadIcsAndAwaitReview(
  page: Page,
  icsContent: string,
  filename: string,
): Promise<void> {
  await gotoCalendarImport(page);

  const main = mainContent(page);
  const setupBlocked = main.getByText(
    /complete school setup before uploading/i,
  );
  if (await setupBlocked.isVisible().catch(() => false)) {
    throw new Error(
      "Staging org has not completed school setup — calendar import upload is blocked.",
    );
  }

  const fileInput = page.locator('input[name="calendarFile"]');
  await expect(fileInput).toBeAttached({ timeout: 15_000 });
  await fileInput.setInputFiles({
    name: filename,
    mimeType: "text/calendar",
    buffer: Buffer.from(icsContent, "utf8"),
  });

  await main.getByRole("button", { name: /upload and review dates/i }).click();

  await expect(page).toHaveURL(/\/calendar\/review\?import=/, {
    timeout: 60_000,
  });

  // ICS parse is client-triggered; wait until the spinner clears.
  const parsing = main.getByText(/reading your calendar/i);
  if (await parsing.isVisible().catch(() => false)) {
    await expect(parsing).toBeHidden({ timeout: 90_000 });
  }

  const parseFailed = main.getByText(/could not parse calendar/i);
  if (await parseFailed.isVisible().catch(() => false)) {
    const detail = (
      await main.locator("p").filter({ hasText: /.+/ }).allInnerTexts()
    ).join(" | ");
    throw new Error(`Calendar ICS parse failed in review: ${detail}`);
  }

  await expect(
    main
      .getByText(/ready to import\?/i)
      .or(main.getByText(/already on your calendar/i))
      .or(main.getByRole("heading", { name: /imported events|review imported/i }))
      .or(main.getByText(/^duplicates$/i))
      .first(),
  ).toBeVisible({ timeout: 60_000 });
}

export function reviewMain(page: Page): Locator {
  return mainContent(page);
}

export async function clickImportAll(page: Page): Promise<void> {
  const main = reviewMain(page);
  const importButton = main.getByRole("button", { name: /^import all$/i });
  await expect(importButton).toBeVisible({ timeout: 30_000 });
  await expect(importButton).toBeEnabled({ timeout: 15_000 });
  await importButton.click();
}

export async function expectReviewStatusBadge(
  page: Page,
  status: "New" | "Duplicate" | "Update" | "Conflict",
): Promise<void> {
  await expect(
    reviewMain(page).getByText(status, { exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });
}

/** Stat cards use a muted label + bold count. */
export async function expectStatCardAtLeast(
  page: Page,
  label: RegExp,
  min: number,
): Promise<void> {
  const card = reviewMain(page)
    .getByRole("button")
    .filter({ has: page.getByText(label) })
    .first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  const valueText = (await card.locator("p").nth(1).innerText()).trim();
  const value = Number(valueText);
  expect(
    Number.isFinite(value) && value >= min,
    `Expected "${label}" stat ≥ ${min}, got "${valueText}"`,
  ).toBeTruthy();
}

export async function expectEventTitleVisible(
  page: Page,
  title: string,
): Promise<void> {
  await expect(
    reviewMain(page).getByText(title, { exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * Best-effort count of an event title via calendar Import list.
 * Returns null when the Import list view cannot be opened (known flaky in
 * headed/automation runs) — callers should treat review Duplicate/skip
 * messaging as the source of truth for dedupe.
 */
export async function countEventTitleOnCalendar(
  page: Page,
  title: string,
): Promise<number | null> {
  await page.goto("/calendar", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page).not.toHaveURL(/\/login/);
  const main = mainContent(page);
  await expect(main).toBeVisible({ timeout: 45_000 });

  const importList = main.getByRole("button", { name: /import list/i });
  if (!(await importList.isVisible().catch(() => false))) {
    return null;
  }

  await importList.click({ force: true });

  const importedHeading = main.getByRole("heading", { name: /^imported\b/i });
  try {
    await expect(importedHeading).toBeVisible({ timeout: 10_000 });
  } catch {
    return null;
  }

  return main.getByRole("cell", { name: title, exact: true }).count();
}
