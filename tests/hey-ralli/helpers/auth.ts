import { expect, type Locator, type Page } from "@playwright/test";

export function hasTestCredentials(): boolean {
  return Boolean(
    process.env.HEY_RALLI_TEST_EMAIL?.trim() &&
      process.env.HEY_RALLI_TEST_PASSWORD?.trim(),
  );
}

/** Main content area — avoids collapsed-sidebar tooltips matching getByText. */
export function mainContent(page: Page): Locator {
  return page.locator("main");
}

/**
 * Staging user with upload_artwork: false.
 * Also used for Mode A smoke (view_all_events + access_assigned_events_only)
 * when assigned to HEY_RALLI_TEST_EVENT_ID only.
 */
export function hasNoUploadCredentials(): boolean {
  return Boolean(
    process.env.HEY_RALLI_TEST_NO_UPLOAD_EMAIL?.trim() &&
      process.env.HEY_RALLI_TEST_NO_UPLOAD_PASSWORD?.trim(),
  );
}

export function testEventId(): string | null {
  return process.env.HEY_RALLI_TEST_EVENT_ID?.trim() || null;
}

/** Optional pending invite token for password-setup UI smoke (do not use a production invite). */
export function testInviteToken(): string | null {
  return process.env.HEY_RALLI_TEST_INVITE_TOKEN?.trim() || null;
}

async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
  });
}

export async function loginWithTestUser(page: Page): Promise<void> {
  const email = process.env.HEY_RALLI_TEST_EMAIL?.trim();
  const password = process.env.HEY_RALLI_TEST_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error(
      "Missing HEY_RALLI_TEST_EMAIL / HEY_RALLI_TEST_PASSWORD. Add them to .env.local for authenticated smoke tests.",
    );
  }
  await loginWithCredentials(page, email, password);
}

export async function loginWithNoUploadUser(page: Page): Promise<void> {
  const email = process.env.HEY_RALLI_TEST_NO_UPLOAD_EMAIL?.trim();
  const password = process.env.HEY_RALLI_TEST_NO_UPLOAD_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error(
      "Missing HEY_RALLI_TEST_NO_UPLOAD_EMAIL / HEY_RALLI_TEST_NO_UPLOAD_PASSWORD. Use a staging member with upload_artwork denied.",
    );
  }
  await loginWithCredentials(page, email, password);
}

export async function expectNoBlankScreen(page: Page): Promise<void> {
  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length, "Page body should not be blank").toBeGreaterThan(0);
  await expect(page.locator("body")).toBeVisible();
}

/** Wait until Create with AI main content is visible (ignore sidebar tooltips). */
export async function expectCreateWithAiLoaded(page: Page): Promise<void> {
  const main = mainContent(page);
  // Shell eyebrow is always present inside <main>; avoid .or() multi-match strict errors
  // and never match collapsed-sidebar "Create with AI" tooltips outside main.
  await expect(main.getByText("Creative Studio", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

/** Navigate to Approvals and wait for the hub heading (slow RSC ok). */
export async function gotoApprovals(page: Page): Promise<void> {
  await page.goto("/approvals", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expectApprovalsLoaded(page);
}

/** Wait until Approvals hub main content has loaded. */
export async function expectApprovalsLoaded(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/approvals/, { timeout: 30_000 });
  await expect(
    mainContent(page).getByRole("heading", {
      name: /approvals\s*&\s*scheduling|approvals\s+and\s+scheduling|^approvals$/i,
    }),
  ).toBeVisible({ timeout: 45_000 });
}
