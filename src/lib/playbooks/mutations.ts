import { createClient } from "@/lib/supabase/server";
import { computeDueDate } from "@/lib/playbooks/mappers";
import {
  DEFAULT_EVENT_TYPE,
  slugifyPlaybookName,
  SYSTEM_PLAYBOOK_IDS,
} from "@/lib/playbooks/constants";
import {
  getResolvedPlaybookIdForStrategy,
  shouldAssignPlaybook,
} from "@/lib/events/communication-strategy";
import {
  getDefaultPlaybookIdForEventType,
} from "@/lib/playbooks/queries";
import { resolveTimingStepsForEvent } from "@/lib/playbooks/timing-presets";
import type {
  CommunicationPlaybookStepRow,
  EventType,
  MetaPublishSurfaces,
  PlaybookEditorInput,
  PlaybookStepInput,
} from "@/types/playbooks";
import type { Event } from "@/types";
import type { CommunicationChannel } from "@/types/event-workspace";

function defaultMetaPublishSurfaces(
  channel: CommunicationChannel,
  surfaces?: MetaPublishSurfaces,
): MetaPublishSurfaces {
  if (surfaces) {
    return surfaces;
  }
  return "both";
}

export async function seedOrganizationPlaybookDefaults(
  organizationId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const defaults = Object.entries(SYSTEM_PLAYBOOK_IDS).map(
    ([eventType, playbookId]) => ({
      organization_id: organizationId,
      event_type: eventType,
      playbook_id: playbookId,
    }),
  );

  const { error } = await supabase
    .from("organization_playbook_defaults")
    .upsert(defaults, { onConflict: "organization_id,event_type" });

  if (error) {
    console.error("Failed to seed playbook defaults:", error.message);
    return false;
  }

  return true;
}

export async function assignPlaybookToEvent(
  event: Event,
  playbookId?: string,
  organizationId?: string | null,
): Promise<boolean> {
  const supabase = await createClient();

  if (!shouldAssignPlaybook(event.communicationStrategy)) {
    return true;
  }

  const { count } = await supabase
    .from("event_playbook_assignments")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id);

  if ((count ?? 0) > 0) {
    return true;
  }

  const eventType = (event.eventType as EventType | null) ?? DEFAULT_EVENT_TYPE;
  const defaultPlaybookId = await getDefaultPlaybookIdForEventType(
    eventType,
    organizationId ?? null,
  );
  const resolvedPlaybookId =
    playbookId ??
    getResolvedPlaybookIdForStrategy(
      event.communicationStrategy,
      defaultPlaybookId,
    );

  if (!resolvedPlaybookId) {
    return true;
  }

  const timingSteps = resolveTimingStepsForEvent({
    eventType,
    communicationStrategy: event.communicationStrategy,
  });

  if (timingSteps.length === 0) {
    return true;
  }

  const now = new Date().toISOString();

  const { data: assignment, error: assignmentError } = await supabase
    .from("event_playbook_assignments")
    .insert({
      event_id: event.id,
      playbook_id: resolvedPlaybookId,
      assigned_at: now,
    })
    .select("*")
    .single();

  if (assignmentError || !assignment) {
    console.error("Failed to assign playbook:", assignmentError?.message);
    return false;
  }

  const stepRows = timingSteps.map((step, index) => ({
    event_id: event.id,
    assignment_id: assignment.id,
    playbook_step_id: null,
    sort_order: index,
    relative_day: step.relativeDay,
    due_date: computeDueDate(event.date, step.relativeDay),
    title: step.title,
    channel: step.channel,
    is_required: true,
    status: "upcoming",
    meta_publish_surfaces: defaultMetaPublishSurfaces(
      step.channel,
      step.metaPublishSurfaces,
    ),
  }));

  const { error: stepsError } = await supabase
    .from("event_communication_steps")
    .insert(stepRows);

  if (stepsError) {
    console.error("Failed to create event communication steps:", stepsError.message);
    return false;
  }

  await supabase
    .from("events")
    .update({
      event_type:
        event.communicationStrategy === "reminder_only"
          ? "general_event"
          : eventType,
      updated_at: now,
    })
    .eq("id", event.id);

  return true;
}

