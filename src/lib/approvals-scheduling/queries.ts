import "server-only";

import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getPlanningCalendarData } from "@/lib/communications-calendar/planning-queries";
import {
  mapClassicApprovalItem,
  mapPlanningPublishingItem,
  mapSchedulingItemRow,
} from "@/lib/approvals-scheduling/map-items";
import { canViewAllApprovals } from "@/lib/approvals-scheduling/permissions";
import { summarizeCounts } from "@/lib/approvals-scheduling/status";
import type {
  ApprovalSchedulingItemRow,
  UnifiedApprovalsPageData,
  UnifiedApprovalItem,
} from "@/lib/approvals-scheduling/types";
import { getApprovalQueueOverviewForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import type { ApprovalActor } from "@/lib/event-workspace/approval-permissions";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import { getTodayDateString } from "@/lib/utils/dates";
import { cache } from "react";

function isPublishedPlanningItem(
  item: import("@/types/communications-calendar").PlanningCalendarItem,
): boolean {
  return item.publishStatus === "published" || item.status === "published";
}

function dedupeUnifiedItems(items: UnifiedApprovalItem[]): UnifiedApprovalItem[] {
  const seenCommunicationIds = new Set<string>();
  const seenSchedulingIds = new Set<string>();
  const result: UnifiedApprovalItem[] = [];

  for (const item of items) {
    if (item.communicationItemId) {
      if (seenCommunicationIds.has(item.communicationItemId)) {
        continue;
      }
      seenCommunicationIds.add(item.communicationItemId);
    }

    if (item.schedulingItemId) {
      if (seenSchedulingIds.has(item.schedulingItemId)) {
        continue;
      }
      seenSchedulingIds.add(item.schedulingItemId);
    }

    result.push(item);
  }

  return result;
}

/** Org-scoped scheduling rows (request-deduped). Shared by badge counts + Approvals hub. */
const fetchCampaignBuilderSchedulingItems = cache(
  async function fetchCampaignBuilderSchedulingItems(): Promise<
    ApprovalSchedulingItemRow[]
  > {
    const { resolveScopedOrganizationId, getOrganizationSchoolYearIds } =
      await import("@/lib/events/org-scope");
    const scopedOrgId = await resolveScopedOrganizationId(undefined);
    if (!scopedOrgId) {
      return [];
    }

    const schoolYearIds = await getOrganizationSchoolYearIds(scopedOrgId);
    if (!schoolYearIds.length) {
      return [];
    }

    const supabase = await createClient();
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id")
      .in("school_year_id", schoolYearIds);

    if (eventsError?.code === "42P01" || eventsError) {
      return [];
    }

    const eventIds = (events ?? []).map((row) => row.id as string);
    if (eventIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("approval_scheduling_items")
      .select("*")
      .in("event_id", eventIds)
      .order("requested_at", { ascending: false });

    if (error?.code === "42P01") {
      return [];
    }

    if (error) {
      console.error("Failed to fetch approval scheduling items:", error.message);
      return [];
    }

    return (data ?? []) as ApprovalSchedulingItemRow[];
  },
);

async function resolveAssigneeForSchedulingRow(
  row: ApprovalSchedulingItemRow,
): Promise<{ name: string; role: string }> {
  const supabase = await createClient();

  if (row.assigned_user_id) {
    const { data } = await supabase
      .from("organization_users")
      .select("email, organization_roles ( name )")
      .eq("id", row.assigned_user_id)
      .maybeSingle();

    const orgRole = data?.organization_roles;
    const roleName = Array.isArray(orgRole)
      ? (orgRole[0] as { name: string | null } | undefined)?.name
      : (orgRole as { name: string | null } | null | undefined)?.name;

    return {
      name: data?.email ?? "Approver",
      role: roleName ?? "Committee Chair",
    };
  }

  if (row.assigned_organization_role_id) {
    const { data } = await supabase
      .from("organization_roles")
      .select("name, contact_name")
      .eq("id", row.assigned_organization_role_id)
      .maybeSingle();

    return {
      name: data?.contact_name?.trim() || data?.name || "Board",
      role: data?.name ?? "Committee Chair",
    };
  }

  return { name: "System", role: "System" };
}

function isAssignedToActor(
  row: ApprovalSchedulingItemRow,
  actor: ApprovalActor | null,
): boolean {
  if (!actor?.organizationUserId) {
    return false;
  }

  return row.assigned_user_id === actor.organizationUserId;
}

function isSubmittedByActor(
  row: ApprovalSchedulingItemRow,
  actor: ApprovalActor | null,
): boolean {
  if (!actor?.organizationUserId) {
    return false;
  }

  return row.requested_by_user_id === actor.organizationUserId;
}

const resolveUnifiedApprovalsData = cache(async function resolveUnifiedApprovalsData(): Promise<UnifiedApprovalsPageData> {
  const today = getTodayDateString();
  const [role, membership, queue, planning, schedulingRows] = await Promise.all([
    getCurrentCampaignRole(),
    getActiveMembership(),
    getApprovalQueueOverviewForCurrentUser(),
    getPlanningCalendarData(),
    fetchCampaignBuilderSchedulingItems(),
  ]);

  const actor: ApprovalActor | null = membership
    ? {
        organizationUserId: membership.user.id,
        organizationRoleId: membership.user.organizationRoleId,
        email: membership.user.email,
      }
    : null;

  const classicItems = [
    ...queue.assignedToMe,
    ...queue.allPending.filter((item) => !item.assignedToMe),
    ...queue.changesRequested,
    ...queue.recentlyApproved,
  ].map((item) => mapClassicApprovalItem(item, today));

  const metaItems = planning.items.filter(
    (item) => item.communicationType === "meta_milestone",
  );

  const publishingItems = metaItems
    .filter(
      (item) =>
        isPublishedPlanningItem(item) ||
        item.publishStatus === "scheduled" ||
        item.status === "scheduled" ||
        item.publishStatus === "posting" ||
        (!isPublishedPlanningItem(item) && item.scheduledDate <= today),
    )
    .map((item) => mapPlanningPublishingItem(item, today));

  const eventTitleById = new Map<string, string>();
  for (const item of classicItems) {
    eventTitleById.set(item.eventId, item.eventTitle);
  }
  for (const item of publishingItems) {
    eventTitleById.set(item.eventId, item.eventTitle);
  }

  const cb2Items: UnifiedApprovalItem[] = [];
  for (const row of schedulingRows) {
    const assignee = await resolveAssigneeForSchedulingRow(row);
    cb2Items.push(
      mapSchedulingItemRow(
        row,
        eventTitleById.get(row.event_id) ?? row.campaign_name ?? "Campaign",
        assignee.name,
        assignee.role,
        isAssignedToActor(row, actor),
        isSubmittedByActor(row, actor),
      ),
    );
  }

  const items = dedupeUnifiedItems([
    ...classicItems,
    ...cb2Items,
    ...publishingItems,
  ]).sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));

  const counts = summarizeCounts(items);
  const campaigns = [
    ...new Map(
      items.map((item) => [item.eventId, { id: item.eventId, title: item.eventTitle }]),
    ).values(),
  ].sort((left, right) => left.title.localeCompare(right.title));

  return {
    items,
    summary: {
      inQueue: counts.in_queue,
      assignedToMe: counts.assigned_to_me,
      scheduled: counts.scheduled,
      posted: counts.posted,
      published: counts.published,
      changesRequested: counts.changes_requested,
    },
    campaigns,
    actorEmail: actor?.email ?? null,
    actorUserId: actor?.organizationUserId ?? null,
    actorRoleId: actor?.organizationRoleId ?? null,
    role,
    canViewAll: canViewAllApprovals(role),
  };
});

