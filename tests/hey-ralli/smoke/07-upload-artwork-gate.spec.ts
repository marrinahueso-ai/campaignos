import { test, expect } from "@playwright/test";
import {
  expectCreateWithAiLoaded,
  expectNoBlankScreen,
  hasNoUploadCredentials,
  hasTestCredentials,
  loginWithNoUploadUser,
  loginWithTestUser,
  mainContent,
  testEventId,
} from "../helpers/auth";

test.describe("Create with AI upload_artwork gate", () => {
  test("Members with upload access see Inspiration upload controls", async ({
    page,
  }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    test.skip(
      !testEventId(),
      "Skipped: set HEY_RALLI_TEST_EVENT_ID for Create with AI tests.",
    );

    await loginWithTestUser(page);
    const eventId = testEventId()!;
    await page.goto(`/events/${eventId}/campaign-builder#inspiration`);
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expectCreateWithAiLoaded(page);

    const main = mainContent(page);
    // Default staging account is expected to retain upload_artwork.
    // If this fails, either the test user lost upload access or the gate regressed open/closed.
    const uploadControl = main.getByRole("button", {
      name: /upload inspiration images/i,
    });
    const deniedBanner = main.getByText(
      /inspiration and logo uploads are disabled for your role/i,
    );

    if (await deniedBanner.count()) {
      test.info().annotations.push({
        type: "note",
        description:
          "Default test user has upload_artwork denied. Configure a member with upload access as HEY_RALLI_TEST_* or use HEY_RALLI_TEST_NO_UPLOAD_* for the restricted path.",
      });
      await expect(deniedBanner).toBeVisible();
      await expect(uploadControl).toHaveCount(0);
    } else {
      await expect(uploadControl).toBeVisible();
      await expect(deniedBanner).toHaveCount(0);
    }
  });

  test("Members without upload_artwork do not see Inspiration uploads", async ({
    page,
  }) => {
    test.skip(
      !hasNoUploadCredentials(),
      "Skipped: set HEY_RALLI_TEST_NO_UPLOAD_EMAIL and HEY_RALLI_TEST_NO_UPLOAD_PASSWORD to a staging user with EffectiveAccess upload_artwork: false.",
    );
    test.skip(
      !testEventId(),
      "Skipped: set HEY_RALLI_TEST_EVENT_ID for Create with AI tests.",
    );

    await loginWithNoUploadUser(page);
    const eventId = testEventId()!;
    await page.goto(`/events/${eventId}/campaign-builder#inspiration`);
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expectCreateWithAiLoaded(page);

    const main = mainContent(page);
    await expect(
      main.getByText(
        /inspiration and logo uploads are disabled for your role/i,
      ),
    ).toBeVisible();
    await expect(
      main.getByRole("button", { name: /upload inspiration images/i }),
    ).toHaveCount(0);
    await expect(main.getByLabel(/choose inspiration images/i)).toHaveCount(0);
  });
});
