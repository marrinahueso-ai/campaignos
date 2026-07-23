import type { CampaignRole } from "../auth/campaign-roles.ts";
import type { CommitteeAssignmentRole } from "../organization-workspace/roster-first.ts";
import type { Event } from "../../types/index.ts";
import type {
  OrganizationCommittee,
  OrganizationMember,
} from "../../types/organization-workspace.ts";

export type ResponsibilityLabel =
  | "Supervisor"
  | "Event Lead"
  | "Assistant Lead"
  | "Team Member"
  | "Final Approval"
  | "Publisher";

export type ResponsiblePersonSource =
  | "chair"
  | "committee_assignment"
  | "member_event_assignment"
  | "legacy_event_owner"
  | "none";

export type CommitteeAssignmentInput = {
  organizationMemberId: string;
  committeeId: string;
  role: CommitteeAssignmentRole;
};

export type EventResponsibilityPerson = {
  responsibility: ResponsibilityLabel;
  displayName: string;
  organizationTitle: string | null;
  committeeName: string | null;
  memberId: string | null;
  campaignRole: CampaignRole | null;
  active: boolean;
  source: "committee" | "member" | "routing" | "legacy";
};

export type ResolvedResponsiblePerson = {
  displayName: string;
  organizationTitle: string | null;
  memberId: string | null;
  source: ResponsiblePersonSource;
};

const ROLE_TO_LABEL: Record<
  Extract<
    CommitteeAssignmentRole,
    "supervising_vp" | "chair" | "co_chair" | "member"
  >,
  ResponsibilityLabel
> = {
  supervising_vp: "Supervisor",
  chair: "Event Lead",
  co_chair: "Assistant Lead",
  member: "Team Member",
};

export function mapCommitteeRoleToResponsibility(
  role: CommitteeAssignmentRole,
): ResponsibilityLabel | null {
  if (
    role === "supervising_vp" ||
    role === "chair" ||
    role === "co_chair" ||
    role === "member"
  ) {
    return ROLE_TO_LABEL[role];
  }
  return null;
}

export function appAccessBadgeLabel(
  campaignRole: CampaignRole | null | undefined,
): string {
  switch (campaignRole) {
    case "admin":
    case "president":
      return "Full Access";
    case "developer":
    case "tester":
    case "contributor":
    case "committee_chair":
    case "vp_communications":
      return "Standard Access";
    case "view_only":
      return "View Access";
    default:
      return "Standard Access";
  }
}

/**
 * Exact-ID responsible person for Events Home.
 * Priority:
 * 1. Chair on a committee with assigned_event_id matching eventId
 * 2. Exact committee assignment tied to that event's committee
 * 3. Exact member/user event assignment (assignedEventIds)
 * 4. Legacy event_owner display text
 * 5. Not assigned
 */
export function resolveResponsiblePersonForEvent(input: {
  eventId: string;
  event: Event;
  committees: OrganizationCommittee[];
  members: OrganizationMember[];
  committeeAssignments: CommitteeAssignmentInput[];
}): ResolvedResponsiblePerson {
  const { eventId, event, committees, members, committeeAssignments } = input;
  const memberById = new Map(members.map((m) => [m.id, m]));

  const tiedCommitteeIds = new Set(
    committees
      .filter((c) => c.assignedEventId === eventId)
      .map((c) => c.id),
  );

  if (tiedCommitteeIds.size > 0) {
    const tied = committeeAssignments.filter((a) =>
      tiedCommitteeIds.has(a.committeeId),
    );
    const chair = tied.find((a) => a.role === "chair");
    if (chair) {
      const member = memberById.get(chair.organizationMemberId);
      return {
        displayName: member?.name ?? "Assigned",
        organizationTitle: member?.roleName ?? null,
        memberId: chair.organizationMemberId,
        source: "chair",
      };
    }

    const preferred = [...tied].sort((a, b) => {
      const order = (role: CommitteeAssignmentRole) =>
        role === "co_chair"
          ? 0
          : role === "supervising_vp"
            ? 1
            : role === "member"
              ? 2
              : 3;
      return order(a.role) - order(b.role);
    })[0];
    if (preferred) {
      const member = memberById.get(preferred.organizationMemberId);
      return {
        displayName: member?.name ?? "Assigned",
        organizationTitle: member?.roleName ?? null,
        memberId: preferred.organizationMemberId,
        source: "committee_assignment",
      };
    }
  }

  const assignedMember = members.find((m) =>
    m.assignedEventIds.includes(eventId),
  );
  if (assignedMember) {
    return {
      displayName: assignedMember.name,
      organizationTitle: assignedMember.roleName,
      memberId: assignedMember.id,
      source: "member_event_assignment",
    };
  }

  const legacy = event.eventOwner?.trim();
  if (legacy) {
    return {
      displayName: legacy,
      organizationTitle: null,
      memberId: null,
      source: "legacy_event_owner",
    };
  }

  return {
    displayName: "Not assigned",
    organizationTitle: null,
    memberId: null,
    source: "none",
  };
}

