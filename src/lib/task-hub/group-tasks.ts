import { buildEventRosterOwnershipMap } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import { parseCommitteeChairNames } from "@/lib/organization-workspace/merge-committee-chairs";
import { mapEventPlaybookTaskRow } from "@/lib/event-playbooks/mappers";
import type { Event } from "@/types";
import type { EventPlaybookTaskRow } from "@/types/event-playbooks";
import type { OrganizationCommittee, OrganizationWorkspaceData } from "@/types/organization-workspace";
import type {
  TaskHubCommitteeGroup,
  TaskHubTaskItem,
} from "@/types/task-hub";

const UNASSIGNED_COMMITTEE_NAME = "Unassigned";

function compareTasks(a: TaskHubTaskItem, b: TaskHubTaskItem): number {
  const dateCompare = a.event.eventDate.localeCompare(b.event.eventDate);
  if (dateCompare !== 0) {
    return dateCompare;
  }

  if (a.dueDate && b.dueDate) {
    const dueCompare = a.dueDate.localeCompare(b.dueDate);
    if (dueCompare !== 0) {
      return dueCompare;
    }
  } else if (a.dueDate) {
    return -1;
  } else if (b.dueDate) {
    return 1;
  }

  const eventCompare = a.event.eventTitle.localeCompare(b.event.eventTitle);
  if (eventCompare !== 0) {
    return eventCompare;
  }

  return a.sortOrder - b.sortOrder;
}

function resolveCommitteeForEvent(
  event: Event,
  ownershipMap: ReturnType<typeof buildEventRosterOwnershipMap>,
  committeesByName: Map<string, OrganizationCommittee>,
): OrganizationCommittee | null {
  const ownership = ownershipMap.get(event.id);
  const committeeName = ownership?.committeeName;

  if (!committeeName) {
    return null;
  }

  return committeesByName.get(committeeName.toLowerCase()) ?? null;
}

function resolveCommitteeChairName(committee: OrganizationCommittee | null): string | null {
  if (!committee?.contactName?.trim()) {
    return null;
  }
  const names = parseCommitteeChairNames(committee.contactName);
  return names[0] ?? committee.contactName.trim();
}

export function groupTasksByCommittee(input: {
  events: Event[];
  taskRows: EventPlaybookTaskRow[];
  workspace: OrganizationWorkspaceData;
  visibleCommittees: OrganizationCommittee[];
}): TaskHubCommitteeGroup[] {
  const { events, taskRows, workspace, visibleCommittees } = input;

  const eventsById = new Map(events.map((event) => [event.id, event]));
  const ownershipMap = buildEventRosterOwnershipMap(events, workspace);
  const visibleCommitteeIds = new Set(visibleCommittees.map((c) => c.id));
  const committeesByName = new Map(
    workspace.committees.map((committee) => [
      committee.name.toLowerCase(),
      committee,
    ]),
  );

  const tasksByCommitteeKey = new Map<string, TaskHubTaskItem[]>();

  for (const row of taskRows) {
    const event = eventsById.get(row.event_id);
    if (!event) {
      continue;
    }

    const committee = resolveCommitteeForEvent(event, ownershipMap, committeesByName);
    const committeeKey = committee?.id ?? "__unassigned__";

    if (committee && !visibleCommitteeIds.has(committee.id)) {
      continue;
    }

    if (!committee && visibleCommittees.length > 0) {
      continue;
    }

    const task = mapEventPlaybookTaskRow(row);
    const item: TaskHubTaskItem = {
      ...task,
      event: {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventHref: `/events/${event.id}?tab=tasks`,
      },
    };

    const bucket = tasksByCommitteeKey.get(committeeKey) ?? [];
    bucket.push(item);
    tasksByCommitteeKey.set(committeeKey, bucket);
  }

  const groups: TaskHubCommitteeGroup[] = [];

  for (const committee of visibleCommittees) {
    const tasks = (tasksByCommitteeKey.get(committee.id) ?? []).sort(compareTasks);
    if (tasks.length === 0) {
      continue;
    }

    groups.push({
      committeeId: committee.id,
      committeeName: committee.name,
      chairName: resolveCommitteeChairName(committee),
      sortOrder: committee.sortOrder,
      tasks,
      doneCount: tasks.filter((task) => task.status === "done").length,
      totalCount: tasks.length,
    });
  }

  const unassignedTasks = (tasksByCommitteeKey.get("__unassigned__") ?? []).sort(
    compareTasks,
  );

  if (unassignedTasks.length > 0 && visibleCommittees.length === workspace.committees.length) {
    groups.push({
      committeeId: null,
      committeeName: UNASSIGNED_COMMITTEE_NAME,
      chairName: null,
      sortOrder: Number.MAX_SAFE_INTEGER,
      tasks: unassignedTasks,
      doneCount: unassignedTasks.filter((task) => task.status === "done").length,
      totalCount: unassignedTasks.length,
    });
  }

  return groups.sort(
    (a, b) => a.sortOrder - b.sortOrder || a.committeeName.localeCompare(b.committeeName),
  );
}
