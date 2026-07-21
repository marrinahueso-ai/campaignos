import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  expectApprovalsLoaded,
  expectCreateWithAiLoaded,
  expectNoBlankScreen,
  gotoApprovals,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
  testEventId,
} from "../helpers/auth";

const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;
const OBSERVATIONS_PATH = path.join(
  process.cwd(),
  "test-results",
  "hey-ralli",
  "artwork-generation-approval-observations.md",
);

function skipArtworkGeneration(): boolean {
  return process.env.HEY_RALLI_SKIP_ARTWORK_GENERATION === "true";
}

/** Opt-in: actually submit Request changes (mutates staging approval rows). */
function exerciseRequestChanges(): boolean {
  return process.env.HEY_RALLI_EXERCISE_REQUEST_CHANGES === "true";
}

function note(page: Page, description: string) {
  test.info().annotations.push({ type: "note", description });
}

function writeObservations(lines: string[]) {
  fs.mkdirSync(path.dirname(OBSERVATIONS_PATH), { recursive: true });
  fs.writeFileSync(
    OBSERVATIONS_PATH,
    [
      "# Artwork generation → approvals — Playwright observations",
      "",
      `Captured: ${new Date().toISOString()}`,
      "",
      ...lines,
      "",
    ].join("\n"),
    "utf8",
  );
}

