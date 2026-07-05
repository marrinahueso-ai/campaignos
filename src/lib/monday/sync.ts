import "server-only";

import { buildEventRosterOwnershipMap } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import {
  createMondayGroup,
  createMondayItem,
  fetchMondayItemsByIds,
  getMondayBoardDetails,
  updateMondayItem,
} from "@/lib/monday/client";
import { createClient } from "@/lib/supabase/server";
import {
  getMondayBoardMappingForOrganization,
  getMondayConnectionForOrganization,
  getMondayTaskLinksForTaskIds,
  saveMondayTaskLink,
  updateMondayCommitteeGroups,
} from "@/lib/monday/connection";
import {
  buildMondayColumnValues,
  buildMondayItemUrl,
  parseMondayDateColumn,
} from "@/lib/monday/status-mapping";
import type { MondayBoardColumnMap, MondayTaskOverlay } from "@/lib/monday/types";
import { isOpenTaskStatus } from "@/lib/event-playbooks/task-status";
import { mapEventPlaybookTaskRow } from "@/lib/event-playbooks/mappers";
import type { Event } from "@/types";
import type { EventPlaybookTaskRow } from "@/types/event-playbooks";
import type { OrganizationCommittee, OrganizationWorkspaceData } from "@/types/organization-workspace";

const UNASSIGNED_GROUP_NAME = "Unassigned";

export interface MondayBackfillResult {
  success: boolean;
  error?: string;
  created: number;
  skipped: number;
  failed: number;
}

function resolveCommitteeForEvent(
  event: Event,
  workspace: OrganizationWorkspaceData,
): OrganizationCommittee | null {
  const ownershipMap = buildEventRosterOwnershipMap([event], workspace);
  const ownership = ownershipMap.get(event.id);
  const committeeName = ownership?.committeeName;
  if (!committeeName) {
    return null;
  }
  return (
    workspace.committees.find(
      (committee) => committee.name.toLowerCase() === committeeName.toLowerCase(),
    ) ?? null
  );
}

function isColumnMapConfigured(columnMap: MondayBoardColumnMap): boolean {
  return Boolean(columnMap.statusColumnId?.trim());
}

async function ensureMondayGroupForCommittee(input: {
  accessToken: string;
  boardId: string;
  committeeGroups: Record<string, string>;
  committee: OrganizationCommittee | null;
  existingGroups: { id: string; title: string }[];
}): Promise<{ groupId: string; committeeGroups: Record<string, string> }> {
  const groupName = input.committee?.name ?? UNASSIGNED_GROUP_NAME;
  const committeeKey = input.committee?.id ?? "__unassigned__";

  const cachedGroupId = input.committeeGroups[committeeKey];
  if (cachedGroupId) {
    return { groupId: cachedGroupId, committeeGroups: input.committeeGroups };
  }

  const existing = input.existingGroups.find(
    (group) => group.title.toLowerCase() === groupName.toLowerCase(),
  );
  if (existing) {
    const committeeGroups = { ...input.committeeGroups, [committeeKey]: existing.id };
    return { groupId: existing.id, committeeGroups };
  }

  const createdId = await createMondayGroup(input.accessToken, input.boardId, groupName);
  if (!createdId) {
    throw new Error(`Could not create Monday group "${groupName}".`);
  }

  input.existingGroups.push({ id: createdId, title: groupName });
  const committeeGroups = { ...input.committeeGroups, [committeeKey]: createdId };
  return { groupId: createdId, committeeGroups };
}

