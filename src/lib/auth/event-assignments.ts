import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getOrganizationSchoolYearIds } from "@/lib/events/org-scope";

async function writeMemberEventRows(input: {
  organizationId: string;
  organizationMemberId: string;
  eventIds: string[];
}): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const uniqueEventIds = Array.from(
    new Set(input.eventIds.map((id) => id.trim()).filter(Boolean)),
  );

  const { error: deleteError } = await supabase
    .from("organization_member_event_assignments")
    .delete()
    .eq("organization_member_id", input.organizationMemberId);

  if (deleteError) {
    if (deleteError.code === "42P01") {
      return { success: true };
    }
    return { error: deleteError.message };
  }

  if (uniqueEventIds.length === 0) {
    return { success: true };
  }

  const { error: insertError } = await supabase
    .from("organization_member_event_assignments")
    .insert(
      uniqueEventIds.map((eventId) => ({
        organization_id: input.organizationId,
        organization_member_id: input.organizationMemberId,
        event_id: eventId,
      })),
    );

  if (insertError) {
    return { error: insertError.message };
  }

  return { success: true };
}

async function writeUserEventRows(input: {
  organizationId: string;
  organizationUserId: string;
  eventIds: string[];
}): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const uniqueEventIds = Array.from(
    new Set(input.eventIds.map((id) => id.trim()).filter(Boolean)),
  );

  const { error: deleteError } = await supabase
    .from("organization_user_event_assignments")
    .delete()
    .eq("organization_user_id", input.organizationUserId);

  if (deleteError) {
    if (deleteError.code === "42P01") {
      return uniqueEventIds.length === 0
        ? { success: true }
        : { error: "Event assignment table is missing. Apply migration 059." };
    }
    return { error: deleteError.message };
  }

  if (uniqueEventIds.length === 0) {
    return { success: true };
  }

  const { error: insertError } = await supabase
    .from("organization_user_event_assignments")
    .insert(
      uniqueEventIds.map((eventId) => ({
        organization_id: input.organizationId,
        organization_user_id: input.organizationUserId,
        event_id: eventId,
      })),
    );

  if (insertError) {
    return { error: insertError.message };
  }

  return { success: true };
}

export async function replaceOrganizationUserEventAssignments(input: {
  organizationId: string;
  organizationUserId: string;
  eventIds: string[];
  /** When true, also write to linked organization_members events. Default true. */
  syncLinkedMember?: boolean;
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

  const writeUser = await writeUserEventRows({
    organizationId: input.organizationId,
    organizationUserId: input.organizationUserId,
    eventIds: uniqueEventIds,
  });
  if ("error" in writeUser) {
    return writeUser;
  }

  if (input.syncLinkedMember !== false) {
    const { data: user } = await supabase
      .from("organization_users")
      .select("organization_member_id")
      .eq("id", input.organizationUserId)
      .maybeSingle();

    const memberId = user?.organization_member_id as string | null | undefined;
    if (memberId) {
      const sync = await writeMemberEventRows({
        organizationId: input.organizationId,
        organizationMemberId: memberId,
        eventIds: uniqueEventIds,
      });
      if ("error" in sync) {
        return sync;
      }
    }
  }

  return { success: true, eventIds: uniqueEventIds };
}

export async function replaceOrganizationUserEventAssignmentsWithoutMemberSync(input: {
  organizationId: string;
  organizationUserId: string;
  eventIds: string[];
}): Promise<{ error: string } | { success: true; eventIds: string[] }> {
  return replaceOrganizationUserEventAssignments({
    ...input,
    syncLinkedMember: false,
  });
}

export async function listOrganizationUserEventIds(
  organizationUserId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_user_event_assignments")
    .select("event_id")
    .eq("organization_user_id", organizationUserId);

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    console.error("Failed to load user event assignments:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.event_id as string);
}

export async function listOrganizationUserEventAssignmentsByOrg(
  organizationId: string,
): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_user_event_assignments")
    .select("organization_user_id, event_id")
    .eq("organization_id", organizationId);

  if (error) {
    if (error.code === "42P01") {
      return {};
    }
    console.error("Failed to load org event assignments:", error.message);
    return {};
  }

  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    const userId = row.organization_user_id as string;
    const eventId = row.event_id as string;
    if (!map[userId]) {
      map[userId] = [];
    }
    map[userId].push(eventId);
  }
  return map;
}
