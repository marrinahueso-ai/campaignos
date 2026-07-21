import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterEventGroupsForMyView,
  filterTasksForMyView,
  taskMatchesViewer,
} from "../my-tasks-filter.ts";
import type { TaskHubTaskItem } from "../../../types/task-hub.ts";
import type { TasksV2EventGroup } from "../../../types/tasks-v2.ts";

const VIEWER_USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

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

describe("taskMatchesViewer", () => {
  const viewer = {
    userId: VIEWER_USER_ID,
    displayName: "Marina Osborn",
    email: "marina@example.com",
  };

  it("matches by assignee_user_id", () => {
    assert.equal(
      taskMatchesViewer(
        makeTask({
          id: "1",
          title: "Mine",
          assigneeUserId: VIEWER_USER_ID,
          assigneeName: "Wrong Name",
        }),
        viewer,
      ),
      true,
    );
  });

  it("rejects other user ids", () => {
    assert.equal(
      taskMatchesViewer(
        makeTask({
          id: "1",
          title: "Theirs",
          assigneeUserId: OTHER_USER_ID,
          assigneeName: "Marina Osborn",
        }),
        viewer,
      ),
      false,
    );
  });

  it("falls back to name match when assignee_user_id is null", () => {
    assert.equal(
      taskMatchesViewer(
        makeTask({
          id: "1",
          title: "Legacy",
          assigneeUserId: null,
          assigneeName: "Marina Osborn",
        }),
        viewer,
      ),
      true,
    );
  });
});

describe("filterTasksForMyView", () => {
  const viewer = {
    userId: VIEWER_USER_ID,
    displayName: "Marina Osborn",
    email: "marina@example.com",
  };

  const tasks = [
    makeTask({
      id: "1",
      title: "Mine open",
      assigneeUserId: VIEWER_USER_ID,
      assigneeName: "Marina Osborn",
      status: "todo",
      dueDate: "2026-07-20",
    }),
    makeTask({
      id: "2",
      title: "Mine overdue",
      assigneeUserId: VIEWER_USER_ID,
      status: "in_progress",
      dueDate: "2026-07-01",
    }),
    makeTask({
      id: "3",
      title: "Mine done",
      assigneeUserId: VIEWER_USER_ID,
      status: "done",
      dueDate: "2026-07-10",
    }),
    makeTask({
      id: "4",
      title: "Someone else",
      assigneeUserId: OTHER_USER_ID,
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

  it("includeDone keeps completed cards for Kanban/Focus boards", () => {
    const result = filterTasksForMyView(
      tasks,
      viewer,
      "my_tasks",
      "2026-07-18",
      { includeDone: true },
    );
    assert.deepEqual(
      result.map((task) => task.id).sort(),
      ["1", "2", "3"],
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
            assigneeUserId: VIEWER_USER_ID,
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
            assigneeUserId: OTHER_USER_ID,
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
      {
        userId: VIEWER_USER_ID,
        displayName: "Marina Osborn",
        email: null,
      },
      "my_tasks",
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.eventId, "event-1");
  });
});
