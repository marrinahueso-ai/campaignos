import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildManualEmailPersistenceFields,
  isManualUploadEmailDue,
  previewHasManualStoryKit,
  resolveManualEmailSendIso,
  resolveManualUploadEmailDueAt,
  resolveStoryKitCaption,
} from "../manual-email-scheduling.ts";
import type { MilestonePreviewContent } from "../types.ts";

function basePreview(
  overrides: Partial<MilestonePreviewContent> = {},
): MilestonePreviewContent {
  return {
    milestoneId: "ms-1",
    status: "ready",
    generationStatus: "generated",
    generationStartedAt: null,
    artwork: { feedUrl: null, storyUrl: "https://x/story.png" },
    captions: [
      { platform: "facebook", text: "Feed caption" },
      { platform: "instagram", text: "Story caption" },
    ],
    enabledFormats: ["instagram-story-manual"],
    platforms: ["instagram"],
    deliveryMethod: "schedule",
    scheduleDate: "2026-09-01",
    scheduleTime: "09:00",
    emailSendDate: "2026-09-02",
    emailSendTime: "08:00",
    manualEmailTo: "socials@example.com",
    manualUploadLink: "",
    approvalStatuses: [],
    ...overrides,
  } as MilestonePreviewContent;
}

describe("manual-email-scheduling", () => {
  it("detects story kit from delivery, format, or Send-to", () => {
    assert.equal(
      previewHasManualStoryKit(
        basePreview({ deliveryMethod: "manual-email", manualEmailTo: "" }),
      ),
      true,
    );
    assert.equal(
      previewHasManualStoryKit(
        basePreview({
          deliveryMethod: "schedule",
          enabledFormats: ["instagram-feed"],
          manualEmailTo: "a@b.com",
        }),
      ),
      true,
    );
    assert.equal(
      previewHasManualStoryKit(
        basePreview({
          deliveryMethod: "schedule",
          enabledFormats: ["instagram-feed"],
          manualEmailTo: "",
        }),
      ),
      false,
    );
  });

  it("persists manual_email_send_at separately from Meta schedule fields", () => {
    const preview = basePreview();
    const fields = buildManualEmailPersistenceFields(preview);
    assert.equal(fields.manual_email_to, "socials@example.com");
    assert.ok(fields.manual_email_send_at);
    assert.equal(
      fields.manual_email_send_at,
      resolveManualEmailSendIso(preview),
    );
  });

  it("returns null email send time when no story kit applies", () => {
    const fields = buildManualEmailPersistenceFields(
      basePreview({
        deliveryMethod: "schedule",
        enabledFormats: ["facebook-feed"],
        manualEmailTo: "",
      }),
    );
    assert.equal(fields.manual_email_to, null);
    assert.equal(fields.manual_email_send_at, null);
  });
});

describe("story kit caption (email template)", () => {
  it("renders exactly one caption preference: story wins, then feed", () => {
    assert.equal(
      resolveStoryKitCaption("  Story  ", "Feed"),
      "Story",
    );
    assert.equal(resolveStoryKitCaption("", "Feed caption"), "Feed caption");
    assert.equal(resolveStoryKitCaption(null, null), "");
  });
});

describe("manual upload email cron due helpers", () => {
  it("prefers manual_email_send_at over schedule_at", () => {
    assert.equal(
      resolveManualUploadEmailDueAt({
        manual_email_send_at: "2026-09-02T13:00:00.000Z",
        schedule_at: "2026-09-01T14:00:00.000Z",
      }),
      "2026-09-02T13:00:00.000Z",
    );
  });

  it("falls back to schedule_at for hybrid rows without dedicated email time", () => {
    assert.equal(
      resolveManualUploadEmailDueAt({
        manual_email_send_at: null,
        schedule_at: "2026-09-01T14:00:00.000Z",
      }),
      "2026-09-01T14:00:00.000Z",
    );
  });

  it("keeps failed/not-yet-sent items retryable by due-window rules", () => {
    const now = new Date("2026-09-02T12:00:00.000Z");
    assert.equal(isManualUploadEmailDue(null, now), true);
    assert.equal(
      isManualUploadEmailDue("2026-09-02T11:00:00.000Z", now),
      true,
    );
    assert.equal(
      isManualUploadEmailDue("2026-09-02T13:00:00.000Z", now),
      false,
    );
    assert.equal(
      isManualUploadEmailDue("2026-08-01T12:00:00.000Z", now),
      false,
    );
  });
});
