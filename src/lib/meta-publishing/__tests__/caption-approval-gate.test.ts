import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("bundleIsSchedulable — no draft-content bypass", () => {
  it("only returns true for the terminal schedulable statuses (no needs_caption/needs_artwork escape hatch)", () => {
    const src = readSrc("../bundle-display.ts");
    const fnStart = src.indexOf("export function bundleIsSchedulable(");
    assert.ok(fnStart >= 0, "bundleIsSchedulable not found");
    const fnEnd = src.indexOf("\n}\n", fnStart);
    const fnBody = src.slice(fnStart, fnEnd >= 0 ? fnEnd : undefined);

    // The old bug: needs_caption/needs_artwork bundles were schedulable as
    // long as *some* draft caption/artwork preview text existed.
    assert.doesNotMatch(fnBody, /needs_caption/);
    assert.doesNotMatch(fnBody, /needs_artwork/);
    assert.doesNotMatch(fnBody, /bundleHasReviewPublishContent/);
    assert.match(fnBody, /REVIEW_PUBLISH_SCHEDULABLE_STATUSES\.includes\(bundle\.status\)/);
  });

  it("bundleHasReviewPublishContent still exists for review-list visibility only", () => {
    const src = readSrc("../bundle-display.ts");
    assert.match(src, /export function bundleHasReviewPublishContent/);
    // Still wired into visibility, not into the schedulable/publishable gate.
    const visibleStart = src.indexOf("export function isReviewPublishVisibleBundle(");
    assert.ok(visibleStart >= 0);
    assert.match(src.slice(visibleStart), /bundleHasReviewPublishContent\(bundle\)/);
  });
});

describe("publishMetaMilestoneBundle — captions must be status=approved, not just non-empty", () => {
  it("checks caption row status, not just trimmed content, before allowing Graph publish", () => {
    const src = readSrc("../publish-milestone.ts");
    assert.match(src, /getCaptionForMilestone/);
    assert.doesNotMatch(src, /getFeedCaptionForMilestone|getStoryCaptionForMilestone/);
    assert.match(src, /feedCaptionRow\?\.status === "approved"/);
    assert.match(src, /storyCaptionRow\?\.status === "approved"/);
    assert.match(src, /!feedCaptionApproved/);
    assert.match(src, /!storyCaptionApproved/);
  });
});

describe("meta-publishing actions — monthly post-capacity gate on all immediate/retry publish paths", () => {
  it("publishAllActionableMetaBundlesNowAction checks capacity before publishing", () => {
    const src = readSrc("../actions.ts");
    const start = src.indexOf(
      "export async function publishAllActionableMetaBundlesNowAction(",
    );
    assert.ok(start >= 0);
    const end = src.indexOf("\nexport async function", start + 10);
    const body = src.slice(start, end >= 0 ? end : undefined);
    assert.match(body, /assertMetaPostCapacityForEvent\(eventId\)/);
  });

  it("publishAllApprovedMetaBundlesAction checks capacity before publishing", () => {
    const src = readSrc("../actions.ts");
    const start = src.indexOf(
      "export async function publishAllApprovedMetaBundlesAction(",
    );
    assert.ok(start >= 0);
    const end = src.indexOf("\nexport async function", start + 10);
    const body = src.slice(start, end >= 0 ? end : undefined);
    assert.match(body, /assertMetaPostCapacityForEvent\(eventId\)/);
  });

  it("publishMetaBundleAction (also used by retryFailedMetaBundleAction) checks capacity", () => {
    const src = readSrc("../actions.ts");
    const start = src.indexOf("export async function publishMetaBundleAction(");
    assert.ok(start >= 0);
    const end = src.indexOf("\nexport async function", start + 10);
    const body = src.slice(start, end >= 0 ? end : undefined);
    assert.match(body, /assertMetaPostCapacityForEvent\(eventId\)/);
  });
});

describe("native-schedule — Meta-native (Graph) schedules must never carry unapproved captions", () => {
  it("createNativeMetaSchedulesForMilestone checks caption status before creating a Graph schedule", () => {
    const src = readSrc("../native-schedule.ts");
    assert.match(src, /getCaptionForMilestone/);
    assert.doesNotMatch(src, /getFeedCaptionForMilestone|getStoryCaptionForMilestone/);

    const start = src.indexOf(
      "export async function createNativeMetaSchedulesForMilestone(",
    );
    assert.ok(start >= 0);
    const end = src.indexOf(
      "export async function rescheduleNativeMetaSchedulesForMilestone(",
      start,
    );
    const body = src.slice(start, end >= 0 ? end : undefined);

    assert.match(body, /feedCaptionRow\?\.status === "approved"/);
    assert.match(body, /if \(!feedCaptionApproved\)/);
    // The unapproved-caption check must run before scheduleFacebookFeedPhoto
    // is ever reached for that slot in the loop.
    const checkIdx = body.indexOf("if (!feedCaptionApproved)");
    const scheduleCallIdx = body.indexOf("createOrReplaceFacebookFeedSchedule(");
    assert.ok(checkIdx >= 0 && scheduleCallIdx >= 0 && checkIdx < scheduleCallIdx);
  });

  it("rescheduleNativeMetaSchedulesForMilestone never recreates a Graph schedule with an unapproved caption", () => {
    const src = readSrc("../native-schedule.ts");
    const start = src.indexOf(
      "export async function rescheduleNativeMetaSchedulesForMilestone(",
    );
    assert.ok(start >= 0);
    const body = src.slice(start);

    assert.match(body, /feedCaptionApproved = feedCaptionRow\?\.status === "approved"/);
    // The delete+recreate fallback (which pushes caption text to Graph) is
    // gated on feedCaptionApproved, alongside the existing feedUrl guard.
    const guardIdx = body.indexOf("if (\n      feedUrl &&\n      feedCaptionApproved");
    assert.ok(guardIdx >= 0, "recreate fallback is not gated on feedCaptionApproved");
  });
});
