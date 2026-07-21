import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatDeterministicOpsAnswer,
  serializeOpsContextForPrompt,
  type OpsContextPack,
} from "../ops-context-format.ts";

function samplePack(overrides: Partial<OpsContextPack> = {}): OpsContextPack {
  const base: OpsContextPack = {
    event: {
      id: "evt-1",
      title: "Back to School Fair",
      date: "2026-08-20",
      status: "scheduled",
    },
    nextAction: {
      action: "Post two-week reminder",
      dueMessage: "Due tomorrow",
    },
    tasks: {
      incompleteCount: 2,
      overdueCount: 1,
      overdue: [
        {
          id: "t1",
          title: "Confirm volunteer leads",
          status: "todo",
          dueDate: "2026-07-01",
          overdue: true,
        },
      ],
      incomplete: [
        {
          id: "t1",
          title: "Confirm volunteer leads",
          status: "todo",
          dueDate: "2026-07-01",
          overdue: true,
        },
        {
          id: "t2",
          title: "Print flyers",
          status: "in_progress",
          dueDate: "2026-08-01",
          overdue: false,
        },
      ],
    },
    approvals: {
      pendingCount: 1,
      changesRequestedCount: 0,
      items: [
        {
          id: "a1",
          label: "Save-the-date graphic",
          status: "in_queue",
          source: "scheduling",
        },
      ],
    },
    schedule: {
      today: [],
      tomorrow: [
        {
          id: "s1",
          milestoneName: "Two-week reminder",
          scheduleAt: "2026-07-22T15:00:00Z",
          scheduleDate: "2026-07-22",
        },
      ],
      thisWeek: [
        {
          id: "s1",
          milestoneName: "Two-week reminder",
          scheduleAt: "2026-07-22T15:00:00Z",
          scheduleDate: "2026-07-22",
        },
      ],
    },
    readiness: {
      milestoneCount: 5,
      builderStep: "preview",
      summary: 'Create with AI is on the “preview” step (5 milestones).',
    },
    links: [
      { label: "Event tasks", href: "/events/evt-1?tab=tasks" },
      { label: "Approvals", href: "/approvals?event=evt-1" },
      { label: "Create with AI", href: "/events/evt-1/campaign-builder#inspiration" },
    ],
  };

  return { ...base, ...overrides };
}

describe("formatDeterministicOpsAnswer", () => {
  it("cites concrete facts from the context pack", () => {
    const answer = formatDeterministicOpsAnswer(samplePack());
    assert.match(answer, /Back to School Fair/);
    assert.match(answer, /Post two-week reminder/);
    assert.match(answer, /Confirm volunteer leads/);
    assert.match(answer, /1 pending/);
    assert.match(answer, /preview/);
    assert.match(answer, /Tasks|Approvals|Create with AI/i);
  });

  it("does not invent overdue items when none exist", () => {
    const answer = formatDeterministicOpsAnswer(
      samplePack({
        tasks: {
          incompleteCount: 0,
          overdueCount: 0,
          overdue: [],
          incomplete: [],
        },
        approvals: {
          pendingCount: 0,
          changesRequestedCount: 0,
          items: [],
        },
        schedule: { today: [], tomorrow: [], thisWeek: [] },
      }),
    );
    assert.match(answer, /no incomplete playbook tasks/i);
    assert.match(answer, /nothing pending/i);
    assert.match(answer, /Publishing today: none/i);
    assert.doesNotMatch(answer, /Confirm volunteer leads/);
  });
});

describe("serializeOpsContextForPrompt", () => {
  it("includes deep links and counts for the model", () => {
    const json = serializeOpsContextForPrompt(samplePack());
    const parsed = JSON.parse(json) as {
      tasks: { overdueCount: number };
      links: Array<{ href: string }>;
    };
    assert.equal(parsed.tasks.overdueCount, 1);
    assert.ok(parsed.links.some((link) => link.href.includes("tab=tasks")));
  });
});
