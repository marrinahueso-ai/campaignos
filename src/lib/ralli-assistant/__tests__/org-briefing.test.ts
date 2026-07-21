import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatDeterministicOrgBriefingAnswer,
  serializeOrgBriefingForPrompt,
  type OrgBriefingContextPack,
} from "../org-briefing-format.ts";

function samplePack(
  overrides: Partial<OrgBriefingContextPack> = {},
): OrgBriefingContextPack {
  const base: OrgBriefingContextPack = {
    organizationName: "Lincoln PTA",
    roleLabel: "President",
    approvalQueue: {
      assignedToMeCount: 2,
      allPendingCount: 3,
      changesRequestedCount: 1,
      assignedToMe: [
        {
          id: "a1",
          eventId: "evt-1",
          eventTitle: "Back to School Fair",
          label: "Save-the-date graphic",
          status: "pending",
          assignedToMe: true,
        },
        {
          id: "a2",
          eventId: "evt-2",
          eventTitle: "Spring Carnival",
          label: "Flyer copy",
          status: "pending",
          assignedToMe: true,
        },
      ],
      changesRequested: [
        {
          id: "a3",
          eventId: "evt-1",
          eventTitle: "Back to School Fair",
          label: "Reminder post",
          status: "changes_requested",
          assignedToMe: false,
        },
      ],
    },
    eventsNeedingAttention: [
      {
        id: "evt-1",
        title: "Back to School Fair",
        date: "2026-08-20",
        reasons: ["2 overdue tasks", "1 pending approval"],
        overdueTaskCount: 2,
        pendingApprovalCount: 1,
        changesRequestedCount: 0,
      },
    ],
    behindSchedule: {
      overdueTaskCount: 2,
      overdueTasks: [
        {
          id: "t1",
          title: "Confirm volunteer leads",
          eventId: "evt-1",
          eventTitle: "Back to School Fair",
          dueDate: "2026-07-01",
        },
      ],
      eventsBehind: [
        {
          id: "evt-1",
          title: "Back to School Fair",
          overdueTaskCount: 2,
        },
      ],
    },
    todaySummary: {
      attentionCount: 3,
      waitingOnMeCount: 2,
      publishingTodayCount: 1,
      publishingToday: [
        {
          id: "s1",
          milestoneName: "Two-week reminder",
          eventId: "evt-1",
          eventTitle: "Back to School Fair",
          scheduleDate: "2026-07-21",
        },
      ],
      eventsThisWeek: [
        { id: "evt-2", title: "Spring Carnival", date: "2026-07-24" },
      ],
    },
    thisWeek: {
      scheduledCount: 2,
      scheduled: [
        {
          id: "s1",
          milestoneName: "Two-week reminder",
          eventId: "evt-1",
          eventTitle: "Back to School Fair",
          scheduleDate: "2026-07-21",
        },
      ],
      events: [
        { id: "evt-2", title: "Spring Carnival", date: "2026-07-24" },
      ],
    },
    links: [
      { label: "Approvals", href: "/approvals" },
      { label: "Today", href: "/dashboard" },
      { label: "Tasks", href: "/tasks" },
    ],
  };

  return { ...base, ...overrides };
}

describe("formatDeterministicOrgBriefingAnswer", () => {
  it("cites concrete org facts from the context pack", () => {
    const answer = formatDeterministicOrgBriefingAnswer(samplePack());
    assert.match(answer, /President briefing/);
    assert.match(answer, /Lincoln PTA/);
    assert.match(answer, /Needs your approval \(2\)/);
    assert.match(answer, /Save-the-date graphic/);
    assert.match(answer, /Back to School Fair/);
    assert.match(answer, /Events needing attention/);
    assert.match(answer, /Behind schedule: 2 overdue/);
    assert.match(answer, /Confirm volunteer leads/);
    assert.match(answer, /Approvals|Today|Tasks/i);
  });

  it("does not invent approvals or overdue work when empty", () => {
    const answer = formatDeterministicOrgBriefingAnswer(
      samplePack({
        approvalQueue: {
          assignedToMeCount: 0,
          allPendingCount: 0,
          changesRequestedCount: 0,
          assignedToMe: [],
          changesRequested: [],
        },
        eventsNeedingAttention: [],
        behindSchedule: {
          overdueTaskCount: 0,
          overdueTasks: [],
          eventsBehind: [],
        },
        todaySummary: {
          attentionCount: 0,
          waitingOnMeCount: 0,
          publishingTodayCount: 0,
          publishingToday: [],
          eventsThisWeek: [],
        },
        thisWeek: {
          scheduledCount: 0,
          scheduled: [],
          events: [],
        },
      }),
    );
    assert.match(answer, /nothing assigned to you/i);
    assert.match(answer, /none flagged/i);
    assert.match(answer, /no overdue playbook tasks/i);
    assert.doesNotMatch(answer, /Save-the-date graphic/);
    assert.doesNotMatch(answer, /Confirm volunteer leads/);
  });
});

describe("serializeOrgBriefingForPrompt", () => {
  it("includes deep links and queue counts for the model", () => {
    const json = serializeOrgBriefingForPrompt(samplePack());
    const parsed = JSON.parse(json) as {
      approvalQueue: { assignedToMeCount: number };
      links: Array<{ href: string }>;
    };
    assert.equal(parsed.approvalQueue.assignedToMeCount, 2);
    assert.ok(parsed.links.some((link) => link.href === "/approvals"));
    assert.ok(parsed.links.some((link) => link.href === "/dashboard"));
  });
});
