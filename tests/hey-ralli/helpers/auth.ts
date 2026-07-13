import { expect, type Page } from "@playwright/test";

export function hasTestCredentials(): boolean {
  return Boolean(
    process.env.HEY_RALLI_TEST_EMAIL?.trim() &&
      process.env.HEY_RALLI_TEST_PASSWORD?.trim(),
  );
}

export function testEventId(): string | null {
  return process.env.HEY_RALLI_TEST_EVENT_ID?.trim() || null;
}

export async function loginWithTestUser(page: Page): Promise<void> {
  const email = process.env.HEY_RALLI_TEST_EMAIL?.trim();
  const password = process.env.HEY_RALLI_TEST_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error(
      "Missing HEY_RALLI_TEST_EMAIL / HEY_RALLI_TEST_PASSWORD. Add them to .env.local for authenticated smoke tests.",
    );
  }

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
  });
}

export async function expectNoBlankScreen(page: Page): Promise<void> {
  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length, "Page body should not be blank").toBeGreaterThan(0);
  await expect(page.locator("body")).toBeVisible();
}
