import { test, expect } from "@playwright/test";
import {
  expectNoBlankScreen,
  hasTestCredentials,
  loginWithTestUser,
  mainContent,
  signOutViaUi,
  testEventId,
} from "../helpers/auth";
import {
  countAiUsageLog,
  hasAiUsageAdminCredentials,
  waitForAiUsageIncrease,
} from "../helpers/ai-usage";
import {
  openCreateWithAiPreview,
  skipArtworkGeneration,
  triggerArtworkGeneration,
  waitForGenerationOutcome,
} from "../helpers/artwork-generation";

/**
 * Phase 5 smoke — generate artwork as a member, prove `ai_usage_log` grows,
 * then confirm Owner AI & APIs page loads live aggregates.
 *
 * Requires:
 *   HEY_RALLI_TEST_EMAIL / HEY_RALLI_TEST_PASSWORD / HEY_RALLI_TEST_EVENT_ID
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *   Test user must also pass Owner Ops gate for the UI assertion
 *   (allowlist email + admin seat), OR set HEY_RALLI_OWNER_TEST_EMAIL /
 *   HEY_RALLI_OWNER_TEST_PASSWORD for a separate Owner login.
 *
 * Run:
 *   HEY_RALLI_SKIP_ARTWORK_GENERATION=false npm run test:hey-ralli -- \
 *     tests/hey-ralli/smoke/20-owner-ai-apis-artwork-usage.spec.ts
 */

test.describe("Owner AI & APIs — artwork usage smoke", () => {
  test.describe.configure({ timeout: 15 * 60 * 1000 });

  test.beforeEach(() => {
    test.skip(
      !hasTestCredentials() || !testEventId(),
      "Set HEY_RALLI_TEST_EMAIL, HEY_RALLI_TEST_PASSWORD, HEY_RALLI_TEST_EVENT_ID",
    );
    test.skip(
      !hasAiUsageAdminCredentials(),
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for warehouse counts",
    );
    test.skip(
      skipArtworkGeneration(),
      "HEY_RALLI_SKIP_ARTWORK_GENERATION=true — unset or set false to run live artwork",
    );
  });

  test("artwork generation increases ai_usage_log and Owner AI APIs loads", async ({
    page,
  }) => {
    const eventId = testEventId()!;
    const startedAtIso = new Date().toISOString();
    const baseline = await countAiUsageLog();
    test.info().annotations.push({
      type: "note",
      description: `Baseline ai_usage_log total=${baseline.total} artwork=${baseline.artwork}`,
    });

    await loginWithTestUser(page);
    await openCreateWithAiPreview(page, eventId);

    const trigger = await triggerArtworkGeneration(page);
    test.info().annotations.push({
      type: "note",
      description: `Artwork trigger: ${trigger}`,
    });
    expect(
      trigger,
      "Expected Generate This Milestone / Generate Next / Edit→Regenerate / milestone sparkle",
    ).toBe("started");

    const outcome = await waitForGenerationOutcome(page);
    test.info().annotations.push({
      type: "note",
      description: `Artwork generation outcome: ${outcome}`,
    });
    expect(
      outcome,
      "Artwork generation should succeed (check OpenAI + Create with AI fields)",
    ).toBe("success");

    const after = await waitForAiUsageIncrease({
      baseline,
      timeoutMs: 3 * 60 * 1000,
    });
    const recent = await countAiUsageLog(startedAtIso);
    test.info().annotations.push({
      type: "note",
      description: `After artwork: total=${after.total} artwork=${after.artwork}; recent since ${startedAtIso}: total=${recent.total} artwork=${recent.artwork}`,
    });
    expect(after.total).toBeGreaterThan(baseline.total);
    expect(after.artwork).toBeGreaterThan(baseline.artwork);
    expect(recent.artwork).toBeGreaterThan(0);

    // Owner AI & APIs UI — same user if Owner, else optional Owner credentials.
    const ownerEmail = process.env.HEY_RALLI_OWNER_TEST_EMAIL?.trim();
    const ownerPassword = process.env.HEY_RALLI_OWNER_TEST_PASSWORD?.trim();
    if (ownerEmail && ownerPassword) {
      await signOutViaUi(page);
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(ownerEmail);
      await page.getByLabel(/password/i).fill(ownerPassword);
      await page.getByRole("button", { name: /^sign in$/i }).click();
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
        timeout: 30_000,
      });
    }

    await page.goto("/ops/ai-apis", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expectNoBlankScreen(page);

    if (page.url().includes("/dashboard") || page.url().includes("/login")) {
      test.info().annotations.push({
        type: "note",
        description:
          "User cannot open /ops/ai-apis (Owner gate). Warehouse increase already verified; set HEY_RALLI_OWNER_TEST_* for UI check.",
      });
      return;
    }

    const main = mainContent(page);
    await expect(
      main.getByRole("heading", { name: /ai\s*&\s*apis/i }),
    ).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("link", { name: /^ai apis$/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^connected apis$/i }),
    ).toBeVisible();

    // Live data (not demo): either request cards with a count, or honest empty.
    const body = await main.innerText();
    expect(body).not.toMatch(/demo data|sample chart|hardcoded/i);

    const hasRequestsCard = /ai requests/i.test(body);
    expect(hasRequestsCard).toBeTruthy();

    // With a successful artwork write, the AI tab should show traffic or the
    // collecting-since empty copy only if filters exclude the new rows.
    if (baseline.total + 1 <= after.total) {
      const requestsMatch = body.match(/ai requests[\s\S]{0,80}?([\d,]+)/i);
      if (requestsMatch) {
        const shown = Number(requestsMatch[1].replace(/,/g, ""));
        expect(shown).toBeGreaterThan(0);
      }
    }

    // Connected tab should load without fake Operational health.
    await page.getByRole("link", { name: /^connected apis$/i }).click();
    await expect(page).toHaveURL(/tab=connected/);
    const connectedBody = await mainContent(page).innerText();
    expect(connectedBody).toMatch(/connected|meta|resend|google/i);
    expect(connectedBody).not.toMatch(/\bOperational\b/);
  });
});
