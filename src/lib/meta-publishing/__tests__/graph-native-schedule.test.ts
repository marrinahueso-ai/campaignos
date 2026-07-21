import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  resolveGraphPostIdForUpdate,
  updateGraphScheduleWithCandidates,
} from "../native-schedule-utils.ts";

function readSource(relativeFromThisFile: string): string {
  return readFileSync(new URL(relativeFromThisFile, import.meta.url), "utf8");
}

describe("Graph native schedule helpers", () => {
  it("graph-api exposes schedule create, update, and delete", () => {
    const source = readSource("../graph-api.ts");
    assert.match(source, /export async function scheduleFacebookFeedPhoto/);
    assert.match(source, /published:\s*["']false["']/);
    assert.match(source, /scheduled_publish_time/);
    assert.match(source, /export async function updateFacebookScheduledPublishTime/);
    assert.match(source, /export async function deleteFacebookGraphObject/);
  });

  it("native-schedule create hooks from approve paths", () => {
    const actions = readSource("../actions.ts");
    const cb2 = readSource("../../campaign-builder-v2/schedule-meta-from-approval.ts");
    assert.match(actions, /createNativeMetaSchedulesForMilestone/);
    assert.match(cb2, /createNativeMetaSchedulesForMilestone/);
  });

  it("publish-milestone skips cron for slots with graph_schedule_id", () => {
    const source = readSource("../publish-milestone.ts");
    assert.match(source, /shouldSkipCampignOsCronPublish/);
    assert.match(source, /clearNativeMetaSchedulesForSlots/);
  });

  it("mocked Graph update tries candidate post ids until one succeeds", async () => {
    const calls: string[] = [];
    const result = await updateGraphScheduleWithCandidates({
      pageId: "page1",
      scheduleId: "photo9",
      scheduledPublishTimeUnix: 1_800_000_000,
      updateFn: async (postId) => {
        calls.push(postId);
        if (postId === "page1_photo9") {
          return { ok: true, error: null };
        }
        return { ok: false, error: "not found" };
      },
    });

    assert.deepEqual(
      calls,
      resolveGraphPostIdForUpdate({ pageId: "page1", scheduleId: "photo9" }),
    );
    assert.equal(result.ok, true);
  });
});
