import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { taskAssigneeMatchesUser } from "../../task-hub/access.ts";
import {
  filterEventGroupsForMyView,
  filterTasksForMyView,
} from "../my-tasks-filter.ts";
import type { TaskHubTaskItem } from "../../../types/task-hub.ts";
import type { TasksV2EventGroup } from "../../../types/tasks-v2.ts";

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
    groupId: null,
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

describe("taskAssigneeMatchesUser", () => {
  it("matches display name", () => {
    assert.equal(
      taskAssigneeMatchesUser("Marina Osborn", {
        displayName: "Marina Osborn",
        email: "marina@example.com",
      }),
      true,
    );
  });

  it("rejects other assignees", () => {
    assert.equal(
      taskAssigneeMatchesUser("Alex Other", {
        displayName: "Marina Osborn",
        email: "marina@example.com",
      }),
      false,
    );
  });
});

describe("filterTasksForMyView", () => {
  const viewer = {
    displayName: "Marina Osborn",
    email: "marina@example.com",
  };

  const tasks = [
    makeTask({
      id: "1",
      title: "Mine open",
      assigneeName: "Marina Osborn",
      status: "todo",
      dueDate: "2026-07-20",
    }),
    makeTask({
      id: "2",
      title: "Mine overdue",
      assigneeName: "Marina",
      status: "in_progress",
      dueDate: "2026-07-01",
    }),
    makeTask({
      id: "3",
      title: "Mine done",
      assigneeName: "Marina Osborn",
      status: "done",
      dueDate: "2026-07-10",
    }),
    makeTask({
      id: "4",
      title: "Someone else",
      assigneeName: "Alex Other",
      status: "todo",
      dueDate: "2026-07-20",
    }),
  ];

  it("my_tasks returns open tasks for the viewer only", () => {
    const result = filterTasksForMyView(tasks, viewer, "my_tasks", "2026-07-18");
    assert.deepEqual(
      result.map((task) => task.id).sort(),
      ["1", "2"],
    );
  });

  it("overdue filters by due date", () => {
    const result = filterTasksForMyView(tasks, viewer, "overdue", "2026-07-18");
    assert.deepEqual(
      result.map((task) => task.id),
      ["2"],
    );
  });

  it("completed returns done tasks for the viewer", () => {
    const result = filterTasksForMyView(tasks, viewer, "completed", "2026-07-18");
    assert.deepEqual(
      result.map((task) => task.id),
      ["3"],
    );
  });
});

describe("filterEventGroupsForMyView", () => {
  it("drops empty event groups after filter", () => {
    const groups: TasksV2EventGroup[] = [
      {
        eventId: "event-1",
        eventTitle: "Book Fair",
        eventDate: "2026-07-01",
        eventHref: "/events/event-1",
        accentColor: "#000",
        doneCount: 0,
        totalCount: 1,
        tasks: [
          makeTask({
            id: "1",
            title: "Mine",
            assigneeName: "Marina Osborn",
            status: "todo",
          }),
        ],
      },
      {
        eventId: "event-2",
        eventTitle: "Carnival",
        eventDate: "2026-08-01",
        eventHref: "/events/event-2",
        accentColor: "#111",
        doneCount: 0,
        totalCount: 1,
        tasks: [
          makeTask({
            id: "2",
            title: "Theirs",
            eventId: "event-2",
            assigneeName: "Alex",
            status: "todo",
            event: {
              eventId: "event-2",
              eventTitle: "Carnival",
              eventDate: "2026-08-01",
              eventHref: "/events/event-2?tab=tasks",
            },
          }),
        ],
      },
    ];

    const filtered = filterEventGroupsForMyView(
      groups,
      { displayName: "Marina Osborn", email: null },
      "my_tasks",
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.eventId, "event-1");
  });
});
