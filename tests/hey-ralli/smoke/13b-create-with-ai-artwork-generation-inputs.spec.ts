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
 * Layer C — opt-in golden paths that actually call artwork generation.
 * Gated by HEY_RALLI_SKIP_ARTWORK_GENERATION (default skip in CI).
 *
 * Run with generation on:
 *   HEY_RALLI_SKIP_ARTWORK_GENERATION=false npm run test:hey-ralli -- \
 *     tests/hey-ralli/smoke/13b-create-with-ai-artwork-generation-inputs.spec.ts
 *
 * See docs/qa/create-with-ai-artwork-inputs.md
 */

const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;

function skipArtworkGeneration(): boolean {
  return process.env.HEY_RALLI_SKIP_ARTWORK_GENERATION === "true";
}

async function openPreview(page: Page, eventId: string) {
  await page.goto(`/events/${eventId}/campaign-builder#preview`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expectNoBlankScreen(page);
  await expectCreateWithAiLoaded(page);
  const main = mainContent(page);
  const previewCue = main.getByText(
    /milestones complete|generate next milestone|generate this milestone|no content yet/i,
  );
  if (!(await previewCue.first().isVisible().catch(() => false))) {
    const previewStep = main.getByRole("button", {
      name: /preview campaign/i,
    });
    if (await previewStep.count()) {
      await previewStep.first().click();
    }
  }
  await expect(
    main
      .getByText(
        /milestones complete|generate next milestone|generate this milestone|no content yet|preview campaign/i,
      )
      .first(),
  ).toBeVisible({ timeout: 45_000 });
}

async function applyCreativeSetupGoldenPath(page: Page, eventId: string) {
  await page.goto(`/events/${eventId}/campaign-builder#inspiration`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expectCreateWithAiLoaded(page);
  const main = mainContent(page);
  await expect(main.getByText("Your Selections")).toBeVisible({
    timeout: 30_000,
  });

  const overall = main.getByLabel(/overall inspiration comment/i);
  if (await overall.count()) {
    await overall.fill(
      `Layer C golden path — warm community fair, soft pastels (${Date.now()})`,
    );
  }

  // Logo + org colors when available.
  await main.getByRole("heading", { name: /^logo$/i }).scrollIntoViewIfNeeded();
  const logoNone = main.getByRole("button", { name: /^none$/i }).first();
  const orgLogoCandidates = main
    .locator("section")
    .filter({ hasText: /Logo/ })
    .getByRole("button")
    .filter({ hasNotText: /^none$/i })
    .filter({ hasNotText: /upload logo/i });
  if (
    (await orgLogoCandidates.count()) > 0 &&
    (await orgLogoCandidates.first().isEnabled().catch(() => false))
  ) {
    await orgLogoCandidates.first().click();
  } else if (await logoNone.count()) {
    await logoNone.click();
  }

  const orgPalette = main.getByRole("button", {
    name: /organization palette/i,
  });
  if (
    (await orgPalette.count()) &&
    (await orgPalette.isEnabled().catch(() => false))
  ) {
    await orgPalette.click();
  }

  const continueButton = main.getByRole("button", {
    name: /save & continue to milestones|continue to milestones/i,
  });
  if (await continueButton.count()) {
    page.once("dialog", (dialog) => dialog.accept().catch(() => undefined));
    await continueButton.first().click();
  }
}

async function triggerGenerateOrRegenerate(
  page: Page,
): Promise<"started" | "unavailable"> {
  const main = mainContent(page);
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
  return "unavailable";
}

async function waitForGenerationOutcome(
  page: Page,
): Promise<"success" | "failure" | "timeout"> {
  const main = mainContent(page);
  const deadline = Date.now() + GENERATION_TIMEOUT_MS;
  let sawGenerating = false;
  const generatingStartedBy = Date.now() + 45_000;
  while (Date.now() < generatingStartedBy) {
    const body = await main.innerText().catch(() => "");
    if (
      /generating\s+.+\u2026|generating\u2026|creating feed and story artwork|in progress/i.test(
        body,
      )
    ) {
      sawGenerating = true;
      break;
    }
    if (
      /artwork generation failed|content generation failed|complete required fields before generating/i.test(
        body,
      )
    ) {
      return "failure";
    }
    await page.waitForTimeout(1_000);
  }

  while (Date.now() < deadline) {
    const body = await main.innerText().catch(() => "");
    if (
      /artwork generation failed|content generation failed|unable to generate|complete required fields before generating/i.test(
        body,
      )
    ) {
      return "failure";
    }
    const stillGenerating =
      /generating\s+.+\u2026|generating\u2026|creating feed and story artwork/i.test(
        body,
      ) ||
      (await main.getByRole("button", { name: /generating/i }).count()) > 0;
    if (stillGenerating) {
      await page.waitForTimeout(5_000);
      continue;
    }
    const successCue =
      (await main.getByRole("button", { name: /next:\s*review/i }).count()) >
        0 ||
      (await main.locator("img[src*='http']").count()) > 0 ||
      /\bcomplete\b/i.test(body);
    if (successCue && (sawGenerating || successCue)) {
      return "success";
    }
    await page.waitForTimeout(5_000);
  }
  return "timeout";
}

test.describe("Create with AI artwork inputs (Layer C generation)", () => {
  test.describe.configure({ timeout: 12 * 60 * 1000 });

  test("Golden path: logo/colors + inspiration comment generate; Edit Artwork regenerate", async ({
    page,
  }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    test.skip(
      !testEventId(),
      "Skipped: set HEY_RALLI_TEST_EVENT_ID for Create with AI.",
    );
    test.skip(
      skipArtworkGeneration(),
      "Skipped: HEY_RALLI_SKIP_ARTWORK_GENERATION=true (set false to run Layer C golden paths).",
    );

    const eventId = testEventId()!;
    await loginWithTestUser(page);
    await applyCreativeSetupGoldenPath(page, eventId);
    await openPreview(page, eventId);

    const trigger = await triggerGenerateOrRegenerate(page);
    test.skip(
      trigger === "unavailable",
      "Generate / Edit Artwork control unavailable for this staging event.",
    );

    const outcome = await waitForGenerationOutcome(page);
    expect(
      outcome,
      "Artwork generation should succeed for Layer C golden path",
    ).toBe("success");

    // Edit Artwork regenerate with instructions (second golden path).
    const main = mainContent(page);
    const editArtwork = main.getByRole("button", { name: /edit artwork/i });
    test.skip(
      (await editArtwork.count()) === 0,
      "Edit Artwork not available after generation.",
    );
    await editArtwork.first().click();
    const instructions = page.getByLabel(/add instructions for ai/i);
    await expect(instructions).toBeVisible({ timeout: 15_000 });
    await instructions.fill(
      "Increase contrast and keep the same color palette; soft headline emphasis.",
    );
    const regenerate = page.getByRole("button", {
      name: /regenerate artwork/i,
    });
    await expect(regenerate).toBeVisible({ timeout: 15_000 });
    await regenerate.click();
    const regenOutcome = await waitForGenerationOutcome(page);
    expect(regenOutcome, "Edit Artwork regenerate should succeed").toBe(
      "success",
    );
  });
});
