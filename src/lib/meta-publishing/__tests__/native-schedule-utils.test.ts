import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMetaMilestoneRescheduleSlotUpdate,
  FACEBOOK_STORY_NATIVE_SCHEDULE_UNSUPPORTED,
  INSTAGRAM_NATIVE_SCHEDULE_UNSUPPORTED,
  isWithinMetaNativeScheduleWindow,
  META_NATIVE_SCHEDULE_MIN_LEAD_MS,
  nativeScheduleSoftFailReason,
  resolveGraphPostIdForUpdate,
  shouldSkipCampignOsCronPublish,
  slotSupportsMetaNativeSchedule,
  toUnixScheduledPublishTime,
} from "../native-schedule-utils.ts";

describe("native-schedule-utils", () => {
  it("only Facebook feed supports Meta-native Graph scheduling", () => {
    assert.equal(
      slotSupportsMetaNativeSchedule({ platform: "facebook", placement: "feed" }),
      true,
    );
    assert.equal(
      slotSupportsMetaNativeSchedule({ platform: "facebook", placement: "story" }),
      false,
    );
    assert.equal(
      slotSupportsMetaNativeSchedule({ platform: "instagram", placement: "feed" }),
      false,
    );
  });

  it("documents soft-fail reasons for Instagram and FB stories", () => {
    assert.equal(
      nativeScheduleSoftFailReason({ platform: "instagram", placement: "feed" }),
      INSTAGRAM_NATIVE_SCHEDULE_UNSUPPORTED,
    );
    assert.equal(
      nativeScheduleSoftFailReason({ platform: "facebook", placement: "story" }),
      FACEBOOK_STORY_NATIVE_SCHEDULE_UNSUPPORTED,
    );
    assert.equal(
      nativeScheduleSoftFailReason({ platform: "facebook", placement: "feed" }),
      null,
    );
  });

  it("skips CampignOS cron when a Graph schedule id is stored", () => {
    assert.equal(shouldSkipCampignOsCronPublish({ graphScheduleId: "123" }), true);
    assert.equal(shouldSkipCampignOsCronPublish({ graphScheduleId: "  " }), false);
    assert.equal(shouldSkipCampignOsCronPublish({ graphScheduleId: null }), false);
  });

  it("converts ISO times to unix seconds for scheduled_publish_time", () => {
    const iso = "2026-08-01T15:00:00.000Z";
    assert.equal(
      toUnixScheduledPublishTime(iso),
      Math.floor(Date.parse(iso) / 1000),
    );
    assert.equal(toUnixScheduledPublishTime("not-a-date"), null);
  });

  it("enforces Meta native schedule lead-time window", () => {
    const now = Date.parse("2026-07-21T12:00:00.000Z");
    const tooSoon = new Date(now + META_NATIVE_SCHEDULE_MIN_LEAD_MS - 1000).toISOString();
    const ok = new Date(now + 60 * 60 * 1000).toISOString();
    const tooFar = new Date(now + 80 * 24 * 60 * 60 * 1000).toISOString();

    assert.equal(isWithinMetaNativeScheduleWindow(tooSoon, now), false);
    assert.equal(isWithinMetaNativeScheduleWindow(ok, now), true);
    assert.equal(isWithinMetaNativeScheduleWindow(tooFar, now), false);
  });

  it("DnD slot update payload never includes status", () => {
    const payload = buildMetaMilestoneRescheduleSlotUpdate(
      "2026-08-01T15:00:00.000Z",
      "2026-07-21T12:00:00.000Z",
    );
    assert.deepEqual(payload, {
      scheduled_for: "2026-08-01T15:00:00.000Z",
      updated_at: "2026-07-21T12:00:00.000Z",
    });
    assert.equal("status" in payload, false);
  });

  it("tries bare photo id then page_post_id for Graph updates", () => {
    assert.deepEqual(
      resolveGraphPostIdForUpdate({ pageId: "99", scheduleId: "111" }),
      ["111", "99_111"],
    );
    assert.deepEqual(
      resolveGraphPostIdForUpdate({ pageId: "99", scheduleId: "99_111" }),
      ["99_111"],
    );
  });
});
