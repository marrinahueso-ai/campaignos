import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getOrganizationSchoolYearIds } from "@/lib/events/org-scope";
import { replaceOrganizationUserEventAssignmentsWithoutMemberSync } from "@/lib/auth/event-assignments";
import {
  packCommitteeContactName,
  type CommitteeAssignmentRole,
  type NamedCommitteeAssignment,
} from "@/lib/organization-workspace/roster-first";

export type { CommitteeAssignmentRole };

export interface CommitteeAssignmentRecord {
  id: string;
  organizationId: string;
  organizationMemberId: string;
  committeeId: string;
  role: CommitteeAssignmentRole;
  createdAt: string;
}

export async function listCommitteeAssignmentsByOrg(
  organizationId: string,
): Promise<CommitteeAssignmentRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_committee_assignments")
    .select("*")
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    console.error("Failed to load committee assignments:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    organizationId: row.organization_id as string,
    organizationMemberId: row.organization_member_id as string,
    committeeId: row.committee_id as string,
    role: row.role as CommitteeAssignmentRole,
    createdAt: row.created_at as string,
  }));
}

export async function listCommitteeAssignmentsForMember(
  organizationMemberId: string,
): Promise<CommitteeAssignmentRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_committee_assignments")
    .select("*")
    .eq("organization_member_id", organizationMemberId);

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    console.error("Failed to load member committee assignments:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    organizationId: row.organization_id as string,
    organizationMemberId: row.organization_member_id as string,
    committeeId: row.committee_id as string,
    role: row.role as CommitteeAssignmentRole,
    createdAt: row.created_at as string,
  }));
}

async function dualWriteCommitteePackedFields(input: {
  organizationId: string;
  committeeId: string;
}): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("organization_committee_assignments")
    .select("role, organization_member_id")
    .eq("committee_id", input.committeeId);

  if (assignmentError) {
    if (assignmentError.code === "42P01") {
      return { success: true };
    }
    return { error: assignmentError.message };
  }

  const memberIds = (assignmentRows ?? []).map(
    (row) => row.organization_member_id as string,
  );

  let membersById = new Map<string, { name: string; organizationRoleId: string | null }>();
  if (memberIds.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from("organization_members")
      .select("id, name, organization_role_id")
      .in("id", memberIds);

    if (membersError) {
      return { error: membersError.message };
    }

    membersById = new Map(
      (members ?? []).map((row) => [
        row.id as string,
        {
          name: row.name as string,
          organizationRoleId: (row.organization_role_id as string | null) ?? null,
        },
      ]),
    );
  }

  const named: NamedCommitteeAssignment[] = (assignmentRows ?? []).map((row) => ({
    role: row.role as CommitteeAssignmentRole,
    memberName: membersById.get(row.organization_member_id as string)?.name ?? "",
  }));

  const contactName = packCommitteeContactName(named);

  const supervising = (assignmentRows ?? []).find(
    (row) => row.role === "supervising_vp",
  );
  let parentRoleId: string | null | undefined = undefined;
  if (supervising) {
    parentRoleId =
      membersById.get(supervising.organization_member_id as string)
        ?.organizationRoleId ?? null;
  }

  const updates: Record<string, string | null> = {
    contact_name: contactName,
  };
  if (parentRoleId !== undefined) {
    updates.parent_role_id = parentRoleId;
  }

  // Prefer chair email/phone when available
  const chairAssignment = (assignmentRows ?? []).find((row) => row.role === "chair");
  if (chairAssignment) {
    const chairId = chairAssignment.organization_member_id as string;
    const { data: chairMember } = await supabase
      .from("organization_members")
      .select("email, phone")
      .eq("id", chairId)
      .maybeSingle();
    if (chairMember) {
      updates.contact_email = (chairMember.email as string | null) ?? null;
      updates.contact_phone = (chairMember.phone as string | null) ?? null;
    }
  }

  const { error: updateError } = await supabase
    .from("organization_committees")
    .update(updates)
    .eq("id", input.committeeId)
    .eq("organization_id", input.organizationId);

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: true };
}

/**
 * Replace all committee assignments for a roster member and dual-write packed fields.
 */