export async function backfillOpenTasksToMonday(input: {
  organizationId: string;
  origin: string;
  events: Event[];
  taskRows: EventPlaybookTaskRow[];
  workspace: OrganizationWorkspaceData;
}): Promise<MondayBackfillResult> {
  const connection = await getMondayConnectionForOrganization(input.organizationId);
  if (!connection?.accessToken) {
    return { success: false, error: "Connect Monday in Settings first.", created: 0, skipped: 0, failed: 0 };
  }

  if (!connection.mondaySyncEnabled) {
    return {
      success: false,
      error: "Enable Monday sync in Settings before running backfill.",
      created: 0,
      skipped: 0,
      failed: 0,
    };
  }

  const mapping = await getMondayBoardMappingForOrganization(input.organizationId);
  if (!mapping || !isColumnMapConfigured(mapping.columnMap)) {
    return {
      success: false,
      error: "Select a board and map columns in Settings first.",
      created: 0,
      skipped: 0,
      failed: 0,
    };
  }

  const openTasks = input.taskRows.filter((row) => isOpenTaskStatus(row.status));
  const existingLinks = await getMondayTaskLinksForTaskIds(openTasks.map((row) => row.id));
  const linkedTaskIds = new Set(existingLinks.map((link) => link.eventPlaybookTaskId));

  const eventsById = new Map(input.events.map((event) => [event.id, event]));
  const boardDetails = await getMondayBoardDetails(
    connection.accessToken,
    mapping.mondayBoardId,
  );

  if (!boardDetails) {
    return {
      success: false,
      error: "Could not load the configured Monday board.",
      created: 0,
      skipped: 0,
      failed: 0,
    };
  }

  let committeeGroups = { ...mapping.committeeGroups };
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of openTasks) {
    if (linkedTaskIds.has(row.id)) {
      skipped += 1;
      continue;
    }

    const event = eventsById.get(row.event_id);
    if (!event) {
      failed += 1;
      continue;
    }

    const committee = resolveCommitteeForEvent(event, input.workspace);
    const task = mapEventPlaybookTaskRow(row);

    try {
      const groupResult = await ensureMondayGroupForCommittee({
        accessToken: connection.accessToken,
        boardId: mapping.mondayBoardId,
        committeeGroups,
        committee,
        existingGroups: [...boardDetails.groups],
      });
      committeeGroups = groupResult.committeeGroups;

      const eventUrl = new URL(`/events/${event.id}?tab=tasks`, input.origin).toString();
      const columnValues = buildMondayColumnValues({
        columnMap: mapping.columnMap,
        status: task.status,
        dueDate: task.dueDate,
        taskId: task.id,
        eventTitle: event.title,
        eventUrl,
      });

      const itemId = await createMondayItem({
        accessToken: connection.accessToken,
        boardId: mapping.mondayBoardId,
        groupId: groupResult.groupId,
        itemName: task.title,
        columnValues,
      });

      if (!itemId) {
        failed += 1;
        continue;
      }

      const saved = await saveMondayTaskLink({
        organizationId: input.organizationId,
        eventPlaybookTaskId: task.id,
        mondayItemId: itemId,
        mondayBoardId: mapping.mondayBoardId,
      });

      if (saved) {
        created += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      console.error("Monday backfill item failed:", error);
      failed += 1;
    }
  }

  if (JSON.stringify(committeeGroups) !== JSON.stringify(mapping.committeeGroups)) {
    await updateMondayCommitteeGroups(input.organizationId, committeeGroups);
  }

  return { success: true, created, skipped, failed };
}

export async function fetchMondayOverlaysForTasks(input: {
  organizationId: string;
  taskIds: string[];
  columnMap: MondayBoardColumnMap | null;
  accountSlug: string | null;
}): Promise<Map<string, MondayTaskOverlay>> {
  const overlays = new Map<string, MondayTaskOverlay>();

  if (input.taskIds.length === 0 || !input.columnMap) {
    return overlays;
  }

  const connection = await getMondayConnectionForOrganization(input.organizationId);
  if (!connection?.accessToken || !connection.mondaySyncEnabled) {
    return overlays;
  }

  const links = await getMondayTaskLinksForTaskIds(input.taskIds);
  if (links.length === 0) {
    return overlays;
  }

  const linksByTaskId = new Map(links.map((link) => [link.eventPlaybookTaskId, link]));
  const itemIds = links.map((link) => link.mondayItemId);

  const items = await fetchMondayItemsByIds(connection.accessToken, itemIds);
  const itemsById = new Map(items.map((item) => [item.id, item]));

  for (const [taskId, link] of linksByTaskId) {
    const item = itemsById.get(link.mondayItemId);
    if (!item) {
      continue;
    }

    const statusColumn = item.columnValues.find(
      (column) => column.id === input.columnMap?.statusColumnId,
    );
    const dueDateColumn = input.columnMap?.dueDateColumnId
      ? item.columnValues.find((column) => column.id === input.columnMap?.dueDateColumnId)
      : null;

    overlays.set(taskId, {
      mondayItemId: link.mondayItemId,
      mondayBoardId: link.mondayBoardId,
      mondayItemUrl: buildMondayItemUrl(
        input.accountSlug,
        link.mondayBoardId,
        link.mondayItemId,
      ),
      mondayStatusLabel: statusColumn?.text ?? null,
      mondayDueDate: dueDateColumn
        ? parseMondayDateColumn(dueDateColumn.text, dueDateColumn.value)
        : null,
      lastSyncedAt: link.lastSyncedAt,
    });
  }

  return overlays;
}