export async function createPlaybook(
  organizationId: string | null,
  input: PlaybookEditorInput,
): Promise<string | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const baseSlug = slugifyPlaybookName(input.name);
  const slug = organizationId ? `${baseSlug}-${Date.now()}` : baseSlug;

  const { data, error } = await supabase
    .from("communication_playbooks")
    .insert({
      organization_id: organizationId,
      slug,
      name: input.name,
      description: input.description,
      event_type: input.eventType,
      is_system: false,
      is_archived: false,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create playbook:", error?.message);
    return null;
  }

  return data.id as string;
}

export async function duplicatePlaybook(
  sourcePlaybookId: string,
  organizationId: string | null,
): Promise<string | null> {
  const supabase = await createClient();

  const { data: source, error: sourceError } = await supabase
    .from("communication_playbooks")
    .select("*")
    .eq("id", sourcePlaybookId)
    .single();

  if (sourceError || !source) {
    return null;
  }

  const newId = await createPlaybook(organizationId, {
    name: `${source.name} (Copy)`,
    description: source.description,
    eventType: source.event_type as EventType,
  });

  if (!newId) return null;

  const { data: steps } = await supabase
    .from("communication_playbook_steps")
    .select("*")
    .eq("playbook_id", sourcePlaybookId)
    .order("sort_order", { ascending: true });

  if (steps && steps.length > 0) {
    const stepRows = (steps as CommunicationPlaybookStepRow[]).map((step) => ({
      playbook_id: newId,
      sort_order: step.sort_order,
      relative_day: step.relative_day,
      title: step.title,
      channel: step.channel,
      is_required: step.is_required,
      default_status: step.default_status,
    }));

    await supabase.from("communication_playbook_steps").insert(stepRows);
  }

  return newId;
}