export async function replaceMemberCommitteeAssignments(input: {
  organizationId: string;
  organizationMemberId: string;
  assignments: Array<{ committeeId: string; role: CommitteeAssignmentRole }>;
}): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const uniqueByCommittee = new Map<string, CommitteeAssignmentRole>();
  for (const assignment of input.assignments) {
    const committeeId = assignment.committeeId.trim();
    if (!committeeId) continue;
    uniqueByCommittee.set(committeeId, assignment.role);
  }

  const { data: existing, error: existingError } = await supabase
    .from("organization_committee_assignments")
    .select("committee_id")
    .eq("organization_member_id", input.organizationMemberId);

  if (existingError) {
    if (existingError.code === "42P01") {
      return { error: "Committee assignment table is missing. Apply migration 060." };
    }
    return { error: existingError.message };
  }

  const affectedCommitteeIds = new Set<string>([
    ...((existing ?? []).map((row) => row.committee_id as string)),
    ...uniqueByCommittee.keys(),
  ]);

  const { error: deleteError } = await supabase
    .from("organization_committee_assignments")
    .delete()
    .eq("organization_member_id", input.organizationMemberId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (uniqueByCommittee.size > 0) {
    const rows = [...uniqueByCommittee.entries()].map(([committeeId, role]) => ({
      organization_id: input.organizationId,
      organization_member_id: input.organizationMemberId,
      committee_id: committeeId,
      role,
    }));

    const { error: insertError } = await supabase
      .from("organization_committee_assignments")
      .insert(rows);

    if (insertError) {
      return { error: insertError.message };
    }
  }

  for (const committeeId of affectedCommitteeIds) {
    const dualWrite = await dualWriteCommitteePackedFields({
      organizationId: input.organizationId,
      committeeId,
    });
    if ("error" in dualWrite) {
      return dualWrite;
    }
  }

  return { success: true };
}

export async function upsertMemberCommitteeAssignment(input: {
  organizationId: string;
  organizationMemberId: string;
  committeeId: string;
  role: CommitteeAssignmentRole;
}): Promise<{ error: string } | { success: true }> {
  const existing = await listCommitteeAssignmentsForMember(input.organizationMemberId);
  const next = existing
    .filter((row) => row.committeeId !== input.committeeId)
    .map((row) => ({ committeeId: row.committeeId, role: row.role }));
  next.push({ committeeId: input.committeeId, role: input.role });
  return replaceMemberCommitteeAssignments({
    organizationId: input.organizationId,
    organizationMemberId: input.organizationMemberId,
    assignments: next,
  });
}

export async function listOrganizationMemberEventIds(
  organizationMemberId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_member_event_assignments")
    .select("event_id")
    .eq("organization_member_id", organizationMemberId);

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    console.error("Failed to load member event assignments:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.event_id as string);
}

export async function listOrganizationMemberEventAssignmentsByOrg(
  organizationId: string,
): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_member_event_assignments")
    .select("organization_member_id, event_id")
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "42P01") {
      return {};
    }
    console.error("Failed to load org member event assignments:", error.message);
    return {};
  }

  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    const memberId = row.organization_member_id as string;
    const eventId = row.event_id as string;
    if (!map[memberId]) {
      map[memberId] = [];
    }
    map[memberId].push(eventId);
  }
  return map;
}

/**
 * Replace roster event assignments and sync to linked organization_users rows.
 */
export async function replaceOrganizationMemberEventAssignments(input: {
  organizationId: string;
  organizationMemberId: string;
  eventIds: string[];
}): Promise<{ error: string } | { success: true; eventIds: string[] }> {
  const supabase = await createClient();
  const uniqueEventIds = Array.from(
    new Set(input.eventIds.map((id) => id.trim()).filter(Boolean)),
  );

  if (uniqueEventIds.length > 0) {
    const schoolYearIds = await getOrganizationSchoolYearIds(input.organizationId);
    if (schoolYearIds.length === 0) {
      return { error: "No school year found for this organization." };
    }

    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, school_year_id")
      .in("id", uniqueEventIds);

    if (eventsError) {
      return { error: eventsError.message };
    }

    const allowed = new Set(
      (events ?? [])
        .filter((row) => schoolYearIds.includes(row.school_year_id as string))
        .map((row) => row.id as string),
    );

    for (const eventId of uniqueEventIds) {
      if (!allowed.has(eventId)) {
        return { error: "One or more events are not in this organization." };
      }
    }
  }

  const { error: deleteError } = await supabase
    .from("organization_member_event_assignments")
    .delete()
    .eq("organization_member_id", input.organizationMemberId);

  if (deleteError) {
    if (deleteError.code === "42P01") {
      return uniqueEventIds.length === 0
        ? { success: true, eventIds: [] }
        : { error: "Event assignment table is missing. Apply migration 060." };
    }
    return { error: deleteError.message };
  }

  if (uniqueEventIds.length > 0) {
    const rows = uniqueEventIds.map((eventId) => ({
      organization_id: input.organizationId,
      organization_member_id: input.organizationMemberId,
      event_id: eventId,
    }));

    const { error: insertError } = await supabase
      .from("organization_member_event_assignments")
      .insert(rows);

    if (insertError) {
      return { error: insertError.message };
    }
  }

  // Sync to linked login membership(s)
  const { data: linkedUsers } = await supabase
    .from("organization_users")
    .select("id")
    .eq("organization_member_id", input.organizationMemberId);

  for (const user of linkedUsers ?? []) {
    const sync = await replaceOrganizationUserEventAssignmentsWithoutMemberSync({
      organizationId: input.organizationId,
      organizationUserId: user.id as string,
      eventIds: uniqueEventIds,
    });
    if ("error" in sync) {
      return sync;
    }
  }

  return { success: true, eventIds: uniqueEventIds };
}
