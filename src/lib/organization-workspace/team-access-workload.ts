import "server-only";

import {
  areEventPlaybookTablesAvailable,
  getEventPlaybookEvents,
  getEventPlaybookTasksForEvents,
} from "@/lib/event-playbooks/queries";
import { isOpenTaskStatus } from "@/lib/event-playbooks/task-status";
import { buildEventRosterOwnershipMap } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationSchoolYearIds, resolveScopedOrganizationId } from "@/lib/events/org-scope";
import type { EventPlaybookTaskRow } from "@/types/event-playbooks";

export interface CommitteeWorkloadStats {
  openTasks: number;
  campaigns: number;
  approvalsWaiting: number;
  memberCount: number;
}

export interface TeamAccessWorkloadIndex {
  byCommitteeId: Record<string, CommitteeWorkloadStats>;
}

const EMPTY_STATS: CommitteeWorkloadStats = {
  openTasks: 0,
  campaigns: 0,
  approvalsWaiting: 0,
  memberCount: 0,
};

function ensureCommitteeBucket(
  index: Record<string, CommitteeWorkloadStats>,
  committeeId: string,
): CommitteeWorkloadStats {
  if (!index[committeeId]) {
    index[committeeId] = { ...EMPTY_STATS };
  }
  return index[committeeId];
}

async function countPendingApprovalsByEventIds(
  eventIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  if (eventIds.length === 0) {
    return counts;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("communication_items")
    .select("event_id, status")
    .in("event_id", eventIds);

  if (error?.code === "42P01" || error) {
    return counts;
  }

  for (const row of data ?? []) {
    const eventId = row.event_id as string;
    const status = row.status as string;
    if (status === "pending_approval") {
      counts.set(eventId, (counts.get(eventId) ?? 0) + 1);
    }
  }

  return counts;
}

export async function getTeamAccessWorkloadIndex(
  organizationId: string,
): Promise<TeamAccessWorkloadIndex> {
  const workspace = await getOrganizationWorkspaceData(organizationId);
  if (!workspace) {
    return { byCommitteeId: {} };
  }

  const byCommitteeId: Record<string, CommitteeWorkloadStats> = {};

  for (const committee of workspace.committees) {
    const bucket = ensureCommitteeBucket(byCommitteeId, committee.id);
    const chairs = committee.contactName
      ? committee.contactName.split(/[,·|/]+/).map((part) => part.trim()).filter(Boolean)
      : [];
    bucket.memberCount = new Set(chairs.map((name) => name.toLowerCase())).size;
  }

  const tablesAvailable = await areEventPlaybookTablesAvailable();
  if (!tablesAvailable) {
    return { byCommitteeId };
  }

  const events = await getEventPlaybookEvents(organizationId);
  if (events.length === 0) {
    return { byCommitteeId };
  }

  const ownershipMap = buildEventRosterOwnershipMap(events, workspace);
  const committeesByName = new Map(
    workspace.committees.map((committee) => [committee.name.toLowerCase(), committee]),
  );

  const eventIds = events.map((event) => event.id);
  const [taskRows, pendingApprovalsByEvent] = await Promise.all([
    getEventPlaybookTasksForEvents(eventIds),
    countPendingApprovalsByEventIds(eventIds),
  ]);

  const tasksByEventId = new Map<string, EventPlaybookTaskRow[]>();
  for (const row of taskRows) {
    const bucket = tasksByEventId.get(row.event_id) ?? [];
    bucket.push(row);
    tasksByEventId.set(row.event_id, bucket);
  }

  for (const event of events) {
    const ownership = ownershipMap.get(event.id);
    const committeeName = ownership?.committeeName;
    if (!committeeName) {
      continue;
    }

    const committee = committeesByName.get(committeeName.toLowerCase());
    if (!committee) {
      continue;
    }

    const bucket = ensureCommitteeBucket(byCommitteeId, committee.id);
    bucket.campaigns += 1;

    const eventTasks = tasksByEventId.get(event.id) ?? [];
    bucket.openTasks += eventTasks.filter((task) => isOpenTaskStatus(task.status)).length;
    bucket.approvalsWaiting += pendingApprovalsByEvent.get(event.id) ?? 0;
  }

  return { byCommitteeId };
}

export async function getTeamAccessWorkloadForCurrentOrg(): Promise<TeamAccessWorkloadIndex> {
  const organizationId = await resolveScopedOrganizationId(undefined);
  if (!organizationId) {
    return { byCommitteeId: {} };
  }

  const schoolYearIds = await getOrganizationSchoolYearIds(organizationId);
  if (schoolYearIds.length === 0) {
    return { byCommitteeId: {} };
  }

  return getTeamAccessWorkloadIndex(organizationId);
}
