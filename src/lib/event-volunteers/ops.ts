import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import type {
  VolunteerOpsMark,
  VolunteerOpsSubjectType,
  VolunteerOpsStatus,
} from "@/lib/event-volunteers/ops-shared";

export type {
  VolunteerOpsMark,
  VolunteerOpsSubjectType,
  VolunteerOpsStatus,
} from "@/lib/event-volunteers/ops-shared";

export async function listEventVolunteerOps(
  eventId: string,
  organizationId: string,
): Promise<VolunteerOpsMark[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_volunteer_ops")
    .select("subject_type, subject_key, status, marked_at")
    .eq("event_id", eventId)
    .eq("organization_id", organizationId);

  if (error) {
    if (isMissingSchemaError(error) || error.code === "42P01") {
      return [];
    }
    throw error;
  }

  return (data ?? []).map((row) => ({
    subjectType: row.subject_type as VolunteerOpsSubjectType,
    subjectKey: row.subject_key as string,
    status: row.status as VolunteerOpsStatus,
    markedAt: row.marked_at as string,
  }));
}

export async function setEventVolunteerOp(input: {
  eventId: string;
  organizationId: string;
  userId: string;
  subjectType: VolunteerOpsSubjectType;
  subjectKey: string;
  marked: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
  const status: VolunteerOpsStatus =
    input.subjectType === "participant" ? "arrived" : "received";
  const supabase = await createClient();

  if (!input.marked) {
    const { error } = await supabase
      .from("event_volunteer_ops")
      .delete()
      .eq("event_id", input.eventId)
      .eq("organization_id", input.organizationId)
      .eq("subject_type", input.subjectType)
      .eq("subject_key", input.subjectKey);

    if (error) {
      if (isMissingSchemaError(error) || error.code === "42P01") {
        return {
          success: false,
          error: "Volunteer check-in isn’t available yet. Ask an admin to apply migrations.",
        };
      }
      return { success: false, error: "Unable to clear that mark." };
    }
    return { success: true };
  }

  const { error } = await supabase.from("event_volunteer_ops").upsert(
    {
      organization_id: input.organizationId,
      event_id: input.eventId,
      subject_type: input.subjectType,
      subject_key: input.subjectKey,
      status,
      marked_at: new Date().toISOString(),
      marked_by: input.userId,
    },
    { onConflict: "event_id,subject_type,subject_key" },
  );

  if (error) {
    if (isMissingSchemaError(error) || error.code === "42P01") {
      return {
        success: false,
        error: "Volunteer check-in isn’t available yet. Ask an admin to apply migrations.",
      };
    }
    return { success: false, error: "Unable to save that mark." };
  }

  return { success: true };
}
