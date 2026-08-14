import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * Security/reliability regression guard: `sendStoryPostKitForMilestone` is
 * called both interactively (session-scoped, after schedule/publish) and by
 * the daily `story-post-reminders` cron (no user session). Before this fix,
 * every internal read/write in this file used the plain session client
 * (`createClient()`), so the cron path silently hit RLS with zero rows and
 * every reminder failed with "Post not found." / "Event not found." — the
 * same bug class fixed for the meta-token-health cron. This pins that:
 *   1. the shared helper accepts a `useServiceRole` flag defaulting to false
 *      (interactive callers keep normal session-scoped RLS), and
 *   2. the cron caller explicitly opts into service role.
 */
function readSrc(relativePath: string): string {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  return readFileSync(path, "utf8");
}

describe("send-story-post-kit — useServiceRole wiring", () => {
  it("imports createJobClient instead of the plain session client", () => {
    const src = readSrc("../send-story-post-kit.ts");
    assert.match(src, /import \{ createJobClient \} from "@\/lib\/supabase\/job-client";/);
    assert.doesNotMatch(
      src,
      /import \{ createClient \} from "@\/lib\/supabase\/server";/,
    );
  });

  it("sendStoryPostKitForMilestone defaults useServiceRole to false", () => {
    const src = readSrc("../send-story-post-kit.ts");
    assert.match(src, /useServiceRole\?\s*:\s*boolean;/);
    assert.match(src, /const useServiceRole = input\.useServiceRole \?\? false;/);
  });

  it("every internal Supabase client creation in this file goes through createJobClient(useServiceRole)", () => {
    const src = readSrc("../send-story-post-kit.ts");
    const jobClientCalls = src.match(/createJobClient\(useServiceRole\)/g) ?? [];
    // resolveStoryArtworkUrl, resolveScheduledFor, markReminderSent, and the
    // main function body — 4 call sites total.
    assert.equal(jobClientCalls.length, 4);
  });

  it("getMetaSocialCaptionsForEvent is called with the same useServiceRole flag", () => {
    const src = readSrc("../send-story-post-kit.ts");
    assert.match(
      src,
      /getMetaSocialCaptionsForEvent\(input\.eventId, \{\s*useServiceRole,?\s*\}\)/,
    );
  });

  it("the interactive publish-actions caller does not opt into service role", () => {
    const src = readSrc("../actions.ts");
    const callStart = src.indexOf("await sendStoryPostKitForMilestone({");
    assert.ok(callStart >= 0, "sendStoryPostKitForMilestone call not found in actions.ts");
    const callBlock = src.slice(callStart, callStart + 200);
    assert.doesNotMatch(callBlock, /useServiceRole/);
  });

  it("the cron caller (send-story-post-reminders) explicitly passes useServiceRole: true", () => {
    const src = readSrc("../send-story-post-reminders.ts");
    const callStart = src.indexOf("await sendStoryPostKitForMilestone({");
    assert.ok(callStart >= 0, "sendStoryPostKitForMilestone call not found in send-story-post-reminders.ts");
    const callBlock = src.slice(callStart, callStart + 400);
    assert.match(callBlock, /useServiceRole:\s*true/);
  });
});
