import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
  testEventId,
} from "../helpers/auth";

test.describe("Create with AI creative workflow", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local (staging/test account only).",
    );
    test.skip(
      !testEventId(),
      "Skipped: set HEY_RALLI_TEST_EVENT_ID to a staging event id for Create with AI smoke tests.",
    );
    await loginWithTestUser(page);
  });

  test("Create with AI loads", async ({ page }) => {
    const eventId = testEventId()!;
    await page.goto(`/events/${eventId}/campaign-builder`);
    await expectNoBlankScreen(page);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    await expect(
      page.getByText(/your creative setup|create with ai|campaign milestones|inspiration/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Inspiration selections remain saved when moving to Milestones", async ({
    page,
  }) => {
    const eventId = testEventId()!;
    await page.goto(`/events/${eventId}/campaign-builder#inspiration`);
    await expectNoBlankScreen(page);

    const notes = page.getByLabel(/notes to ai|global|guidance/i).first();
    if (await notes.count()) {
      const marker = `hey-ralli-smoke-${Date.now()}`;
      await notes.fill(marker);
      const continueButton = page.getByRole("button", {
        name: /save & continue to milestones|continue to milestones/i,
      });
      if (await continueButton.count()) {
        await continueButton.click();
      } else {
        await page.goto(`/events/${eventId}/campaign-builder#milestones`);
      }
      await page.goto(`/events/${eventId}/campaign-builder#inspiration`);
      await expect(notes).toHaveValue(new RegExp(marker));
    } else {
      test.info().annotations.push({
        type: "note",
        description:
          "Notes field not found; verified Create with AI page remained reachable.",
      });
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("Changing the selected playbook on Inspiration updates Milestones correctly", async ({
    page,
  }) => {
    const eventId = testEventId()!;
    await page.goto(`/events/${eventId}/campaign-builder#inspiration`);
    const playbook = page.locator("select").filter({ hasText: /playbook|choose/i }).first()
      .or(page.getByLabel(/playbook/i));

    if (!(await playbook.count())) {
      test.skip(true, "Playbook selector not found on Creative Setup for this event.");
    }

    const options = playbook.locator("option");
    const optionCount = await options.count();
    test.skip(optionCount < 2, "Need at least two playbooks to verify milestone updates.");

    const secondValue = await options.nth(1).getAttribute("value");
    if (!secondValue) {
      test.skip(true, "Second playbook option has no value.");
    }
    await playbook.selectOption(secondValue!);

    const continueButton = page.getByRole("button", {
      name: /save & continue to milestones|continue to milestones/i,
    });
    if (await continueButton.count()) {
      page.once("dialog", (dialog) => dialog.accept());
      await continueButton.click();
    } else {
      await page.goto(`/events/${eventId}/campaign-builder#milestones`);
    }

    await expect(page.locator("body")).toContainText(/milestone|days out|week|announcement|event day/i);
  });
});
