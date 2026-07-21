import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
} from "../helpers/auth";

/**
 * Ask Ralli Assistant (Hey Ralli) — Phases 1–5 + UX polish smokes.
 *
 * Ambiguous same-named events: not seeded in this suite. Unit coverage lives in
 * `src/lib/ralli-assistant/__tests__/event-resolver.test.ts`. If a live answer
 * returns dated event chips, we assert them opportunistically below.
 */
test.describe("Ask Ralli Assistant", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasTestCredentials(),
      "Skipped: set HEY_RALLI_TEST_EMAIL and HEY_RALLI_TEST_PASSWORD in .env.local.",
    );
    await loginWithTestUser(page);
  });

  test("Open Ask Ralli from the sidebar pinned card — dialog opens", async ({
    page,
  }) => {
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);

    const dialog = await openAskRalliDialog(page);
    await expect(dialog.getByRole("heading", { name: /hey ralli assistant/i })).toBeVisible();
    await expect(dialog.getByText(/try a question to get started/i)).toBeVisible();
    await expect(dialog.getByRole("button", { name: /give me today's summary/i })).toBeVisible();
  });

  test("Org/ops question routes away from pure how-to FAQ", async ({ page }) => {
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const dialog = await openAskRalliDialog(page);

    await askInDialog(dialog, "Give me today's summary");
    await expectAssistantSettled(dialog);

    // Org briefing source eyebrow (ops/org → "Your next steps").
    await expect(dialog.getByText("Your next steps", { exact: true })).toBeVisible({
      timeout: 5_000,
    });

    const answer = latestAssistantBubble(dialog);
    await expect(answer).toBeVisible();
    const answerText = (await answer.innerText()).trim();
    expect(answerText.length, "Org/ops answer should not be empty").toBeGreaterThan(40);

    // Must not be the Calendar FAQ-only how-to.
    expect(answerText.toLowerCase()).not.toMatch(
      /^open calendar in the left nav/,
    );
    expect(answerText.toLowerCase()).not.toMatch(
      /calendar is where you see school dates and planned posts/i,
    );

    // Structured briefing and/or deep-link chips (Approvals / Today).
    const hasStructured =
      /waiting on you|publishing today|approval|today|this week|behind|attention|task/i.test(
        answerText,
      ) || (await answer.locator("ul li, p").count()) >= 2;
    expect(
      hasStructured,
      "Expected structured org briefing content (counts, bullets, or ops language)",
    ).toBeTruthy();

    const approvalsChip = answer.getByRole("link", { name: /approvals/i });
    const todayChip = answer.getByRole("link", { name: /^today/i });
    const chipCount =
      (await approvalsChip.count()) + (await todayChip.count());
    expect(
      chipCount,
      "Expected Approvals and/or Today link chips on org briefing",
    ).toBeGreaterThan(0);
  });

  test("Approval queue chip question uses ops/org coach, not FAQ-only", async ({
    page,
  }) => {
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const dialog = await openAskRalliDialog(page);

    // Prefer suggestion chip when present (same product path as typed ask).
    const chip = dialog.getByRole("button", {
      name: /what needs my approval\?/i,
    });
    if (await chip.isVisible().catch(() => false)) {
      await chip.click();
    } else {
      await askInDialog(dialog, "What needs my approval?");
    }

    await expectAssistantSettled(dialog);
    await expect(dialog.getByText("Your next steps", { exact: true })).toBeVisible({
      timeout: 5_000,
    });

    const answer = latestAssistantBubble(dialog);
    const answerText = (await answer.innerText()).trim();
    expect(answerText.length).toBeGreaterThan(20);
    expect(answerText.toLowerCase()).not.toMatch(
      /^open approvals in the left nav/,
    );

    await expect(answer.getByRole("link", { name: /approvals/i }).first()).toBeVisible();
  });

  test("Product-help FAQ still works for where to find approvals", async ({
    page,
  }) => {
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const dialog = await openAskRalliDialog(page);

    await askInDialog(dialog, "Where do I find approvals?");
    await expectAssistantSettled(dialog);

    await expect(dialog.getByText("Product how-tos", { exact: true })).toBeVisible({
      timeout: 5_000,
    });

    const answer = latestAssistantBubble(dialog);
    await expect(answer).toContainText(/approvals/i);
    await expect(answer).toContainText(/left nav|approvals/i);
    await expect(
      answer.getByRole("link", { name: /open approvals|approvals/i }).first(),
    ).toBeVisible();
    await expect(
      answer.getByRole("link", { name: /open approvals|approvals/i }).first(),
    ).toHaveAttribute("href", /\/approvals/);
  });

  test("Ambiguous event chips — document skip; assert if staging returns them", async ({
    page,
  }) => {
    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const dialog = await openAskRalliDialog(page);

    // Staging orgs rarely have two same-named events. Unit tests cover resolve + chips.
    // Probe a vague event-scoped ask; if ambiguity UI appears, assert dated chips.
    await askInDialog(dialog, "What should I do next for this event?");
    await expectAssistantSettled(dialog);

    const answer = latestAssistantBubble(dialog);
    const ambiguousCopy = answer.getByText(/more than one matching event/i);
    const eventChips = answer.getByRole("button", { name: /→$/ });

    if (await ambiguousCopy.isVisible().catch(() => false)) {
      await expect(eventChips.first()).toBeVisible();
      const labels = await eventChips.allTextContents();
      expect(labels.length).toBeGreaterThan(1);
      // Dated chips: label includes a year or month-ish date fragment.
      expect(
        labels.some((label) => /\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(label)),
      ).toBeTruthy();
      test.info().annotations.push({
        type: "note",
        description: "Staging returned ambiguous event chips — asserted dated options.",
      });
      return;
    }

    test.info().annotations.push({
      type: "note",
      description:
        "Skipped ambiguous-event chip assert: staging did not return multiple same-named matches. Covered by src/lib/ralli-assistant/__tests__/event-resolver.test.ts.",
    });

    // Still expect a usable answer (name an event / open event page / ops path).
    const text = (await answer.innerText()).trim();
    expect(text.length).toBeGreaterThan(10);
    await expect(dialog.getByText(/your next steps|product how-tos|next steps/i).first()).toBeVisible();
  });
});

