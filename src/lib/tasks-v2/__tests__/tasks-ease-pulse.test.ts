import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeTasksEasePulseCounts,
  parseTasksEasePulse,
  taskMatchesTasksEasePulse,
} from "../tasks-ease-pulse.ts";
import type { TaskHubTaskItem } from "../../../types/task-hub.ts";
import type { TasksV2Viewer } from "../../../types/tasks-v2.ts";

const VIEWER: TasksV2Viewer = {
  userId: "11111111-1111-4111-8111-111111111111",
  displayName: "Marrina",
  email: "marrina@example.com",
};

const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const TODAY = "2026-07-26";

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
      eventDate: "2026-08-01",
      eventHref: "/events/event-1?tab=tasks",
    },
    monday: null,
    ...overrides,
  };
}

describe("parseTasksEasePulse", () => {
  it("only accepts the four known pulse ids", () => {
    assert.equal(parseTasksEasePulse("needs"), "needs");
    assert.equal(parseTasksEasePulse("week"), "week");
    assert.equal(parseTasksEasePulse("overdue"), "overdue");
    assert.equal(parseTasksEasePulse("done"), "done");
    assert.equal(parseTasksEasePulse("bogus"), null);
    assert.equal(parseTasksEasePulse(null), null);
  });
});

describe("taskMatchesTasksEasePulse", () => {
  it("needs: open tasks assigned to the viewer", () => {
    const mine = makeTask({ id: "1", title: "Mine", assigneeUserId: VIEWER.userId, status: "todo" });
    const theirs = makeTask({ id: "2", title: "Theirs", assigneeUserId: OTHER_USER_ID, status: "todo" });
    const mineDone = makeTask({ id: "3", title: "Mine done", assigneeUserId: VIEWER.userId, status: "done" });

    assert.equal(taskMatchesTasksEasePulse(mine, "needs", VIEWER, TODAY), true);
    assert.equal(taskMatchesTasksEasePulse(theirs, "needs", VIEWER, TODAY), false);
    assert.equal(taskMatchesTasksEasePulse(mineDone, "needs", VIEWER, TODAY), false);
  });

  it("week: open tasks due within the next 7 days", () => {
    const dueSoon = makeTask({ id: "1", title: "Soon", dueDate: "2026-07-30", status: "todo" });
    const dueLater = makeTask({ id: "2", title: "Later", dueDate: "2026-08-20", status: "todo" });
    const noDate = makeTask({ id: "3", title: "No date", dueDate: null, status: "todo" });

    assert.equal(taskMatchesTasksEasePulse(dueSoon, "week", VIEWER, TODAY), true);
    assert.equal(taskMatchesTasksEasePulse(dueLater, "week", VIEWER, TODAY), false);
    assert.equal(taskMatchesTasksEasePulse(noDate, "week", VIEWER, TODAY), false);
  });

  it("overdue: open tasks with a past due date", () => {
    const overdue = makeTask({ id: "1", title: "Overdue", dueDate: "2026-07-01", status: "todo" });
    const done = makeTask({ id: "2", title: "Done", dueDate: "2026-07-01", status: "done" });

    assert.equal(taskMatchesTasksEasePulse(overdue, "overdue", VIEWER, TODAY), true);
    assert.equal(taskMatchesTasksEasePulse(done, "overdue", VIEWER, TODAY), false);
  });

  it("done: only completed tasks", () => {
    const done = makeTask({ id: "1", title: "Done", status: "done" });
    const open = makeTask({ id: "2", title: "Open", status: "todo" });

    assert.equal(taskMatchesTasksEasePulse(done, "done", VIEWER, TODAY), true);
    assert.equal(taskMatchesTasksEasePulse(open, "done", VIEWER, TODAY), false);
  });
});

describe("computeTasksEasePulseCounts", () => {
  it("tallies all four pulses independently", () => {
    const tasks = [
      makeTask({ id: "1", title: "Mine open", assigneeUserId: VIEWER.userId, status: "todo" }),
      makeTask({ id: "2", title: "Overdue", dueDate: "2026-07-01", status: "todo" }),
      makeTask({ id: "3", title: "This week", dueDate: "2026-07-27", status: "todo" }),
      makeTask({ id: "4", title: "Done", status: "done" }),
    ];

    const counts = computeTasksEasePulseCounts(tasks, VIEWER, TODAY);
    assert.equal(counts.needs, 1);
    assert.equal(counts.overdue, 1);
    assert.equal(counts.week, 1);
    assert.equal(counts.done, 1);
  });
});