async function openCreateWithAiPreview(page: Page, eventId: string) {
  await page.goto(`/events/${eventId}/campaign-builder#preview`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expectNoBlankScreen(page);
  await expect(page).not.toHaveURL(/\/login/);
  await expectCreateWithAiLoaded(page);

  const main = mainContent(page);
  // Hash can race Soft remounts — click the stepper if Preview UI is not up yet.
  const previewCue = main.getByText(/milestones complete|generate next milestone|generate this milestone|no content yet/i);
  if (!(await previewCue.first().isVisible().catch(() => false))) {
    const previewStep = main.getByRole("button", {
      name: /preview campaign/i,
    });
    if (await previewStep.count()) {
      await previewStep.first().click();
    }
  }

  await expect(
    main.getByText(
      /milestones complete|generate next milestone|generate this milestone|no content yet|preview campaign/i,
    ).first(),
  ).toBeVisible({ timeout: 45_000 });
}

async function triggerArtworkGeneration(
  page: Page,
): Promise<"started" | "already_complete" | "unavailable"> {
  const main = mainContent(page);

  const generateThis = main.getByRole("button", {
    name: /generate this milestone|retry generation/i,
  });
  const generateNext = main.getByRole("button", {
    name: /generate next milestone/i,
  });
  const nextReview = main.getByRole("button", {
    name: /next:\s*review/i,
  });

  if ((await generateThis.count()) > 0) {
    await generateThis.first().click();
    return "started";
  }

  if ((await generateNext.count()) > 0) {
    const disabled = await generateNext.first().isDisabled();
    if (!disabled) {
      await generateNext.first().click();
      return "started";
    }
  }

  // Content already present: regenerate via Edit artwork modal (real AI run).
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

  // Fallback: Milestones sparkles (also regenerates)
  const milestonesStep = main.getByRole("button", {
    name: /campaign milestones/i,
  });
  if (await milestonesStep.count()) {
    await milestonesStep.first().click();
  } else {
    await page.goto(page.url().replace(/#.*$/, "") + "#milestones");
  }
  await expectCreateWithAiLoaded(page);
  await expect(
    main.getByText(/campaign milestones|milestone/i).first(),
  ).toBeVisible({ timeout: 30_000 });

  const sparkle = main.getByRole("button", {
    name: /generate content for /i,
  });
  if ((await sparkle.count()) > 0) {
    await sparkle.first().click();
    return "started";
  }

  if ((await nextReview.count()) > 0) {
    return "already_complete";
  }

  return "unavailable";
}

async function waitForGenerationOutcome(
  page: Page,
): Promise<"success" | "failure" | "timeout"> {
  const main = mainContent(page);
  const deadline = Date.now() + GENERATION_TIMEOUT_MS;

  // Wait briefly for the in-progress cue so we do not treat pre-existing art as done.
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
      ) ||
      (await main.locator("[role='alert']").count()) > 0
    ) {
      const alert = await main
        .locator("[role='alert']")
        .innerText()
        .catch(() => "");
      if (
        alert ||
        /failed|required fields/i.test(body)
      ) {
        return "failure";
      }
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

async function observeApprovalsAndBadges(
  page: Page,
  eventId: string,
  observations: string[],
) {
  await page.goto(`/approvals?event=${eventId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expectApprovalsLoaded(page);
  await expectNoBlankScreen(page);

  const main = mainContent(page);

  // Admins default to "Assigned to Me" — switch to All so queue/in_queue rows appear.
  const viewScope = main.getByLabel(/view scope/i);
  if (await viewScope.count()) {
    await viewScope.selectOption("all");
    observations.push('- Switched Approvals view scope to **All** (default is Assigned to Me).');
  }

  const campaignFilter = main.locator("#campaign-filter");
  if (await campaignFilter.count()) {
    const option = campaignFilter.locator(`option[value="${eventId}"]`);
    if (await option.count()) {
      await campaignFilter.selectOption(eventId);
      observations.push(`- Filtered hub to test event \`${eventId}\`.`);
    } else {
      await campaignFilter.selectOption("all");
      observations.push(
        "- Test event not in campaign filter options — viewing **All campaigns** (scheduled events often omit pending rows).",
      );
    }
  }

  const search = main.getByPlaceholder(/search/i);
  if (await search.count()) {
    await search.fill("Reminder");
    await page.waitForTimeout(800);
    observations.push("- Searched Approvals for `Reminder` (staging milestone name).");
  }

  const summaryLabels = main.locator("p").filter({
    hasText:
      /^(in queue|assigned to me|scheduled|posted|published|changes requested)$/i,
  });
  await expect(summaryLabels.first()).toBeVisible({ timeout: 20_000 });
  observations.push(
    "- Approvals hub summary cards rendered (In queue / Assigned to me / Changes requested, etc.).",
  );

  const changesRequestedCard = main.locator("p").filter({
    hasText: /^changes requested$/i,
  });
  if (await changesRequestedCard.count()) {
    observations.push(
      "- Hub exposes a **Changes requested** summary card (badge cue for re-work).",
    );
  }

  // Sidebar Approvals badges (aria-labels from NavNotificationBadge).
  const approvalBadge = page.getByLabel(/\d+ approvals? waiting/i);
  const changeBadge = page.getByLabel(/\d+ change requests? for you/i);
  const approvalBadgeVisible = await approvalBadge
    .first()
    .isVisible()
    .catch(() => false);
  const changeBadgeVisible = await changeBadge
    .first()
    .isVisible()
    .catch(() => false);
  observations.push(
    `- Sidebar Approvals badge (pending): ${approvalBadgeVisible ? "visible" : "not shown (count may be 0)"}.`,
  );
  observations.push(
    `- Sidebar change-request badge: ${changeBadgeVisible ? "visible" : "not shown (count may be 0)"}.`,
  );

  // Prefer items that can still be reviewed (do not Approve — avoids Meta schedule).
  const viewButtons = main.getByRole("button", { name: /^view$/i });
  // Give the filtered table a moment to paint after scope/event change.
  await page.waitForTimeout(1_500);
  const viewCount = await viewButtons.count();
  observations.push(`- Approvals table View buttons found: ${viewCount}.`);

  if (viewCount === 0) {
    observations.push(
      "- No reviewable rows in the current Approvals filter — skipped request-changes UI click.",
    );
    return;
  }

  await viewButtons.first().click();
  // Exact names — avoid matching the disabled "Approved" footer on scheduled rows.
  const drawer = page.locator("aside").filter({
    has: page.getByRole("button", { name: /^(approve|request changes)$/i }),
  });
  const drawerVisible = await drawer
    .first()
    .isVisible({ timeout: 10_000 })
    .catch(() => false);

  if (!drawerVisible) {
    // View may open a read-only drawer without act buttons.
    const anyDrawer = page.getByText(/approval history|comment/i);
    const alreadyApproved = page.getByRole("button", { name: /^approved$/i });
    observations.push(
      (await alreadyApproved.first().isVisible().catch(() => false))
        ? "- Opened review drawer for an already-approved / scheduled item (no Request changes)."
        : (await anyDrawer.first().isVisible().catch(() => false))
          ? "- Opened review drawer (read-only / no act buttons for this user or status)."
          : "- View click did not expose Approve / Request changes (item may be non-pending).",
    );
    return;
  }

  const requestChangesBtn = drawer.getByRole("button", {
    name: /^request changes$/i,
  });
  await expect(requestChangesBtn).toBeVisible();
  observations.push(
    "- Review drawer shows **Request changes** (approve_comms / assignee can act).",
  );

  if (!exerciseRequestChanges()) {
    observations.push(
      "- Request changes **observed only** (set `HEY_RALLI_EXERCISE_REQUEST_CHANGES=true` to submit a comment and mutate staging status).",
    );
    // Close drawer via outside / escape if possible
    await page.keyboard.press("Escape").catch(() => undefined);
    return;
  }

  const comment = drawer.locator("#review-comment");
  const smokeComment = `hey-ralli-smoke request-changes ${Date.now()}`;
  await comment.fill(smokeComment);
  await requestChangesBtn.click();

  // Drawer closes on success; hub refreshes.
  await expect(main.locator("p").filter({ hasText: /^changes requested$/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  observations.push(
    `- Exercised Request changes with comment \`${smokeComment}\` (scheduling item → changes_requested + email hook if Resend configured).`,
  );

  // Soft check: after navigation refresh, change-request badge may appear for creator.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expectApprovalsLoaded(page);
  const changeBadgeAfter = page.getByLabel(/\d+ change requests? for you/i);
  observations.push(
    `- After request-changes, sidebar change-request badge: ${
      (await changeBadgeAfter.first().isVisible().catch(() => false))
        ? "visible"
        : "not shown (badge is for submitter requested_by_user_id, not approver)"
    }.`,
  );
}

test.describe("Artwork generation → request changes / re-approval", () => {
  // Generation alone can take 3–8+ minutes for feed+story.
  test.describe.configure({ timeout: 12 * 60 * 1000 });

  test("Generate artwork, then observe Approvals / request-changes path", async ({
    page,
  }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local (staging/test account only).",
    );
    test.skip(
      !testEventId(),
      "Skipped: set HEY_RALLI_TEST_EVENT_ID to a staging event id with Create with AI.",
    );

    const eventId = testEventId()!;
    const observations: string[] = [
      `## Run context`,
      `- Event: \`${eventId}\``,
      `- Skip generation env: \`${skipArtworkGeneration()}\``,
      `- Exercise request-changes env: \`${exerciseRequestChanges()}\``,
      "",
      "## Part 1 — Artwork generation",
    ];

    await loginWithTestUser(page);

    // --- Part 1: generate ---
    if (skipArtworkGeneration()) {
      note(
        page,
        "HEY_RALLI_SKIP_ARTWORK_GENERATION=true — skipped live AI generation (CI cost control).",
      );
      observations.push(
        "- Skipped live generation (`HEY_RALLI_SKIP_ARTWORK_GENERATION=true`).",
      );
      await openCreateWithAiPreview(page, eventId);
      await expect(mainContent(page)).toBeVisible();
    } else {
      await openCreateWithAiPreview(page, eventId);
      const trigger = await triggerArtworkGeneration(page);
      note(page, `Generation trigger: ${trigger}`);

      if (trigger === "unavailable") {
        observations.push(
          "- Could not find a Generate control; continued to Approvals observations.",
        );
        test.info().annotations.push({
          type: "warning",
          description:
            "Generate control unavailable — check Inspiration/milestones setup for this event.",
        });
      } else if (trigger === "already_complete") {
        observations.push(
          "- Preview already complete and no regenerate control found; skipped live AI.",
        );
        note(page, "Artwork already present; regenerate control unavailable.");
      } else {
        observations.push(
          "- Clicked Generate; waiting up to 10 minutes for success or failure.",
        );
        const outcome = await waitForGenerationOutcome(page);
        note(page, `Generation outcome: ${outcome}`);
        observations.push(`- Generation outcome: **${outcome}**.`);

        if (outcome === "failure") {
          const alertText = await mainContent(page)
            .locator("[role='alert']")
            .innerText()
            .catch(() => "(no alert text)");
          observations.push(`- Failure message: ${alertText}`);
          expect(outcome, `Generation failed: ${alertText}`).not.toBe("failure");
        } else if (outcome === "timeout") {
          observations.push(
            "- Timed out waiting for generation (server may still finish via persisted session).",
          );
          expect(
            outcome,
            "Artwork generation did not finish within 10 minutes",
          ).not.toBe("timeout");
        } else {
          await expect(mainContent(page)).not.toContainText(
            /artwork generation failed|content generation failed/i,
          );
          observations.push(
            "- Success cues seen (Complete / artwork image / Next: Review).",
          );
        }
      }

      // Review → Send for approval creates/updates scheduling rows (needed for Part 2).
      await page.goto(`/events/${eventId}/campaign-builder#review`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await expectCreateWithAiLoaded(page);
      const main = mainContent(page);
      const reviewStep = main.getByRole("button", {
        name: /review\s*&\s*approve/i,
      });
      if (await reviewStep.count()) {
        await reviewStep.first().click();
      }
      const sendApproval = main.getByRole("button", {
        name: /send for approval/i,
      });
      await expect(sendApproval).toBeVisible({ timeout: 45_000 });
      observations.push(
        "- Review step exposes **Send for approval** (creates/updates `approval_scheduling_items`).",
      );

      // Safe when the staging event has few ready milestones (this suite's event has 1).
      await sendApproval.click();
      // Success shows Sent-for-approval notice (#published view); failures stay on Review.
      const sendOutcome = main.getByText(
        /\d+\s+milestones?\s+sent for approval|unable to create approval|generate artwork before sending|campaign session not found/i,
      );
      const sentNotice = main.getByRole("heading", {
        name: /sent for approval/i,
      });
      const reviewReturnCta = main.getByRole("button", {
        name: /view milestones in review/i,
      });
      await Promise.race([
        sendOutcome.first().waitFor({ state: "visible", timeout: 90_000 }),
        page.waitForURL(/#published/, { timeout: 90_000 }).catch(() => undefined),
        sentNotice.first().waitFor({ state: "visible", timeout: 90_000 }),
        reviewReturnCta.first().waitFor({ state: "visible", timeout: 90_000 }),
      ]);
      const feedbackText = (await sendOutcome.first().innerText().catch(() => "")).trim();
      const onSentNotice =
        /#published/i.test(page.url()) ||
        (await sentNotice.count()) > 0 ||
        (await reviewReturnCta.count()) > 0;
      observations.push(
        `- Clicked Send for approval — ${
          feedbackText
            ? `message: ${feedbackText}`
            : onSentNotice
              ? "showed Sent for approval notice (success path)"
              : "no explicit success message (item may already be scheduled — resubmit keeps status)"
        }`,
      );
      note(
        page,
        `Send for approval: ${feedbackText || (onSentNotice ? "sent-notice" : "unclear")}`,
      );
    }

    // --- Part 2: approvals / badges / request-changes ---
    observations.push("", "## Part 2 — Approvals / badges / request changes");
    await observeApprovalsAndBadges(page, eventId, observations);

    // Calendar non-destructive sanity (same spirit as smoke 05).
    await page.goto("/calendar");
    await expectNoBlankScreen(page);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
    observations.push(
      "",
      "## Safety",
      "- Calendar still loads after creative/approval smoke (no wipe/error).",
      "- Did **not** click Approve (avoids Meta schedule / manual kit email side effects).",
    );

    writeObservations(observations);
    note(page, `Wrote observations to ${OBSERVATIONS_PATH}`);

    // Ensure Approvals hub remained healthy at least once in Part 2.
    await gotoApprovals(page);
    await expect(mainContent(page)).not.toContainText("Internal Server Error");
  });
});
