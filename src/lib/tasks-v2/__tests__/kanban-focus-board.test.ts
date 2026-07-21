import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  focusColumnDropPatch,
  groupTasksByFocusColumn,
  resolveFocusBoardColumn,
} from "../kanban-focus-board.ts";
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

describe("resolveFocusBoardColumn", () => {
  const today = "2026-07-18";

  it("puts done tasks in Done", () => {
    assert.equal(
      resolveFocusBoardColumn(
        makeTask({ id: "1", title: "Done", status: "done" }),
        undefined,
        today,
      ),
      "done",
    );
  });

  it("puts in-progress ahead of due-this-week", () => {
    assert.equal(
      resolveFocusBoardColumn(
        makeTask({
          id: "1",
          title: "Working",
          status: "in_progress",
          dueDate: "2026-07-20",
        }),
        undefined,
        today,
      ),
      "in_progress",
    );
  });

  it("puts open tasks due this week in This week", () => {
    assert.equal(
      resolveFocusBoardColumn(
        makeTask({
          id: "1",
          title: "Soon",
          status: "todo",
          dueDate: "2026-07-20",
        }),
        undefined,
        today,
      ),
      "this_week",
    );
  });

  it("puts backlog open tasks in To-do", () => {
    assert.equal(
      resolveFocusBoardColumn(
        makeTask({
          id: "1",
          title: "Later",
          status: "blocked",
          dueDate: "2026-08-01",
        }),
        undefined,
        today,
      ),
      "todo",
    );
  });
});

describe("groupTasksByFocusColumn", () => {
  it("buckets tasks exclusively", () => {
    const groups = groupTasksByFocusColumn(
      [
        makeTask({ id: "1", title: "A", status: "todo", dueDate: null }),
        makeTask({
          id: "2",
          title: "B",
          status: "todo",
          dueDate: "2026-07-19",
        }),
        makeTask({ id: "3", title: "C", status: "in_progress" }),
        makeTask({ id: "4", title: "D", status: "done" }),
      ],
      {},
      "2026-07-18",
    );
    assert.deepEqual(
      groups.todo.map((t) => t.id),
      ["1"],
    );
    assert.deepEqual(
      groups.this_week.map((t) => t.id),
      ["2"],
    );
    assert.deepEqual(
      groups.in_progress.map((t) => t.id),
      ["3"],
    );
    assert.deepEqual(
      groups.done.map((t) => t.id),
      ["4"],
    );
  });
});

describe("focusColumnDropPatch", () => {
  it("sets due date when dropping into This week", () => {
    assert.deepEqual(focusColumnDropPatch("this_week", "2026-07-18"), {
      status: "todo",
      dueDate: "2026-07-18",
    });
  });

  it("clears due date when dropping into To-do", () => {
    assert.deepEqual(focusColumnDropPatch("todo"), {
      status: "todo",
      dueDate: null,
    });
  });
});
