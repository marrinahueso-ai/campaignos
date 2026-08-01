import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("tasks ease UI contracts", () => {
  const shell = readSrc("../../../components/tasks-v2/TasksEaseShell.tsx");
  const list = readSrc("../../../components/tasks-v2/TasksEaseList.tsx");
  const board = readSrc("../../../components/tasks-v2/TasksEaseBoard.tsx");
  const page = readSrc("../../../app/(dashboard)/tasks/page.tsx");

  it("wires /tasks to the Ease shell, not the dense TasksV2Shell", () => {
    assert.match(page, /TasksEaseShell/);
    assert.doesNotMatch(page, /TasksV2Shell/);
  });

  it("uses Team / Mine scope with quiet pill chrome", () => {
    assert.match(shell, /"Who’s tasks"/);
    assert.match(shell, /"team", "mine"/);
    assert.doesNotMatch(shell, /Main Table/);
    assert.doesNotMatch(shell, /My Tasks/);
  });

  it("uses List / Status view tabs (Focus / Custom removed)", () => {
    assert.match(shell, /label: "List"/);
    assert.match(shell, /label: "Status"/);
    assert.match(shell, /role="tablist"/);
    assert.match(shell, /TasksEaseList/);
    assert.match(shell, /TasksEaseBoard/);
    assert.doesNotMatch(shell, /label: "Focus"/);
    assert.doesNotMatch(shell, /label: "Custom"/);
    assert.doesNotMatch(shell, /TasksEaseCustomBoard/);
  });

  it("shows pulse filters as quiet text links with counts", () => {
    assert.match(shell, /TASKS_EASE_PULSE_OPTIONS/);
    assert.match(shell, /pulseCounts\[option\.id\]/);
    assert.doesNotMatch(shell, /TasksV2SummaryCards/);
  });

  it("uses DashboardWidgetColorPicker (dot variant) for event chips", () => {
    assert.match(shell, /DashboardWidgetColorPicker/);
    assert.match(shell, /variant="dot"/);
    assert.match(list, /DashboardWidgetColorPicker/);
  });

  it("lists tasks in a Pilot table with event links and color stripe", () => {
    assert.match(list, /group\.eventHref/);
    assert.match(list, /borderLeft: `4px solid \$\{stripeColor\}`/);
    assert.match(list, /<table/);
    assert.match(list, /Due Date/);
    assert.match(list, /Priority/);
    assert.match(list, /deriveTaskPriority/);
    assert.match(list, /handlePriorityChange/);
    assert.match(list, /type="date"/);
    assert.match(list, /handleDueDateChange/);
    assert.match(list, /overflow-y-visible/);
    assert.match(list, /Escalate/);
  });

  it("renders Pilot status columns with Needs Review and quick-add", () => {
    assert.match(board, /Needs Review/);
    assert.match(board, /onAddTask/);
    assert.match(board, /To Do/);
    assert.match(board, /borderLeft: `3px solid \$\{eventColor\}`/);
    assert.match(shell, /onAddTask=\{data\.canEdit \? openAddTask/);
  });

  it("mutes completed tasks with line-through title styling", () => {
    assert.match(list, /isDone && "text-cos-muted line-through"/);
    assert.match(board, /isDone && "text-cos-muted mb-2 line-through"/);
  });

  it("offers Ask AI for tasks + Add task actions in the header", () => {
    assert.match(shell, /Ask AI for tasks/);
    assert.match(shell, /Add task/);
    assert.match(shell, /createTaskHubTaskAction/);
    assert.match(shell, /openAddTask/);
  });

  it("uses Ease task drawer with due date, assignee, priority, and notes", () => {
    const drawer = readSrc("../../../components/tasks-v2/TasksEaseTaskDrawer.tsx");
    assert.match(shell, /TasksEaseTaskDrawer/);
    assert.doesNotMatch(shell, /TasksV2TaskDetailDrawer/);
    assert.match(drawer, /Due Date/);
    assert.match(drawer, /Assignee/);
    assert.match(drawer, /Priority/);
    assert.match(drawer, /Notes/);
    assert.match(drawer, /deriveTaskPriority/);
    assert.match(drawer, /appearance-none rounded-2xl/);
    assert.match(drawer, /max-w-2xl/);
    assert.doesNotMatch(drawer, /TasksV2AssigneeSelect/);
  });

  it("keeps newly added tasks visible (event options + optimistic create)", () => {
    assert.match(shell, /pendingCreated/);
    assert.match(shell, /assignToSelf/);
    assert.match(shell, /data\.eventGroups/);
  });

  it("keeps chrome switches instant via local state + history.replaceState", () => {
    assert.match(shell, /history\.replaceState/);
    assert.match(shell, /syncUrl/);
    assert.doesNotMatch(shell, /router\.replace\(/);
  });
});