export async function getUnifiedApprovalsSchedulingData(): Promise<UnifiedApprovalsPageData> {
  return resolveUnifiedApprovalsData();
}

export async function getChangeRequestsSchedulingCount(): Promise<number> {
  const membership = await getActiveMembership();
  const actor: ApprovalActor | null = membership
    ? {
        organizationUserId: membership.user.id,
        organizationRoleId: membership.user.organizationRoleId,
        email: membership.user.email,
      }
    : null;

  if (!actor?.organizationUserId) {
    return 0;
  }

  const rows = await fetchCampaignBuilderSchedulingItems();
  return rows.filter(
    (row) =>
      row.workflow_status === "changes_requested" &&
      row.requested_by_user_id === actor.organizationUserId,
  ).length;
}

export async function getAssignedApprovalsSchedulingCount(): Promise<number> {
  const membership = await getActiveMembership();
  const actor: ApprovalActor | null = membership
    ? {
        organizationUserId: membership.user.id,
        organizationRoleId: membership.user.organizationRoleId,
        email: membership.user.email,
      }
    : null;

  if (!actor?.organizationUserId) {
    return 0;
  }

  const rows = await fetchCampaignBuilderSchedulingItems();
  return rows.filter(
    (row) =>
      row.workflow_status === "assigned_to_me" &&
      row.assigned_user_id === actor.organizationUserId,
  ).length;
}

/**
 * Combined sidebar scheduling badge totals — one shared fetch for both counts.
 */
export const getSidebarSchedulingBadgeCounts = cache(
  async function getSidebarSchedulingBadgeCounts(): Promise<{
    assignedApprovalsCount: number;
    changeRequestsCount: number;
  }> {
    const [assignedApprovalsCount, changeRequestsCount] = await Promise.all([
      getAssignedApprovalsSchedulingCount(),
      getChangeRequestsSchedulingCount(),
    ]);
    return { assignedApprovalsCount, changeRequestsCount };
  },
);
