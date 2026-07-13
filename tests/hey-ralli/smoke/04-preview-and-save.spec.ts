import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
  testEventId,
} from "../helpers/auth";

test.describe("Preview generation and captions", () => {
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

    const generateButtons = page.getByRole("button", {
      name: /generate (this )?milestone|generate artwork|create artwork/i,
    });
    test.skip(
      (await generateButtons.count()) === 0,
      "No single-milestone generate control found on Preview for this event.",
    );

    // Count milestones currently marked complete/generated before click.
    const beforeComplete = await page.getByText(/complete|generated/i).count();
    await generateButtons.first().click();

    // Wait briefly for UI activity, then ensure we did not flip every rail item.
    await page.waitForTimeout(3000);
    const generatingAll = page.getByText(/generating all|generate all content/i);
    await expect(generatingAll).toHaveCount(0);

    const afterComplete = await page.getByText(/complete|generated/i).count();
    // Allow at most a small increase — never a full-rail completion jump.
    expect(afterComplete - beforeComplete).toBeLessThan(5);
  });

  test("Manual caption edits remain saved", async ({ page }) => {
    const eventId = testEventId()!;
    await page.goto(`/events/${eventId}/campaign-builder#preview`);
    await expectNoBlankScreen(page);

    const captionBox = page.getByRole("textbox").filter({ hasText: /./ }).first()
      .or(page.locator("textarea").first());

    test.skip(
      (await captionBox.count()) === 0,
      "No caption editor found on Preview for this event.",
    );

    const marker = `Caption smoke ${Date.now()}`;
    await captionBox.fill(marker);
    await page.waitForTimeout(1200);
    await page.reload();
    await page.goto(`/events/${eventId}/campaign-builder#preview`);
    await expect(page.locator("body")).toContainText(marker);
  });

  test("A grayed-out required field does not prevent saving without a clear explanation", async ({
    page,
  }) => {
    const eventId = testEventId()!;
    await page.goto(`/events/${eventId}/campaign-builder#inspiration`);
    await expectNoBlankScreen(page);

    const continueButton = page.getByRole("button", {
      name: /save & continue|continue/i,
    }).first();
    test.skip(
      (await continueButton.count()) === 0,
      "No continue/save button found on Creative Setup.",
    );

    const disabled = await continueButton.isDisabled();
    if (disabled) {
      const explanation = page.getByText(
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