export function resolveEventResponsibilities(input: {
  eventId: string;
  event: Event;
  committees: OrganizationCommittee[];
  members: OrganizationMember[];
  committeeAssignments: CommitteeAssignmentInput[];
  finalApproval?: { displayName: string; organizationTitle?: string | null } | null;
  publisher?: { displayName: string; organizationTitle?: string | null } | null;
}): EventResponsibilityPerson[] {
  const { eventId, committees, members, committeeAssignments } = input;
  const memberById = new Map(members.map((m) => [m.id, m]));
  const committeeById = new Map(committees.map((c) => [c.id, c]));

  const tiedCommittees = committees.filter(
    (c) => c.assignedEventId === eventId,
  );
  const tiedCommitteeIds = new Set(tiedCommittees.map((c) => c.id));
  const tiedAssignments = committeeAssignments.filter((a) =>
    tiedCommitteeIds.has(a.committeeId),
  );

  const rows: EventResponsibilityPerson[] = [];

  const pushRole = (
    role: Extract<
      CommitteeAssignmentRole,
      "supervising_vp" | "chair" | "co_chair" | "member"
    >,
  ) => {
    const responsibility = ROLE_TO_LABEL[role];
    const matches = tiedAssignments.filter((a) => a.role === role);
    if (matches.length === 0) {
      return;
    }
    for (const match of matches) {
      const member = memberById.get(match.organizationMemberId);
      const committee = committeeById.get(match.committeeId);
      rows.push({
        responsibility,
        displayName: member?.name ?? "Assigned",
        organizationTitle: member?.roleName ?? null,
        committeeName: committee?.name ?? null,
        memberId: match.organizationMemberId,
        campaignRole: member?.campaignRole ?? null,
        active: member?.active ?? true,
        source: "committee",
      });
    }
  };

  pushRole("supervising_vp");
  pushRole("chair");
  pushRole("co_chair");
  pushRole("member");

  const finalApproval = input.finalApproval?.displayName?.trim();
  if (finalApproval) {
    rows.push({
      responsibility: "Final Approval",
      displayName: finalApproval,
      organizationTitle: input.finalApproval?.organizationTitle ?? null,
      committeeName: null,
      memberId: null,
      campaignRole: null,
      active: true,
      source: "routing",
    });
  }

  const publisher = input.publisher?.displayName?.trim();
  if (publisher) {
    rows.push({
      responsibility: "Publisher",
      displayName: publisher,
      organizationTitle: input.publisher?.organizationTitle ?? null,
      committeeName: null,
      memberId: null,
      campaignRole: null,
      active: true,
      source: "routing",
    });
  }

  return rows;
}

export function createWithAiHref(
  eventId: string,
  section?: "inspiration" | "preview" | string,
): string {
  const base = `/events/${encodeURIComponent(eventId)}/campaign-builder`;
  if (!section) {
    return base;
  }
  return `${base}#${section}`;
}

export function eventApprovalsHref(eventId: string): string {
  return `/approvals?event=${encodeURIComponent(eventId)}`;
}

/** Event Detail Approvals tab (embedded Approvals hub). */
export function eventDetailApprovalsHref(eventId: string): string {
  return `/events/${encodeURIComponent(eventId)}?tab=approvals`;
}

/** Event Detail Tasks tab (embedded Tasks V2). */
export function eventTasksHref(eventId: string): string {
  return `/events/${encodeURIComponent(eventId)}?tab=tasks`;
}

/** Global Tasks page filtered to one event. */
export function eventTasksGlobalHref(eventId: string): string {
  return `/tasks?event=${encodeURIComponent(eventId)}`;
}

/** Event Detail Files tab (embedded FilesTab). Org files page also supports ?event=. */
export function eventFilesHref(eventId: string): string {
  return `/events/${encodeURIComponent(eventId)}?tab=files`;
}

export function eventNotesHref(eventId: string): string {
  return `/events/${encodeURIComponent(eventId)}?tab=notes`;
}

export function eventVolunteersHref(eventId: string): string {
  return `/events/${encodeURIComponent(eventId)}?tab=volunteers`;
}

/** Event Detail Insights tab (event-scoped Meta post metrics). */
export function eventInsightsHref(eventId: string): string {
  return `/events/${encodeURIComponent(eventId)}?tab=insights`;
}

export function eventVendorsHref(eventId: string): string {
  return `/vendors?event=${encodeURIComponent(eventId)}`;
}

export function eventFilesGlobalHref(eventId: string): string {
  return `/files?event=${encodeURIComponent(eventId)}`;
}

export function eventMilestonesHref(eventId: string): string {
  return createWithAiHref(eventId, "preview");
}
