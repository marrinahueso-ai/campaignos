import { test, expect } from "@playwright/test";
import {
  FLYER_BRAND_KIT_API,
  FLYER_GENERATE_API,
  MOCK_GENERATED_IMAGE,
  MOCK_GENERATED_SLOTS,
  SLOT_FIELD_IDS,
  fillAllSlotFields,
  goToPreview,
  mockGenerateSuccess,
  mockGenerateUnauthorized,
  openFlyerComposer,
  openOptionalDetails,
  openProvenLayoutsOptional,
  selectNewFlyerLetter,
  selectProvenTemplate,
  slotField,
  uploadInspirationPhoto,
  uploadStartTemplate,
} from "../helpers/flyer-composer";

/**
 * Flyer composer AI direction smoke — every Start/Inspiration/Preview control
 * that feeds Generate, with mocked /api/flyer-composer/generate (no OpenAI in CI).
 *
 * Run: npm run test:hey-ralli -- tests/hey-ralli/smoke/23-flyer-composer-direction.spec.ts
 * Unit: npm run test:flyer-composer
 */
test.describe("Flyer composer AI direction smoke", () => {
  test.beforeEach(async ({ page }) => {
    await openFlyerComposer(page, "start");
    await expect(page.locator("body")).not.toContainText(/Oak Park|Riverside|Panthers/i);
  });

  test("Start paths: update upload, new sizes, optional proven layouts, stepper", async ({
    page,
  }) => {
    // Primary paths visible; proven layouts collapsed by default
    await expect(page.locator('.start-path[data-path="update"]')).toBeVisible();
    await expect(page.locator('.start-path[data-path="new"]')).toBeVisible();
    await expect(page.locator("#provenOptional")).not.toHaveAttribute("open", "");

    // Update last year: upload, replace, remove, continue
    await uploadStartTemplate(page);
    await expect(page.locator("#startUpload")).toHaveClass(/has/);
    await expect(page.locator("#startUploadActions")).toBeVisible();
    await page.locator("#startUploadReplace").click();
    await page.setInputFiles("#startFile", {
      name: "replaced-flyer.png",
      mimeType: "image/png",
      buffer: Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]),
    });
    await expect(page.locator("#startUpload")).toHaveClass(/has/);
    await page.locator("#startUploadRemove").click();
    await expect(page.locator("#startUploadActions")).toBeHidden();

    // New flyer sizes (primary path)
    await page.locator('.size-btn[data-print-size="letter"]').click();
    await expect(page.locator("#toInputs")).toBeEnabled();
    await page.locator("#toInputs").click();
    await expect(page.locator("#selectedTplName")).toContainText(/letter/i);

    await page.locator('.step-btn[data-view="start"]').click();
    await page.locator('.size-btn[data-print-size="half"]').click();
    await page.locator("#toInputs").click();
    await expect(page.locator("#selectedTplName")).toContainText(/half/i);

    // Optional proven layouts behind collapsed control
    await page.locator('.step-btn[data-view="start"]').click();
    await openProvenLayoutsOptional(page);
    for (const id of ["semester", "investor", "festival"] as const) {
      await page.locator(`.proven-tpl[data-proven="${id}"]`).click();
      await expect(
        page.locator(`.proven-tpl[data-proven="${id}"]`),
      ).toHaveAttribute("aria-pressed", "true");
    }
    await page.locator("#toInputs").click();
    await expect(page.locator('[data-panel="inputs"]')).toBeVisible();

    // Stepper Inspiration ↔ Preview (with template selected)
    await page.locator('.step-btn[data-view="start"]').click();
    await selectNewFlyerLetter(page);
    await page.locator('.step-btn[data-view="result"]').click();
    await expect(page.locator('[data-panel="result"]')).toBeVisible();
    await page.locator('.step-btn[data-view="inputs"]').click();
    await expect(page.locator('[data-panel="inputs"]')).toBeVisible();
  });

  test("Inspiration: photo, brand kit, all slot fields persist", async ({ page }) => {
    await selectNewFlyerLetter(page);

    // Hero photo starts empty — exercise upload, replace, remove, and optional sample pick
    await expect(page.locator("#inspDrop").first()).not.toHaveClass(/has/);
    await expect(page.locator("#inspActions").first()).toBeHidden();

    await uploadInspirationPhoto(page);
    await page.locator("#inspReplace").first().click();
    await uploadInspirationPhoto(page, "replaced-hero.jpg");
    await page.locator("#inspRemove").first().click();
    await expect(page.locator("#inspActions").first()).toBeHidden();
    await page.locator("#inspThumbs button").first().click();
    await expect(page.locator("#inspDrop").first()).toHaveClass(/has/);

    // Brand kit toggle + settings link
    const brandToggle = page.locator("#brandKitCard #brandToggle");
    await expect(brandToggle).toHaveAttribute("aria-checked", "true");
    await brandToggle.click();
    await expect(brandToggle).toHaveAttribute("aria-checked", "false");
    await expect(page.locator("#brandSettingsLink")).toHaveAttribute(
      "href",
      /\/settings\/branding/,
    );
    await brandToggle.click();

    await expect(page.locator("#brandKitSummary")).not.toContainText(/Oak Park|Riverside/i);
    await expect(page.locator("#brandChipName")).not.toContainText(/Oak Park|Riverside/i);

    await openOptionalDetails(page);
    const marker = `smoke-persist-${Date.now()}`;
    const fieldValues = Object.fromEntries(
      SLOT_FIELD_IDS.map((id, index) => [id, `${marker}-${index}`]),
    ) as Record<(typeof SLOT_FIELD_IDS)[number], string>;
    await fillAllSlotFields(page, fieldValues);

    // Navigate away and back — values persisted in localStorage
    await page.locator('.step-btn[data-view="start"]').click();
    await page.locator('.step-btn[data-view="inputs"]').click();
    for (const id of SLOT_FIELD_IDS) {
      await expect(slotField(page, id)).toHaveValue(fieldValues[id]);
    }

    await goToPreview(page);
    await expect(page.locator('[data-panel="result"]')).toBeVisible();
  });

  test("Preview generate applies mocked slots for new letter flyer", async ({
    page,
  }) => {
    await selectNewFlyerLetter(page);
    await fillAllSlotFields(page, {
      orgName: "Preview Smoke PTA",
      headline: "Before Generate",
      datesEvents: "Aug 1 — Orientation",
    });
    await goToPreview(page);

    await expect(page.locator(".preview-sidebar")).toBeVisible();
    await expect(page.locator('.preview-sidebar [data-goto="inputs"]')).toHaveText("Edit");
    await expect(page.locator(".preview-sidebar")).not.toContainText("Directions to AI");
    await expect(page.locator(".preview-sidebar")).not.toContainText("Slot summary");

    let generateRequestBody: Record<string, unknown> | null = null;
    await page.route(FLYER_GENERATE_API, async (route) => {
      generateRequestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          error: null,
          imageUrl: null,
          imageBase64: MOCK_GENERATED_IMAGE,
          slots: MOCK_GENERATED_SLOTS,
          aiUsed: true,
        }),
      });
    });

    await page.locator("#generateBtn").click();
    await expect(page.locator("#resultFlyer")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#generatedFlyerImg")).toBeVisible();
    await expect(page.locator("#previewDoneActions")).toBeVisible();

    expect(generateRequestBody).toBeTruthy();
    expect(generateRequestBody!.fields).toBeTruthy();
    expect(generateRequestBody!.start).toMatchObject({ path: "new" });
    expect(generateRequestBody!.template).toMatchObject({ templateId: "simple-letter" });
    expect(generateRequestBody!.assets).toMatchObject({
      inspirationPhotoPresent: false,
      inspirationPhotoUrl: null,
    });

    for (const id of SLOT_FIELD_IDS) {
      await expect(slotField(page, id)).toHaveValue(MOCK_GENERATED_SLOTS[id]);
    }
  });

  test("Generate error path, regenerate, print, and download", async ({
    page,
  }) => {
    await selectNewFlyerLetter(page);
    await fillAllSlotFields(page);
    await goToPreview(page);

    await mockGenerateUnauthorized(page);
    await page.locator("#generateBtn").click();
    await expect(page.locator("#previewIdleHint")).toContainText(
      /sign in with an active organization/i,
      { timeout: 15_000 },
    );

    await mockGenerateSuccess(page);
    await page.locator("#generateBtn").click();
    await expect(page.locator("#generatedFlyerImg")).toBeVisible({ timeout: 20_000 });

    // Regenerate
    await page.locator("#regen").click();
    await expect(page.locator("#generatedFlyerImg")).toBeVisible({ timeout: 20_000 });

    // Print + download should not throw
    await page.locator("#btnPrint").click();
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#btnDownload").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/flyer\.png$/);
  });

  test("Semester generate coalesces calendar lines mis-slotted in bodyCopy", async ({
    page,
  }) => {
    await selectProvenTemplate(page, "semester");
    await goToPreview(page);

    await page.route(FLYER_GENERATE_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          error: null,
          imageUrl: null,
          imageBase64: MOCK_GENERATED_IMAGE,
          slots: {
            headline: "Coalesced Semester",
            datesEvents: "Mar 5 — Read Across America\nApr 18 — Spring Carnival",
            bodyCopy: "Extra intro copy.",
          },
          aiUsed: true,
        }),
      });
    });

    await page.locator("#generateBtn").click();
    await expect(page.locator("#generatedFlyerImg")).toBeVisible({ timeout: 20_000 });

    await expect(slotField(page, "bodyCopy")).toHaveValue("Extra intro copy.");
    await expect(slotField(page, "datesEvents")).toHaveValue(/Mar 5 — Read Across America/);
    await expect(slotField(page, "headline")).toHaveValue("Coalesced Semester");
  });
});
