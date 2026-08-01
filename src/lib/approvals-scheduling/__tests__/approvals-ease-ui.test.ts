import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  APPROVALS_EASE_PULSE_OPTIONS,
  DEFAULT_APPROVALS_EASE_PULSE,
  approvalMatchesEasePulse,
  computeApprovalsEasePulseCounts,
} from "../approvals-ease-pulse.ts";
import {
  DEFAULT_EVENT_APPROVALS_EASE_SORT,
  sortEventApprovalsEaseItems,
} from "../event-approvals-ease-sort.ts";
import type { UnifiedApprovalItem } from "../types.ts";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

function stubItem(
  overrides: Partial<UnifiedApprovalItem> = {},
): UnifiedApprovalItem {
  return {
    id: "item-1",
    source: "campaign_builder",
    eventId: "event-1",
    eventTitle: "Spring Gala",
    campaignName: "Spring Gala",
    milestoneName: "Save the date",
    thumbnailUrl: null,
    workflowStatus: "assigned_to_me",
    statusDetail: "Due today",
    assigneeName: "Alex",
    assigneeRole: "Communications",
    assigneeInitials: "AL",
    nextAction: "Review and approve",
    nextActionTime: "Today",
    deliveryMethod: "schedule",
    platforms: ["facebook"],
    scheduleAt: null,
    scheduleLabel: null,
    assignedToMe: true,
    submittedByMe: false,
    hasAssignedUser: true,
    approvalRequestId: null,
    communicationItemId: null,
    schedulingItemId: "sched-1",
    campaignMilestoneId: "ms-1",
    metaRelativeDay: null,
    publishError: null,
    channel: null,
    notes: null,
    preview: {
      captionText: null,
      storyCaptionSnippet: null,
      feedArtworkUrl: null,
      storyArtworkUrl: null,
    },
    requestedAt: "2026-07-01T12:00:00.000Z",
    approvalHistory: [],
    ...overrides,
  };
}

describe("approvals ease pulse contracts", () => {
  it("does not expose a Drafts pulse filter", () => {
    const labels = APPROVALS_EASE_PULSE_OPTIONS.map((option) => option.label);
    const ids = APPROVALS_EASE_PULSE_OPTIONS.map((option) => option.id);

    assert.doesNotMatch(labels.join(" "), /Drafts/i);
    assert.equal(ids.includes("drafts" as never), false);
    assert.equal(DEFAULT_APPROVALS_EASE_PULSE, "needs");
  });

  it("routes draft-only outcomes out of scheduled and into no pulse bucket", () => {
    const draft = stubItem({
      workflowStatus: "scheduled",
      deliveryMethod: "draft-only",
    });

    assert.equal(approvalMatchesEasePulse(draft, "scheduled"), false);
    assert.equal(approvalMatchesEasePulse(draft, "needs"), false);
    assert.equal(approvalMatchesEasePulse(draft, "posted"), false);

    const counts = computeApprovalsEasePulseCounts([draft]);
    assert.equal(counts.scheduled, 0);
    assert.equal(counts.needs, 0);
  });

  it("org hub keeps pulse filters; event tab uses sort rail", () => {
    const hub = readSrc(
      "../../../components/approvals-scheduling/ApprovalsSchedulingHub.tsx",
    );
    const panel = readSrc(
      "../../../components/events-phase3/EventDetailApprovalsEasePanel.tsx",
    );

    assert.match(hub, /APPROVALS_EASE_PULSE_OPTIONS/);
    assert.doesNotMatch(hub, /label: "Drafts"/);
    assert.doesNotMatch(panel, /EasePulseMini/);
    assert.doesNotMatch(panel, /APPROVALS_EASE_PULSE_OPTIONS/);
    assert.match(panel, /EVENT_APPROVALS_EASE_SORT_OPTIONS/);
    assert.match(panel, /EaseListRail/);
    assert.doesNotMatch(panel, /label: "Drafts"/);
  });

  it("event approvals sort defaults to status and supports date ordering", () => {
    assert.equal(DEFAULT_EVENT_APPROVALS_EASE_SORT, "status");

    const failed = stubItem({
      id: "failed",
      workflowStatus: "failed",
      requestedAt: "2026-07-03T12:00:00.000Z",
    });
    const needs = stubItem({
      id: "needs",
      workflowStatus: "assigned_to_me",
      requestedAt: "2026-07-01T12:00:00.000Z",
    });
    const posted = stubItem({
      id: "posted",
      workflowStatus: "posted",
      requestedAt: "2026-07-02T12:00:00.000Z",
    });

    const byStatus = sortEventApprovalsEaseItems(
      [posted, needs, failed],
      "status",
    );
    assert.deepEqual(
      byStatus.map((item) => item.id),
      ["failed", "needs", "posted"],
    );

    const byNewest = sortEventApprovalsEaseItems(
      [needs, posted, failed],
      "newest",
    );
    assert.deepEqual(
      byNewest.map((item) => item.id),
      ["failed", "posted", "needs"],
    );
  });

  it("org approvals hub drops the campaign event dropdown", () => {
    const hub = readSrc(
      "../../../components/approvals-scheduling/ApprovalsSchedulingHub.tsx",
    );

    assert.doesNotMatch(hub, /campaign-filter/);
    assert.doesNotMatch(hub, /All campaigns/);
    assert.match(hub, /Search events, people, dates/);
    assert.match(hub, /shouldApplyApprovalsEasePulseFilter/);
  });

  it("fills focus art wells edge-to-edge while queue thumbs stay compact", () => {
    const ease = readSrc(
      "../../../components/approvals-scheduling/ApprovalsEaseList.tsx",
    );
    const table = readSrc(
      "../../../components/approvals-scheduling/ApprovalsTable.tsx",
    );

    assert.match(ease, /relative h-14 w-14 shrink-0 rounded-xl/);
    assert.match(ease, /grid overflow-hidden[\s\S]*minmax\(240px,300px\)_1fr/);
    assert.match(ease, /min-h-\[220px\] w-full self-stretch/);
    assert.match(ease, /resize: "cover"/);
    assert.match(ease, /className="object-cover object-center"/);
    assert.match(ease, /bg-cos-bg/);
    assert.match(ease, /sizes=\{width > 200 \?[\s\S]*: "56px"\}/);
    assert.match(ease, /loading=\{priority \? "eager" : "lazy"\}/);
    assert.match(ease, /ApprovalsQueueRow[\s\S]*ArtTile/);
    assert.match(ease, /ApprovalsQueueTable/);
    assert.match(ease, /Open full view/);
    assert.match(table, /height: 128,[\s\S]*resize: "cover"/);
    assert.match(table, /className="object-cover object-center"/);
    assert.match(table, /sizes="48px"/);
  });
});
