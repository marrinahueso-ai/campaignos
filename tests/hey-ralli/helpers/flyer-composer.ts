import type { Page } from "@playwright/test";

export const FLYER_COMPOSER_STORAGE_KEY = "hr-flyer-composer-draft";
export const FLYER_GENERATE_API = "**/api/flyer-composer/generate";
export const FLYER_BRAND_KIT_API = "**/api/flyer-composer/brand-kit";

export const SLOT_FIELD_IDS = [
  "orgName",
  "headline",
  "schoolYear",
  "location",
  "directions",
  "datesEvents",
  "bodyCopy",
  "donationTiers",
  "ctaLabel",
  "ctaUrl",
  "qrUrl",
  "qrCaption",
  "footerLine",
  "lastYearNotes",
] as const;

export type SlotFieldId = (typeof SLOT_FIELD_IDS)[number];

export const MOCK_GENERATED_SLOTS: Record<SlotFieldId, string> = {
  orgName: "Smoke Test PTA",
  headline: "Generated Semester Headline",
  schoolYear: "2026–2027",
  location: "123 Smoke Lane",
  directions: "Use the west entrance",
  datesEvents: "Jan 10 — Science Fair\nFeb 14 — Valentine Party\nMar 20 — Spring Concert",
  bodyCopy: "Generated supporting copy for parents.",
  donationTiers: "$25 — Supporter\n$100 — Champion",
  ctaLabel: "Add to calendar",
  ctaUrl: "https://example.org/smoke-calendar",
  qrUrl: "https://example.org/smoke-qr",
  qrCaption: "Scan for all dates",
  footerLine: "smoke-test.org · @SmokeTest",
  lastYearNotes: "Updated for automated smoke test.",
};

export async function openFlyerComposer(page: Page, view: "start" | "inputs" | "result" = "start") {
  await page.goto(`/create-with-ai-flyer.html?view=${view}`);
  await page.evaluate((key) => localStorage.removeItem(key), FLYER_COMPOSER_STORAGE_KEY);
  await page.reload();
  await page.waitForSelector('[data-panel="start"]');
}

export async function selectNewFlyerLetter(page: Page) {
  await page.locator('.size-btn[data-print-size="letter"]').click();
  await page.locator("#toInputs").click();
  await page.waitForSelector('[data-panel="inputs"]:not([hidden])');
}

export async function selectNewFlyerHalf(page: Page) {
  await page.locator('.size-btn[data-print-size="half"]').click();
  await page.locator("#toInputs").click();
  await page.waitForSelector('[data-panel="inputs"]:not([hidden])');
}

export async function openProvenLayoutsOptional(page: Page) {
  await page.locator("#provenOptional").evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
}

export async function selectProvenTemplate(page: Page, templateId: "semester" | "investor" | "festival") {
  await openProvenLayoutsOptional(page);
  await page.locator(`.proven-tpl[data-proven="${templateId}"]`).click();
  await page.locator("#toInputs").click();
  await page.waitForSelector('[data-panel="inputs"]:not([hidden])');
}

export async function fillAllSlotFields(
  page: Page,
  values: Partial<Record<SlotFieldId, string>> = {},
) {
  await openOptionalDetails(page);
  for (const id of SLOT_FIELD_IDS) {
    const value = values[id] ?? `Smoke ${id} ${Date.now()}`;
    await page.locator(`#slotForm #${id}`).fill(value);
  }
}

export function slotField(page: Page, id: SlotFieldId) {
  return page.locator(`#slotForm #${id}`);
}

export async function openOptionalDetails(page: Page) {
  await page.locator("#moreFlyerDetails").evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
}

export const MOCK_GENERATED_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function mockGenerateSuccess(page: Page, slots = MOCK_GENERATED_SLOTS) {
  await page.route(FLYER_GENERATE_API, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        error: null,
        imageUrl: null,
        imageBase64: MOCK_GENERATED_IMAGE,
        slots,
        aiUsed: true,
      }),
    });
  });
}

export async function mockGenerateUnauthorized(page: Page) {
  await page.route(FLYER_GENERATE_API, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: "Sign in with an active organization to generate.",
        imageUrl: null,
        imageBase64: null,
        slots: null,
        aiUsed: false,
      }),
    });
  });
}

export async function uploadStartTemplate(page: Page, name = "last-year-flyer.pdf") {
  await page.locator(".start-path[data-path='update']").click();
  await page.setInputFiles("#startFile", {
    name,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 smoke test"),
  });
}

export async function uploadInspirationPhoto(page: Page, name = "hero.jpg") {
  await page.setInputFiles("#inspFile", {
    name,
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
}

export async function goToPreview(page: Page) {
  await page.locator("#toGenerate").click();
  await page.waitForSelector('[data-panel="result"]:not([hidden])');
}
