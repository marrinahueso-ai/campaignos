import { createClient } from "@/lib/supabase/server";
import { mapEventRow, toEventInsert } from "@/lib/events/mappers";
import { getTodayDateString } from "@/lib/utils/dates";
import type { CreateEventInput, Event, EventRow, EventStatus } from "@/types";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";

async function setEventStatus(id: string, status: EventStatus): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error(`Failed to set event status to ${status}:`, error.message);
    return false;
  }

  return true;
}

function restoredStatusForDate(date: string): EventStatus {
  const today = getTodayDateString();
  return date >= today ? "scheduled" : "draft";
}

export async function insertEvent(input: CreateEventInput): Promise<Event | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .insert(toEventInsert(input))
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to insert event:", error?.message);
    return null;
  }

  return mapEventRow(data as EventRow);
}

export async function updateEvent(
  id: string,
  input: Partial<CreateEventInput>,
): Promise<Event | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.time !== undefined && { time: input.time }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.audience !== undefined && { audience: input.audience }),
      ...(input.theme !== undefined && { theme: input.theme }),
      ...(input.status !== undefined && { status: input.status }),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to update event:", error?.message);
    return null;
  }

  return mapEventRow(data as EventRow);
}

export async function archiveEvent(id: string): Promise<boolean> {
  return setEventStatus(id, "archived");
}

export async function restoreEvent(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error: fetchError } = await supabase
    .from("events")
    .select("date")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !data) {
    console.error("Failed to load event for restore:", fetchError?.message);
    return false;
  }

  return setEventStatus(id, restoredStatusForDate(data.date as string));
}

export async function deleteEvent(id: string): Promise<boolean> {
  const supabase = await createClient();

  // Child rows cascade via FK: communication_items, communication_versions,
  // event_communication_steps, event_assets, approval_requests,
  // publication_schedule, activity_log, event_playbook_assignments.
  // TODO: Remove Supabase Storage objects referenced by event_assets.storage_path.
  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete event:", error?.message);
    return false;
  }

  return true;
}

export async function updateEventCampaignSettings(
  id: string,
  input: {
    eventType?: EventType;
    communicationStrategy?: CommunicationStrategy;
    approvalOrganizationRoleId?: string | null;
  },
): Promise<Event | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .update({
      ...(input.eventType !== undefined && { event_type: input.eventType }),
      ...(input.communicationStrategy !== undefined && {
        communication_strategy: input.communicationStrategy,
      }),
      ...(input.approvalOrganizationRoleId !== undefined && {
        approval_organization_role_id: input.approvalOrganizationRoleId,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to update event campaign settings:", error?.message);
    return null;
  }

  return mapEventRow(data as EventRow);
}
