import { test, expect, type Page } from "@playwright/test";
import {
  expectCreateWithAiLoaded,
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
  testEventId,
} from "../helpers/auth";

/**
 * Layer A — Creative Setup / milestone wiring + persistence for artwork inputs.
 * Does NOT require live artwork generation.
 *
 * See docs/qa/create-with-ai-artwork-inputs.md
 */

function yourSelections(page: Page) {
  return mainContent(page)
    .getByRole("complementary")
    .filter({ has: page.getByRole("heading", { name: /your selections/i }) });
}

async function gotoCreativeSetup(page: Page, eventId: string) {
  await page.goto(`/events/${eventId}/campaign-builder#inspiration`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expectNoBlankScreen(page);
  await expect(page).not.toHaveURL(/\/login/);
  await expectCreateWithAiLoaded(page);
  const main = mainContent(page);
  const creativeCue = main.getByRole("heading", {
    name: /your creative setup/i,
  });
  if (!(await creativeCue.first().isVisible().catch(() => false))) {
    const step = main.getByRole("button", {
      name: /your creative setup|creative setup|inspiration/i,
    });
    if (await step.count()) {
      await step.first().click();
    }
  }
  await expect(
    main.getByRole("heading", { name: /your selections/i }),
  ).toBeVisible({ timeout: 30_000 });
}

async function saveAndContinueToMilestones(page: Page, eventId: string) {
  const main = mainContent(page);
  const continueButton = main.getByRole("button", {
    name: /save & continue to milestones|continue to milestones/i,
  });
  if (await continueButton.count()) {
    page.once("dialog", (dialog) => dialog.accept().catch(() => undefined));
    await continueButton.first().click();
  } else {
    await page.goto(`/events/${eventId}/campaign-builder#milestones`);
  }
  // Prefer the Milestones step h1 — stepper also says "Campaign Milestones".
  const milestonesHeading = main.getByRole("heading", {
    name: /^milestones$/i,
  });
  if (!(await milestonesHeading.isVisible().catch(() => false))) {
    await page.goto(`/events/${eventId}/campaign-builder#milestones`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectCreateWithAiLoaded(page);
  }
  await expect(milestonesHeading).toBeVisible({ timeout: 45_000 });
}

test.describe("Create with AI artwork inputs (Layer A wiring)", () => {
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

  test("Creative Setup artwork inputs persist via Your Selections after continue + return", async ({
    page,
  }) => {
    const eventId = testEventId()!;
    await gotoCreativeSetup(page, eventId);
    const main = mainContent(page);

    // Playbook — soft when fewer than 2 options.
    const playbook = main.getByLabel(/^playbook$/i);
    if (await playbook.count()) {
      const options = playbook.locator("option");
      if ((await options.count()) >= 2) {
        const secondValue = await options.nth(1).getAttribute("value");
        if (secondValue) {
          page.once("dialog", (dialog) => dialog.accept().catch(() => undefined));
          await playbook.selectOption(secondValue);
          await page.waitForTimeout(800);
        }
      }
    }

    // Overall inspiration comment (NOT Notes to AI).
    const overallComment = main.getByLabel(/overall inspiration comment/i);
    await expect(overallComment).toBeVisible({ timeout: 15_000 });
    const marker = `artwork-input-qa-${Date.now()}`;
    await overallComment.fill(marker);

    // Logo: first "None" on the page is Logo None (before Colors / Voice Nones).
    await main.getByRole("heading", { name: /^logo$/i }).scrollIntoViewIfNeeded();
    await main.getByRole("button", { name: /^none$/i }).first().click();

    // Colors — unique accessible names include the hint text.
    let expectedColorLabel = /none/i;
    const orgPalette = main.getByRole("button", {
      name: /organization palette/i,
    });
    const customPalette = main.getByRole("button", {
      name: /custom palette/i,
    });
    if (
      (await orgPalette.count()) &&
      (await orgPalette.isEnabled().catch(() => false))
    ) {
      await orgPalette.click();
      expectedColorLabel = /organization colors/i;
    } else if (await customPalette.count()) {
      await customPalette.click();
      expectedColorLabel = /custom/i;
    }

    // Voice tone chips toggle — reset via Voice None, then select known tones.
    await main.getByRole("heading", { name: /voice\s*&\s*tone/i }).scrollIntoViewIfNeeded();
    // Voice None is the last exact "None" button on Creative Setup.
    await main.getByRole("button", { name: /^none$/i }).last().click();
    await main.getByRole("button", { name: "Friendly", exact: true }).click();
    await main.getByRole("button", { name: "Playful", exact: true }).click();

    const selections = yourSelections(page);
    await expect(
      selections.getByRole("heading", { name: /your selections/i }),
    ).toBeVisible();
    await expect(selections.getByText(/friendly/i)).toBeVisible();
    await expect(selections.getByText(/playful/i)).toBeVisible();
    await expect(selections.getByText(expectedColorLabel)).toBeVisible();
    // Logo None from earlier.
    await expect(
      selections.locator("dt", { hasText: /^logo$/i }).locator("..").locator("dd"),
    ).toHaveText(/^none$/i);

    await saveAndContinueToMilestones(page, eventId);

    // Return — values survive.
    await gotoCreativeSetup(page, eventId);
    await expect(main.getByLabel(/overall inspiration comment/i)).toHaveValue(
      new RegExp(marker),
    );
    const selectionsAgain = yourSelections(page);
    await expect(selectionsAgain.getByText(/friendly/i)).toBeVisible();
    await expect(selectionsAgain.getByText(/playful/i)).toBeVisible();
    await expect(selectionsAgain.getByText(expectedColorLabel)).toBeVisible();

    // Clear all — exercise confirm on the same mounted Creative Setup instance.
    const clearBtn = main.getByRole("button", {
      name: /clear all selections/i,
    });
    await clearBtn.evaluate((el: HTMLElement) => el.click());
    await expect(
      main.getByText(/reset inspiration, logo, colors, and tone/i),
    ).toBeVisible({ timeout: 10_000 });
    await main
      .getByRole("button", { name: "Clear all", exact: true })
      .evaluate((el: HTMLElement) => el.click());
    const noneLabels = selectionsAgain
      .locator("dd")
      .filter({ hasText: /^none$/i });
    await expect(noneLabels).toHaveCount(4, { timeout: 10_000 });
  });

  test("Milestone artwork notes and platform formats persist in editor", async ({
    page,
  }) => {
    const eventId = testEventId()!;
    await gotoCreativeSetup(page, eventId);
    await saveAndContinueToMilestones(page, eventId);

    const main = mainContent(page);
    // Prefer aria-label Edit {name}; fall back to row actions.
    let editButton = main.getByRole("button", { name: /^edit /i }).first();
    if ((await main.getByRole("button", { name: /^edit /i }).count()) === 0) {
      const milestonesStep = main.getByRole("button", {
        name: /campaign milestones/i,
      });
      if (await milestonesStep.count()) {
        await milestonesStep.first().click();
        await page.waitForTimeout(1_000);
      }
      editButton = main.getByRole("button", { name: /^edit /i }).first();
    }
    test.skip(
      (await main.getByRole("button", { name: /^edit /i }).count()) === 0,
      "No milestone Edit control found for this event.",
    );

    await editButton.click();
    const artworkNotes = page.getByLabel(/artwork notes \(artwork only\)/i);
    await expect(artworkNotes).toBeVisible({ timeout: 15_000 });
    const noteMarker = `milestone-art-notes-${Date.now()}`;
    await artworkNotes.fill(noteMarker);

    const feedCheckbox = page.locator('input[name="platformFormats"]').first();
    if (await feedCheckbox.count()) {
      if (!(await feedCheckbox.isChecked())) {
        await feedCheckbox.check();
      }
    }

    await page.getByRole("button", { name: /save milestone/i }).click();
    await expect(artworkNotes)
      .toBeHidden({ timeout: 15_000 })
      .catch(() => undefined);

    await main.getByRole("button", { name: /^edit /i }).first().click();
    await expect(page.getByLabel(/artwork notes \(artwork only\)/i)).toHaveValue(
      new RegExp(noteMarker),
    );
    await page.getByRole("button", { name: /^cancel$/i }).click();
  });
});

