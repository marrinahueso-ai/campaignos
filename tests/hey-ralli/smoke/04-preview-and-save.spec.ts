import { test, expect } from "@playwright/test";
import {
  expectCreateWithAiLoaded,
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
  testEventId,
} from "../helpers/auth";

test.describe("Preview generation and captions", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    test.skip(
      !testEventId(),
      "Skipped: set HEY_RALLI_TEST_EVENT_ID for Preview smoke tests.",
    );
    await loginWithTestUser(page);
  });

  test("Generating artwork for one milestone does not generate every milestone", async ({
    page,
  }) => {
    const eventId = testEventId()!;
    await page.goto(`/events/${eventId}/campaign-builder#preview`);
    await expectNoBlankScreen(page);
    await expectCreateWithAiLoaded(page);

    const main = mainContent(page);
    const generateButtons = main.getByRole("button", {
      name: /generate (this )?milestone|generate artwork|create artwork/i,
    });
    test.skip(
      (await generateButtons.count()) === 0,
      "No single-milestone generate control found on Preview for this event.",
    );

    // Count milestones currently marked complete/generated before click.
    const beforeComplete = await main.getByText(/complete|generated/i).count();
    await generateButtons.first().click();

    // Wait briefly for UI activity, then ensure we did not flip every rail item.
    await page.waitForTimeout(3000);
    const generatingAll = main.getByText(/generating all|generate all content/i);
    await expect(generatingAll).toHaveCount(0);

    const afterComplete = await main.getByText(/complete|generated/i).count();
    // Allow at most a small increase — never a full-rail completion jump.
    expect(afterComplete - beforeComplete).toBeLessThan(5);
  });

  test("Manual caption edits remain saved", async ({ page }) => {
    const eventId = testEventId()!;
    await page.goto(`/events/${eventId}/campaign-builder#preview`);
    await expectNoBlankScreen(page);
    await expectCreateWithAiLoaded(page);

    const main = mainContent(page);
    const editCaption = main.getByRole("button", { name: /edit caption/i });
    test.skip(
      (await editCaption.count()) === 0,
      "No Edit caption control found on Preview for this event.",
    );

    await editCaption.first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /edit caption/i })).toBeVisible();
    const previewCaption = dialog.getByLabel(/preview new caption/i);
    test.skip(
      (await previewCaption.count()) === 0,
      "Edit caption modal did not expose a Preview new caption field.",
    );

    const marker = `Caption smoke ${Date.now()}`;
    await previewCaption.fill(marker);
    await dialog.getByRole("button", { name: /apply caption/i }).click();
    await expect(dialog).toHaveCount(0);

    // Caption applies into session; debounced server save starts ~800ms later.
    // Wait past the debounce before asserting Saving… is gone, otherwise reload
    // can race the persist and the server snapshot can overwrite local edits
    // (richness only scores "has caption", not caption text).
    await expect(main).toContainText(marker, { timeout: 10_000 });
    await page.waitForTimeout(1000);
    await expect(main.getByText(/saving…/i)).toHaveCount(0, { timeout: 20_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.goto(`/events/${eventId}/campaign-builder#preview`, {
      waitUntil: "domcontentloaded",
    });
    await expectCreateWithAiLoaded(page);
    await expect(mainContent(page)).toContainText(marker, { timeout: 20_000 });
  });

  test("A grayed-out required field does not prevent saving without a clear explanation", async ({
    page,
  }) => {
    const eventId = testEventId()!;
    await page.goto(`/events/${eventId}/campaign-builder#inspiration`);
    await expectNoBlankScreen(page);
    await expectCreateWithAiLoaded(page);

    const main = mainContent(page);
    const continueButton = main
      .getByRole("button", {
        name: /save & continue|continue/i,
      })
      .first();
    test.skip(
      (await continueButton.count()) === 0,
      "No continue/save button found on Creative Setup.",
    );

    const disabled = await continueButton.isDisabled();
    if (disabled) {
      const explanation = main.getByText(
        /required|complete|choose|select|wait|upload|finish/i,
      );
      await expect(
        explanation.first(),
        "If Save is disabled, the page must show a clear reason.",
      ).toBeVisible();
    } else {
      await continueButton.click();
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
    }
  });
});
