import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildEventCoverageItems,
  buildPostsWeekEveryoneCounts,
  buildWaitingOnOthersEveryoneCounts,
  derivePostWeekStatus,
  filterPostsWeekMine,
  filterPostsWeekScheduledThisWeek,
  filterWaitingOnOthersMine,
  isDateInWeek,
} from "../dashboard-library-widget-filters.ts";
import {
  DASHBOARD_WIDGET_CATALOG,
  isDashboardWidgetId,
} from "../dashboard-widgets.ts";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

function sampleApproval(
  overrides: Partial<UnifiedApprovalItem> = {},
): UnifiedApprovalItem {
  return {
    id: "item-1",
    source: "campaign_builder",
    eventId: "event-1",
    eventTitle: "Fall Festival",
    campaignName: "Fall Festival",
    milestoneName: "Reminder post",
    thumbnailUrl: null,
    workflowStatus: "scheduled",
    statusDetail: "Scheduled",
    assigneeName: "Jess",
    assigneeRole: "Treasurer",
    assigneeInitials: "JS",
    nextAction: "Publish",
    nextActionTime: "Wed 9 AM",
    deliveryMethod: "schedule",
    platforms: ["facebook"],
    scheduleAt: "2026-07-30T14:00:00.000Z",
    scheduleLabel: "Wed 9:00 AM",
    assignedToMe: false,
    submittedByMe: true,
    hasAssignedUser: true,
    approvalRequestId: null,
    communicationItemId: null,
    schedulingItemId: "sched-1",
    campaignMilestoneId: null,
    metaRelativeDay: null,
    publishError: null,
    channel: "facebook",
    notes: null,
    preview: {
      captionText: null,
      storyCaptionSnippet: null,
      feedArtworkUrl: null,
      storyArtworkUrl: null,
    },
    requestedAt: "2026-07-27T12:00:00.000Z",
    approvalHistory: [],
    ...overrides,
  };
}

describe("dashboard library widgets", () => {
  it("registers posts_week, waiting_others, and event_coverage in catalog", () => {
    for (const id of ["posts_week", "waiting_others", "event_coverage"] as const) {
      assert.equal(isDashboardWidgetId(id), true);
      const entry = DASHBOARD_WIDGET_CATALOG.find((widget) => widget.id === id);
      assert.ok(entry);
      assert.equal(entry?.phase, 3);
      assert.equal(entry?.region, "main");
    }
  });

  it("keeps new widgets out of the default layout", () => {
    const page = readSrc("../../../app/(dashboard)/dashboard/page.tsx");
    const widgets = readSrc("../dashboard-widgets.ts");
    assert.doesNotMatch(widgets, /main:\s*\[[^\]]*posts_week/);
    assert.doesNotMatch(widgets, /main:\s*\[[^\]]*waiting_others/);
    assert.doesNotMatch(widgets, /main:\s*\[[^\]]*event_coverage/);
    assert.match(page, /PostsThisWeekWidget/);
    assert.match(page, /WaitingOnOthersWidget/);
    assert.match(page, /EventCoverageWidget/);
  });

  it("filters posts scheduled this week and mine lens", () => {
    const today = "2026-07-28";
    const weekEnd = "2026-08-04";
    const items = [
      sampleApproval({ id: "a", submittedByMe: true, assignedToMe: false }),
      sampleApproval({
        id: "b",
        submittedByMe: false,
        assignedToMe: true,
        workflowStatus: "assigned_to_me",
        scheduleAt: "2026-08-10T14:00:00.000Z",
      }),
      sampleApproval({
        id: "c",
        submittedByMe: true,
        workflowStatus: "published",
      }),
    ];

    assert.equal(
      filterPostsWeekScheduledThisWeek(items, today, weekEnd).length,
      1,
    );
    assert.equal(filterPostsWeekMine(items, "user-1").length, 2);
    assert.equal(derivePostWeekStatus(items[0]!), "scheduled");
    assert.equal(derivePostWeekStatus(items[1]!), "needs_approval");
  });

  it("builds everyone post counts and waiting-on-others filters", () => {
    const today = "2026-07-28";
    const weekEnd = "2026-08-04";
    const items = [
      sampleApproval({ id: "a", workflowStatus: "scheduled" }),
      sampleApproval({
        id: "b",
        submittedByMe: false,
        assignedToMe: true,
        workflowStatus: "assigned_to_me",
        scheduleAt: "2026-07-28T15:00:00.000Z",
      }),
      sampleApproval({
        id: "c",
        submittedByMe: true,
        assignedToMe: false,
        workflowStatus: "in_queue",
      }),
    ];

    const counts = buildPostsWeekEveryoneCounts(items, today, weekEnd);
    assert.equal(counts.scheduledThisWeek, 1);
    assert.equal(counts.needsApprovalFirst, 2);
    assert.equal(counts.goingOutToday, 1);

    const waitingMine = filterWaitingOnOthersMine(items);
    assert.equal(waitingMine.length, 1);
    assert.equal(waitingMine[0]?.id, "c");

    const waitingEveryone = buildWaitingOnOthersEveryoneCounts({
      approvals: items,
      tasks: [],
      viewerUserId: "viewer-1",
      today,
    });
    assert.equal(waitingEveryone.blockedApprovals, 1);
  });

  it("detects upcoming events missing leads", () => {
    const today = "2026-07-28";
    const rows = buildEventCoverageItems({
      today,
      events: [
        {
          id: "event-1",
          title: "Teacher Appreciation Week",
          date: "2026-08-09",
          status: "active",
          communicationStrategy: "full_campaign",
          eventOwner: null,
        } as import("@/types").Event,
      ],
      committees: [
        {
          id: "committee-1",
          organizationId: "org-1",
          name: "Teacher Appreciation",
          assignedEventId: "event-1",
          parentRoleId: null,
          sortOrder: 0,
          active: true,
        },
      ],
      members: [],
      committeeAssignments: [],
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.status, "needs_lead");
    assert.match(rows[0]?.detailLine ?? "", /No event lead assigned/);
  });

  it("isDateInWeek respects week boundaries", () => {
    assert.equal(isDateInWeek("2026-07-28", "2026-07-28", "2026-08-04"), true);
    assert.equal(isDateInWeek("2026-08-05", "2026-07-28", "2026-08-04"), false);
    assert.equal(isDateInWeek(null, "2026-07-28", "2026-08-04"), false);
  });
});
