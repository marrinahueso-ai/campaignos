import type {
  EventPlaybookTask,
  EventPlaybookTaskGroup,
} from "@/types/event-playbooks";

export const UNGROUPED_KEY = "__ungrouped__";

export interface TaskChecklistSection {
  key: string;
  group: EventPlaybookTaskGroup | null;
  tasks: EventPlaybookTask[];
}

export function buildTaskChecklistSections(
  groups: EventPlaybookTaskGroup[],
  tasks: EventPlaybookTask[],
): TaskChecklistSection[] {
  const sortedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const tasksByGroup = new Map<string | null, EventPlaybookTask[]>();

  for (const task of tasks) {
    const key = task.groupId;
    const bucket = tasksByGroup.get(key) ?? [];
    bucket.push(task);
    tasksByGroup.set(key, bucket);
  }

  for (const bucket of tasksByGroup.values()) {
    bucket.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const sections: TaskChecklistSection[] = sortedGroups.map((group) => ({
    key: group.id,
    group,
    tasks: tasksByGroup.get(group.id) ?? [],
  }));

  const ungrouped = tasksByGroup.get(null) ?? [];
  if (ungrouped.length > 0 || sections.length === 0) {
    sections.push({
      key: UNGROUPED_KEY,
      group: null,
      tasks: ungrouped,
    });
  }

  return sections;
}

export function flattenTaskSections(sections: TaskChecklistSection[]): EventPlaybookTask[] {
  return sections.flatMap((section) => section.tasks);
}

export function moveTaskInSections(
  sections: TaskChecklistSection[],
  taskId: string,
  targetSectionKey: string,
  targetIndex: number,
): TaskChecklistSection[] {
  const next = sections.map((section) => ({
    ...section,
    tasks: [...section.tasks],
  }));

  let movedTask: EventPlaybookTask | null = null;

  for (const section of next) {
    const index = section.tasks.findIndex((task) => task.id === taskId);
    if (index >= 0) {
      movedTask = section.tasks.splice(index, 1)[0] ?? null;
      break;
    }
  }

  if (!movedTask) {
    return sections;
  }

  const targetSection = next.find((section) => section.key === targetSectionKey);
  if (!targetSection) {
    return sections;
  }

  const groupId = targetSection.group?.id ?? null;
  const clampedIndex = Math.max(0, Math.min(targetIndex, targetSection.tasks.length));
  targetSection.tasks.splice(clampedIndex, 0, { ...movedTask, groupId });

  return next;
}

export function reorderGroupSections(
  sections: TaskChecklistSection[],
  groupId: string,
  targetIndex: number,
): TaskChecklistSection[] {
  const grouped = sections.filter((section) => section.group !== null);
  const ungrouped = sections.find((section) => section.key === UNGROUPED_KEY);

  const fromIndex = grouped.findIndex((section) => section.group?.id === groupId);
  if (fromIndex < 0) {
    return sections;
  }

  const nextGrouped = [...grouped];
  const [moved] = nextGrouped.splice(fromIndex, 1);
  if (!moved) {
    return sections;
  }

  const clampedIndex = Math.max(0, Math.min(targetIndex, nextGrouped.length));
  nextGrouped.splice(clampedIndex, 0, moved);

  return ungrouped ? [...nextGrouped, ungrouped] : nextGrouped;
}

export function sectionsToPersistedOrder(
  sections: TaskChecklistSection[],
): {
  groups: { id: string; sortOrder: number }[];
  tasks: { id: string; groupId: string | null; sortOrder: number }[];
} {
  const groups = sections
    .filter((section) => section.group !== null)
    .map((section, index) => ({
      id: section.group!.id,
      sortOrder: index,
    }));

  const tasks: { id: string; groupId: string | null; sortOrder: number }[] = [];

  for (const section of sections) {
    section.tasks.forEach((task, index) => {
      tasks.push({
        id: task.id,
        groupId: section.group?.id ?? null,
        sortOrder: index,
      });
    });
  }

  return { groups, tasks };
}