export async function updatePlaybook(
  playbookId: string,
  input: PlaybookEditorInput,
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("communication_playbooks")
    .update({
      name: input.name,
      description: input.description,
      event_type: input.eventType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playbookId);

  return !error;
}

export async function archivePlaybook(playbookId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("communication_playbooks")
    .update({
      is_archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playbookId)
    .eq("is_system", false);

  return !error;
}

export type PlaybookMutationResult =
  | { success: true }
  | { success: false; error: string };

export type DeletePlaybookResult = PlaybookMutationResult;

export async function hideSystemPlaybookForOrg(
  playbookId: string,
  organizationId: string,
): Promise<PlaybookMutationResult> {
  const supabase = await createClient();

  const { data: playbook, error: fetchError } = await supabase
    .from("communication_playbooks")
    .select("id, is_system, name")
    .eq("id", playbookId)
    .maybeSingle();

  if (fetchError || !playbook) {
    return { success: false, error: "Playbook not found." };
  }

  if (!playbook.is_system) {
    return {
      success: false,
      error: "Only system playbooks can be removed from your list this way.",
    };
  }

  const { error: hideError } = await supabase
    .from("organization_hidden_playbooks")
    .upsert(
      {
        organization_id: organizationId,
        playbook_id: playbookId,
      },
      { onConflict: "organization_id,playbook_id" },
    );

  if (hideError) {
    console.error("Failed to hide system playbook:", hideError.message);
    return { success: false, error: "Unable to remove playbook from your list." };
  }

  return { success: true };
}

export async function deletePlaybook(
  playbookId: string,
  organizationId: string | null,
): Promise<DeletePlaybookResult> {
  const supabase = await createClient();

  const { data: playbook, error: fetchError } = await supabase
    .from("communication_playbooks")
    .select("id, organization_id, is_system, name")
    .eq("id", playbookId)
    .maybeSingle();

  if (fetchError || !playbook) {
    return { success: false, error: "Playbook not found." };
  }

  if (playbook.is_system) {
    return { success: false, error: "System playbooks cannot be deleted." };
  }

  if (!organizationId || playbook.organization_id !== organizationId) {
    return {
      success: false,
      error: "You can only delete playbooks in your organization.",
    };
  }

  const { count, error: countError } = await supabase
    .from("event_playbook_assignments")
    .select("*", { count: "exact", head: true })
    .eq("playbook_id", playbookId);

  if (countError) {
    console.error("Failed to check playbook assignments:", countError.message);
    return { success: false, error: "Unable to delete playbook." };
  }

  if ((count ?? 0) > 0) {
    return {
      success: false,
      error:
        "This playbook is assigned to one or more events and cannot be deleted. Archive it instead.",
    };
  }

  const { error: deleteError } = await supabase
    .from("communication_playbooks")
    .delete()
    .eq("id", playbookId)
    .eq("is_system", false)
    .eq("organization_id", organizationId);

  if (deleteError) {
    console.error("Failed to delete playbook:", deleteError.message);
    return { success: false, error: "Unable to delete playbook." };
  }

  return { success: true };
}

export async function replacePlaybookSteps(
  playbookId: string,
  steps: PlaybookStepInput[],
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error: deleteError } = await supabase
    .from("communication_playbook_steps")
    .delete()
    .eq("playbook_id", playbookId);

  if (deleteError) {
    console.error("Failed to clear playbook steps:", deleteError.message);
    return false;
  }

  if (steps.length === 0) {
    return true;
  }

  const rows = steps.map((step, index) => ({
    playbook_id: playbookId,
    sort_order: index,
    relative_day: step.relativeDay,
    title: step.title,
    channel: step.channel,
    is_required: step.isRequired,
    default_status: step.defaultStatus,
    updated_at: now,
  }));

  const { error: insertError } = await supabase
    .from("communication_playbook_steps")
    .insert(rows);

  if (insertError) {
    console.error("Failed to insert playbook steps:", insertError.message);
    return false;
  }

  await supabase
    .from("communication_playbooks")
    .update({ updated_at: now })
    .eq("id", playbookId);

  return true;
}

export async function replaceEventCommunicationTimeline(
  event: Event,
  steps: PlaybookStepInput[],
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: assignment } = await supabase
    .from("event_playbook_assignments")
    .select("id")
    .eq("event_id", event.id)
    .maybeSingle();

  if (!assignment?.id) {
    return false;
  }

  const { error: deleteError } = await supabase
    .from("event_communication_steps")
    .delete()
    .eq("event_id", event.id);

  if (deleteError) {
    console.error("Failed to clear event communication steps:", deleteError.message);
    return false;
  }

  if (steps.length === 0) {
    return true;
  }

  const stepRows = steps.map((step, index) => ({
    event_id: event.id,
    assignment_id: assignment.id,
    playbook_step_id: null,
    sort_order: index,
    relative_day: step.relativeDay,
    due_date: step.dueDate ?? computeDueDate(event.date, step.relativeDay),
    title: step.title,
    channel: step.channel,
    is_required: step.isRequired,
    status: step.defaultStatus === "skipped"
      ? "skipped"
      : step.defaultStatus === "completed"
        ? "completed"
        : "upcoming",
    meta_publish_surfaces: defaultMetaPublishSurfaces(
      step.channel,
      step.metaPublishSurfaces,
    ),
    updated_at: now,
  }));

  const { error: insertError } = await supabase
    .from("event_communication_steps")
    .insert(stepRows);

  if (insertError) {
    console.error("Failed to save custom event timeline:", insertError.message);
    return false;
  }

  return true;
}

export async function updateEventCommunicationStepStatus(
  stepId: string,
  status: "upcoming" | "completed" | "skipped",
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("event_communication_steps")
    .update({
      status,
      completed_at: status === "completed" ? now : null,
      updated_at: now,
    })
    .eq("id", stepId);

  return !error;
}

export async function reassignEventPlaybook(
  event: Event,
  playbookId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { error: deleteStepsError } = await supabase
    .from("event_communication_steps")
    .delete()
    .eq("event_id", event.id);

  if (deleteStepsError) {
    return false;
  }

  const { error: deleteAssignmentError } = await supabase
    .from("event_playbook_assignments")
    .delete()
    .eq("event_id", event.id);

  if (deleteAssignmentError) {
    return false;
  }

  return assignPlaybookToEvent(event, playbookId);
}

export async function syncOrganizationDefaultsFromSystem(
  organizationId: string,
): Promise<void> {
  await seedOrganizationPlaybookDefaults(organizationId);
}
