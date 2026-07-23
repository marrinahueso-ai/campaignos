import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeTasksV2SummaryStats,
  parseTasksV2SummaryFilter,
  taskMatchesSummaryFilter,
} from "../summary-stats.ts";
import type { TaskHubTaskItem } from "../../../types/task-hub.ts";

function makeTask(
  overrides: Partial<TaskHubTaskItem> & Pick<TaskHubTaskItem, "id" | "title">,
): TaskHubTaskItem {
  return {
    eventId: "event-1",
    status: "todo",
    sortOrder: 0,
    dueDate: null,
    assigneeName: null,
    assigneeInitials: null,
    assigneeUserId: null,
    groupId: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    event: {
      eventId: "event-1",
      eventTitle: "Book Fair",
      eventDate: "2026-07-01",
      eventHref: "/events/event-1?tab=tasks",
    },
    monday: null,
    ...overrides,
  };
}

const TODAY = "2026-07-18";

describe("taskMatchesSummaryFilter", () => {
  it("tasks_due matches open tasks due in the next 7 days", () => {
    assert.equal(
      taskMatchesSummaryFilter(
        makeTask({ id: "1", title: "Soon", dueDate: "2026-07-20" }),
        "tasks_due",
        TODAY,
      ),
      true,
    );
    assert.equal(
      taskMatchesSummaryFilter(
        makeTask({ id: "2", title: "Later", dueDate: "2026-08-01" }),
        "tasks_due",
        TODAY,
      ),
      false,
    );
    assert.equal(
      taskMatchesSummaryFilter(
        makeTask({
          id: "3",
          title: "Done soon",
          status: "done",
          dueDate: "2026-07-20",
        }),
        "tasks_due",
        TODAY,
      ),
      false,
    );
  });

  it("overdue matches open past-due tasks", () => {
    assert.equal(
      taskMatchesSummaryFilter(
        makeTask({ id: "1", title: "Late", dueDate: "2026-07-01" }),
        "overdue",
        TODAY,
      ),
      true,
    );
    assert.equal(
      taskMatchesSummaryFilter(
        makeTask({
          id: "2",
          title: "Done late",
          status: "done",
          dueDate: "2026-07-01",
        }),
        "overdue",
        TODAY,
      ),
      false,
    );
  });

  it("completed matches done tasks updated this month", () => {
    assert.equal(
      taskMatchesSummaryFilter(
        makeTask({
          id: "1",
          title: "Finished",
          status: "done",
          updatedAt: "2026-07-10T12:00:00.000Z",
        }),
        "completed",
        TODAY,
      ),
      true,
    );
    assert.equal(
      taskMatchesSummaryFilter(
        makeTask({
          id: "2",
          title: "Old finish",
          status: "done",
          updatedAt: "2026-06-10T12:00:00.000Z",
        }),
        "completed",
        TODAY,
      ),
      false,
    );
  });
});

describe("computeTasksV2SummaryStats", () => {
  it("counts each card metric independently", () => {
    const stats = computeTasksV2SummaryStats(
      [
        makeTask({ id: "1", title: "Due", dueDate: "2026-07-20" }),
        makeTask({ id: "2", title: "Late", dueDate: "2026-07-01" }),
        makeTask({
          id: "3",
          title: "Done",
          status: "done",
          updatedAt: "2026-07-05T00:00:00.000Z",
        }),
        makeTask({ id: "4", title: "No due" }),
      ],
      TODAY,
    );
    assert.deepEqual(stats, {
      tasksDue: 1,
      overdue: 1,
      completedThisMonth: 1,
    });
  });
});

describe("parseTasksV2SummaryFilter", () => {
  it("parses known values and rejects others", () => {
    assert.equal(parseTasksV2SummaryFilter("tasks_due"), "tasks_due");
    assert.equal(parseTasksV2SummaryFilter("overdue"), "overdue");
    assert.equal(parseTasksV2SummaryFilter("completed"), "completed");
    assert.equal(parseTasksV2SummaryFilter("this_week"), null);
    assert.equal(parseTasksV2SummaryFilter(null), null);
  });
});
