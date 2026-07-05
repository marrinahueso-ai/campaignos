import type { TaskHubCommitteeGroup, TaskHubSecondaryGroup, TaskHubSecondaryGroupMode, TaskHubTaskItem } from "@/types/task-hub";
import type { BoardColumnStatus } from "@/lib/event-playbooks/task-status";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";

const UNASSIGNED_LABEL = "Unassigned";

export function effectiveTaskDueDate(task: TaskHubTaskItem): string {
  return task.dueDate ?? task.event.eventDate;
}

export function groupTasksBySecondary(
  tasks: TaskHubTaskItem[],
  mode: TaskHubSecondaryGroupMode,
  committeeChairName: string | null,
): TaskHubSecondaryGroup[] {
  if (mode === "none") {
    return [{ key: "all", label: "All tasks", tasks }];
  }

  if (mode === "assignee") {
    return groupByAssignee(tasks, committeeChairName);
  }

  return groupByDueDateUrgency(tasks);
}

function resolveAssigneeLabel(
  task: TaskHubTaskItem,
  committeeChairName: string | null,
): string {
  if (task.assigneeName?.trim()) {
    return task.assigneeName.trim();
  }
  if (committeeChairName?.trim()) {
    return committeeChairName.trim();
  }
  return UNASSIGNED_LABEL;
}

function groupByAssignee(
  tasks: TaskHubTaskItem[],
  committeeChairName: string | null,
): TaskHubSecondaryGroup[] {
  const buckets = new Map<string, TaskHubTaskItem[]>();

  for (const task of tasks) {
    const label = resolveAssigneeLabel(task, committeeChairName);
    const bucket = buckets.get(label) ?? [];
    bucket.push(task);
    buckets.set(label, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => {
      if (a === UNASSIGNED_LABEL) return 1;
      if (b === UNASSIGNED_LABEL) return -1;
      return a.localeCompare(b);
    })
    .map(([label, groupTasks]) => ({
      key: `assignee:${label}`,
      label,
      tasks: groupTasks,
    }));
}

type DueDateBucket = {
  key: string;
  label: string;
  sortOrder: number;
  matches: (dueDate: string, today: string) => boolean;
};

const DUE_DATE_BUCKETS: DueDateBucket[] = [
  {
    key: "overdue",
    label: "Overdue",
    sortOrder: 0,
    matches: (dueDate, today) => dueDate < today,
  },
  {
    key: "this-week",
    label: "Due this week",
    sortOrder: 1,
    matches: (dueDate, today) => {
      const weekEnd = addDaysToDateOnly(today, 7);
      return dueDate >= today && dueDate <= weekEnd;
    },
  },
  {
    key: "next-week",
    label: "Due next week",
    sortOrder: 2,
    matches: (dueDate, today) => {
      const weekStart = addDaysToDateOnly(today, 8);
      const weekEnd = addDaysToDateOnly(today, 14);
      return dueDate >= weekStart && dueDate <= weekEnd;
    },
  },
  {
    key: "later",
    label: "Later",
    sortOrder: 3,
    matches: (dueDate, today) => dueDate > addDaysToDateOnly(today, 14),
  },
];

function groupByDueDateUrgency(tasks: TaskHubTaskItem[]): TaskHubSecondaryGroup[] {
  const today = getTodayDateString();
  const buckets = new Map<string, TaskHubTaskItem[]>();

  for (const bucket of DUE_DATE_BUCKETS) {
    buckets.set(bucket.key, []);
  }
  buckets.set("no-date", []);

  for (const task of tasks) {
    const dueDate = task.dueDate;
    if (!dueDate) {
      buckets.get("no-date")!.push(task);
      continue;
    }

    const matched = DUE_DATE_BUCKETS.find((bucket) =>
      bucket.matches(dueDate, today),
    );
    if (matched) {
      buckets.get(matched.key)!.push(task);
    } else {
      buckets.get("later")!.push(task);
    }
  }

  const groups: TaskHubSecondaryGroup[] = DUE_DATE_BUCKETS.filter(
    (bucket) => (buckets.get(bucket.key)?.length ?? 0) > 0,
  ).map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    tasks: buckets.get(bucket.key) ?? [],
  }));

  const noDateTasks = buckets.get("no-date") ?? [];
  if (noDateTasks.length > 0) {
    groups.push({
      key: "no-date",
      label: "No due date",
      tasks: noDateTasks,
    });
  }

  return groups;
}

export function flattenCommitteeTasks(
  committees: TaskHubCommitteeGroup[],
): TaskHubTaskItem[] {
  return committees.flatMap((committee) => committee.tasks);
}

export function groupTasksForCalendar(
  tasks: TaskHubTaskItem[],
  mode: "week" | "month",
): { key: string; label: string; tasks: TaskHubTaskItem[] }[] {
  const buckets = new Map<string, TaskHubTaskItem[]>();

  for (const task of tasks) {
    const dueDate = effectiveTaskDueDate(task);
    const key =
      mode === "month" ? dueDate.slice(0, 7) : weekStartKey(dueDate);
    const bucket = buckets.get(key) ?? [];
    bucket.push(task);
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, groupTasks]) => ({
      key,
      label: calendarGroupLabel(key, mode),
      tasks: groupTasks.sort((a, b) =>
        effectiveTaskDueDate(a).localeCompare(effectiveTaskDueDate(b)),
      ),
    }));
}

function weekStartKey(date: string): string {
  const parsed = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  );
  const day = parsed.getDay();
  parsed.setDate(parsed.getDate() - day);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

function calendarGroupLabel(key: string, mode: "week" | "month"): string {
  if (mode === "month") {
    const [yearText, monthText] = key.split("-");
    const date = new Date(Number(yearText), Number(monthText) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  const weekStart = key;
  const weekEnd = addDaysToDateOnly(weekStart, 6);
  const start = new Date(
    Number(weekStart.slice(0, 4)),
    Number(weekStart.slice(5, 7)) - 1,
    Number(weekStart.slice(8, 10)),
  );
  const end = new Date(
    Number(weekEnd.slice(0, 4)),
    Number(weekEnd.slice(5, 7)) - 1,
    Number(weekEnd.slice(8, 10)),
  );
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `Week of ${startLabel} – ${endLabel}`;
}

export function tasksByBoardColumn(
  tasks: TaskHubTaskItem[],
): Record<BoardColumnStatus | "done", TaskHubTaskItem[]> {
  return {
    todo: tasks.filter((task) => task.status === "todo"),
    in_progress: tasks.filter((task) => task.status === "in_progress"),
    blocked: tasks.filter((task) => task.status === "blocked"),
    done: tasks.filter((task) => task.status === "done"),
  };
}

export function buildCommitteeOrderMap(
  committees: TaskHubCommitteeGroup[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const committee of committees) {
    const key = committee.committeeId ?? committee.committeeName;
    map.set(
      key,
      committee.tasks.map((task) => task.id),
    );
  }
  return map;
}

export function reorderCommitteeTasks(
  committee: TaskHubCommitteeGroup,
  taskId: string,
  targetIndex: number,
): TaskHubTaskItem[] {
  const tasks = [...committee.tasks];
  const fromIndex = tasks.findIndex((task) => task.id === taskId);
  if (fromIndex < 0) {
    return tasks;
  }

  const [moved] = tasks.splice(fromIndex, 1);
  if (!moved) {
    return committee.tasks;
  }

  const clampedIndex = Math.max(0, Math.min(targetIndex, tasks.length));
  tasks.splice(clampedIndex, 0, moved);
  return tasks;
}