/** Phase 2: register webhooks for board change events. */
export async function registerMondayWebhooksStub(): Promise<void> {
  // Intentionally unimplemented in Phase 1.
}

export async function pushTaskUpdateToMonday(input: {
  organizationId: string;
  taskId: string;
  eventId: string;
  origin: string;
}): Promise<void> {
  const connection = await getMondayConnectionForOrganization(input.organizationId);
  if (!connection?.accessToken || !connection.mondaySyncEnabled) {
    return;
  }

  const mapping = await getMondayBoardMappingForOrganization(input.organizationId);
  if (!mapping || !isColumnMapConfigured(mapping.columnMap)) {
    return;
  }

  const links = await getMondayTaskLinksForTaskIds([input.taskId]);
  const link = links[0];
  if (!link) {
    return;
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("event_playbook_tasks")
    .select("*")
    .eq("id", input.taskId)
    .eq("event_id", input.eventId)
    .maybeSingle();

  if (error || !row) {
    return;
  }

  const { data: eventRow } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", input.eventId)
    .maybeSingle();

  const task = mapEventPlaybookTaskRow(row as EventPlaybookTaskRow);
  const eventUrl = new URL(
    `/events/${input.eventId}?tab=tasks`,
    input.origin,
  ).toString();
  const columnValues = buildMondayColumnValues({
    columnMap: mapping.columnMap,
    status: task.status,
    dueDate: task.dueDate,
    taskId: task.id,
    eventTitle: (eventRow?.title as string) ?? "Event",
    eventUrl,
  });

  try {
    await updateMondayItem({
      accessToken: connection.accessToken,
      boardId: link.mondayBoardId,
      itemId: link.mondayItemId,
      itemName: task.title,
      columnValues,
    });
  } catch (error) {
    console.error("Failed to push task update to Monday:", error);
  }
}

export async function pushTaskCreateToMonday(input: {
  organizationId: string;
  taskId: string;
  eventId: string;
  origin: string;
  events: Event[];
  workspace: OrganizationWorkspaceData;
}): Promise<void> {
  const connection = await getMondayConnectionForOrganization(input.organizationId);
  if (!connection?.accessToken || !connection.mondaySyncEnabled) {
    return;
  }

  const mapping = await getMondayBoardMappingForOrganization(input.organizationId);
  if (!mapping || !isColumnMapConfigured(mapping.columnMap)) {
    return;
  }

  const existingLinks = await getMondayTaskLinksForTaskIds([input.taskId]);
  if (existingLinks.length > 0) {
    return;
  }

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("event_playbook_tasks")
    .select("*")
    .eq("id", input.taskId)
    .eq("event_id", input.eventId)
    .maybeSingle();

  if (error || !row) {
    return;
  }

  const event = input.events.find((entry) => entry.id === input.eventId);
  if (!event) {
    return;
  }

  const task = mapEventPlaybookTaskRow(row as EventPlaybookTaskRow);
  const committee = resolveCommitteeForEvent(event, input.workspace);

  try {
    const boardDetails = await getMondayBoardDetails(
      connection.accessToken,
      mapping.mondayBoardId,
    );
    if (!boardDetails) {
      return;
    }

    let committeeGroups = { ...mapping.committeeGroups };
    const groupResult = await ensureMondayGroupForCommittee({
      accessToken: connection.accessToken,
      boardId: mapping.mondayBoardId,
      committeeGroups,
      committee,
      existingGroups: [...boardDetails.groups],
    });
    committeeGroups = groupResult.committeeGroups;

    const eventUrl = new URL(
      `/events/${input.eventId}?tab=tasks`,
      input.origin,
    ).toString();
    const columnValues = buildMondayColumnValues({
      columnMap: mapping.columnMap,
      status: task.status,
      dueDate: task.dueDate,
      taskId: task.id,
      eventTitle: event.title,
      eventUrl,
    });

    const itemId = await createMondayItem({
      accessToken: connection.accessToken,
      boardId: mapping.mondayBoardId,
      groupId: groupResult.groupId,
      itemName: task.title,
      columnValues,
    });

    if (!itemId) {
      return;
    }

    await saveMondayTaskLink({
      organizationId: input.organizationId,
      eventPlaybookTaskId: task.id,
      mondayItemId: itemId,
      mondayBoardId: mapping.mondayBoardId,
    });

    if (JSON.stringify(committeeGroups) !== JSON.stringify(mapping.committeeGroups)) {
      await updateMondayCommitteeGroups(input.organizationId, committeeGroups);
    }
  } catch (syncError) {
    console.error("Failed to push new task to Monday:", syncError);
  }
}
