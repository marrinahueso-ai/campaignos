import { expect, type Page } from "@playwright/test";
import {
  expectCreateWithAiLoaded,
  expectNoBlankScreen,
  mainContent,
} from "./auth";

export const ARTWORK_GENERATION_TIMEOUT_MS = 10 * 60 * 1000;

export function skipArtworkGeneration(): boolean {
  return process.env.HEY_RALLI_SKIP_ARTWORK_GENERATION === "true";
}

export async function openCreateWithAiPreview(
  page: Page,
  eventId: string,
): Promise<void> {
  await page.goto(`/events/${eventId}/campaign-builder#preview`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expectNoBlankScreen(page);
  await expect(page).not.toHaveURL(/\/login/);
  await expectCreateWithAiLoaded(page);

  const main = mainContent(page);
  const previewStep = main.getByRole("button", { name: /preview campaign/i });
  if (await previewStep.count()) {
    await previewStep.first().click();
  }

  await expect(
    main
      .getByText(
        /milestones complete|generate next milestone|generate this milestone|no content yet|retry generation|edit artwork|select a milestone to preview/i,
      )
      .first(),
  ).toBeVisible({ timeout: 60_000 });
}

/** Preview often loads with no milestone selected — click the rail first. */
async function selectFirstPreviewMilestone(page: Page): Promise<void> {
  const main = mainContent(page);
  const emptyCue = main.getByText(/select a milestone to preview content/i);
  if (!(await emptyCue.isVisible().catch(() => false))) {
    return;
  }

  const milestoneBtn = main.getByRole("button", {
    name: /reminder only|announcement|save the date|volunteer|fundraiser|thank you|.+\s(scheduled|complete|ready to generate|not started|failed|generating)/i,
  });
  await expect(milestoneBtn.first()).toBeVisible({ timeout: 15_000 });
  await milestoneBtn.first().click();
  await expect(emptyCue).toBeHidden({ timeout: 20_000 });
}

export async function triggerArtworkGeneration(
  page: Page,
): Promise<"started" | "unavailable"> {
  const main = mainContent(page);

  const previewStep = main.getByRole("button", { name: /preview campaign/i });
  if (await previewStep.count()) {
    await previewStep.first().click();
    await page.waitForTimeout(500);
  }

  await selectFirstPreviewMilestone(page);

  const generateThis = main.getByRole("button", {
    name: /generate this milestone|retry generation/i,
  });
  if ((await generateThis.count()) > 0) {
    await generateThis.first().click();
    return "started";
  }

  const generateNext = main.getByRole("button", {
    name: /generate next milestone/i,
  });
  if (
    (await generateNext.count()) > 0 &&
    !(await generateNext.first().isDisabled())
  ) {
    await generateNext.first().click();
    return "started";
  }

  const editArtwork = main.getByRole("button", { name: /edit artwork/i });
  if ((await editArtwork.count()) > 0) {
    await editArtwork.first().click();
    const regenerate = page.getByRole("button", {
      name: /regenerate artwork/i,
    });
    await expect(regenerate).toBeVisible({ timeout: 15_000 });
    await regenerate.click();
    return "started";
  }

  const milestonesStep = main.getByRole("button", {
    name: /campaign milestones/i,
  });
  if (await milestonesStep.count()) {
    await milestonesStep.first().click();
    await expectCreateWithAiLoaded(page);
  }

  const sparkle = main.getByRole("button", {
    name: /generate content for /i,
  });
  if ((await sparkle.count()) > 0) {
    await sparkle.first().click();
    return "started";
  }

  return "unavailable";
}

export async function waitForGenerationOutcome(
  page: Page,
): Promise<"success" | "failure" | "timeout"> {
  const main = mainContent(page);
  const deadline = Date.now() + ARTWORK_GENERATION_TIMEOUT_MS;

  let sawGenerating = false;
  const generatingStartedBy = Date.now() + 60_000;
  while (Date.now() < generatingStartedBy) {
    const body = await main.innerText().catch(() => "");
    const dialogText = await page
      .getByRole("dialog")
      .innerText()
      .catch(() => "");
    if (
      /generating\s+.+\u2026|generating\u2026|creating feed and story artwork|in progress/i.test(
        `${body}\n${dialogText}`,
      )
    ) {
      sawGenerating = true;
      break;
    }
    if (
      /artwork generation failed|content generation failed|complete required fields before generating/i.test(
        `${body}\n${dialogText}`,
      )
    ) {
      return "failure";
    }
    await page.waitForTimeout(1_000);
  }

  while (Date.now() < deadline) {
    const body = await main.innerText().catch(() => "");
    const dialogText = await page
      .getByRole("dialog")
      .innerText()
      .catch(() => "");
    const haystack = `${body}\n${dialogText}`;

    if (
      /artwork generation failed|content generation failed|unable to generate|complete required fields before generating/i.test(
        haystack,
      )
    ) {
      return "failure";
    }

    const stillGenerating =
      /generating\s+.+\u2026|generating\u2026|creating feed and story artwork/i.test(
        haystack,
      ) ||
      (await page.getByRole("button", { name: /^generating/i }).count()) > 0;

    if (stillGenerating) {
      await page.waitForTimeout(5_000);
      continue;
    }

    const hasImage = (await main.locator("img[src*='http']").count()) > 0;
    const hasEdit = (await main.getByRole("button", { name: /edit artwork/i }).count()) > 0;
    if ((hasImage || hasEdit) && (sawGenerating || hasImage)) {
      return "success";
    }

    await page.waitForTimeout(5_000);
  }

  return "timeout";
}