async function openAskRalliDialog(page: Page): Promise<Locator> {
  // Expanded sidebar: "Ask Ralli →" on the pinned card under Insights.
  const openLabeled = page.getByRole("button", { name: /^ask ralli/i });
  const openCompact = page.getByRole("button", {
    name: /^hey ralli assistant$/i,
  });

  if (await openLabeled.isVisible().catch(() => false)) {
    await openLabeled.click();
  } else if (await openCompact.isVisible().catch(() => false)) {
    await openCompact.click();
  } else {
    // Card title is visible even if CTA copy drifts — click Ask control nearby.
    await page.getByText("Hey Ralli Assistant", { exact: true }).first().click();
  }

  const dialog = page.getByRole("dialog", { name: /hey ralli assistant/i });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  return dialog;
}

async function askInDialog(dialog: Locator, question: string): Promise<void> {
  const input = dialog.locator("#ralli-ask-input");
  await expect(input).toBeVisible();
  await input.fill(question);
  await dialog.getByRole("button", { name: /^ask$/i }).click();
}

async function expectAssistantSettled(dialog: Locator): Promise<void> {
  await expect(dialog.getByText(/^thinking/i)).toBeHidden({ timeout: 90_000 });
  await expect(latestAssistantBubble(dialog)).toBeVisible({ timeout: 15_000 });
  await expect(dialog.getByText(/something went wrong/i)).toHaveCount(0);
}

function latestAssistantBubble(dialog: Locator): Locator {
  // Assistant bubbles use bordered cards; user bubbles are dark and right-shifted (ml-8).
  return dialog.locator(".mr-4.border").last();
}
