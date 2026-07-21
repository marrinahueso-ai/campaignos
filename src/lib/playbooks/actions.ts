"use server";

import { revalidatePath } from "next/cache";
import { shouldAssignPlaybook } from "@/lib/events/communication-strategy";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  archivePlaybook,
  assignPlaybookToEvent,
  createPlaybook,
  deletePlaybook,
  duplicatePlaybook,
  hideSystemPlaybookForOrg,
  reassignEventPlaybook,
  replaceEventCommunicationTimeline,
  replacePlaybookSteps,
  updateEventCommunicationStepStatus,
  updatePlaybook,
} from "@/lib/playbooks/mutations";
import { resyncCampaignPlanDownstream } from "@/lib/campaign-plan/plan-milestones";
import { applyMilestoneScheduleTimesFromSteps } from "@/lib/meta-publishing/sync-slots";
import { getEventById } from "@/lib/events/queries";
import { createClient } from "@/lib/supabase/server";
import { getPlaybookWithSteps } from "@/lib/playbooks/queries";
import type {
  EventType,
  PlaybookEditorInput,
  PlaybookStepInput,
} from "@/types/playbooks";
import type { CommunicationChannel } from "@/types/event-workspace";

export interface PlaybookActionState {
  error: string | null;
  success: boolean;
  playbookId?: string;
  /** True when a system template was copied into an org-editable playbook. */
  forkedFromSystem?: boolean;
}

function revalidatePlaybookPaths(playbookId?: string) {
  revalidatePath("/settings/playbooks");
  revalidatePath("/settings/playbooks-milestones");
  if (playbookId) {
    revalidatePath(`/settings/playbooks/${playbookId}`);
  }
}

function parsePlaybookInput(formData: FormData): PlaybookEditorInput | { error: string } {
  const name = formData.get("name")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  const eventType = formData.get("eventType")?.toString() as EventType;

  if (!name) {
    return { error: "Playbook name is required." };
  }

  if (!eventType) {
    return { error: "Event type is required." };
  }

  return { name, description, eventType };
}

function parseStepsFromFormData(formData: FormData): PlaybookStepInput[] {
  const raw = formData.get("steps")?.toString();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as PlaybookStepInput[];
    return parsed.map((step) => ({
      relativeDay: Number(step.relativeDay),
      title: step.title,
      channel: step.channel as CommunicationChannel,
      isRequired: Boolean(step.isRequired),
      defaultStatus: step.defaultStatus ?? "upcoming",
      metaPublishSurfaces: step.metaPublishSurfaces,
    }));
  } catch {
    return [];
  }
}

export async function createPlaybookAction(
  _prevState: PlaybookActionState,
  formData: FormData,
): Promise<PlaybookActionState> {
  const parsed = parsePlaybookInput(formData);
  if ("error" in parsed) {
    return { error: parsed.error, success: false };
  }

  const organization = await getLatestOrganization();
  const playbookId = await createPlaybook(organization?.id ?? null, parsed);

  if (!playbookId) {
    return { error: "Unable to create playbook.", success: false };
  }

  const steps = parseStepsFromFormData(formData);
  if (steps.length > 0) {
    const stepsOk = await replacePlaybookSteps(playbookId, steps);
    if (!stepsOk) {
      return {
        error: "Playbook created but milestones could not be saved.",
        success: false,
        playbookId,
      };
    }
  }

  revalidatePlaybookPaths(playbookId);
  return { error: null, success: true, playbookId };
}

export async function updatePlaybookAction(
  playbookId: string,
  _prevState: PlaybookActionState,
  formData: FormData,
): Promise<PlaybookActionState> {
  const parsed = parsePlaybookInput(formData);
  if ("error" in parsed) {
    return { error: parsed.error, success: false };
  }

  const steps = parseStepsFromFormData(formData);
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("communication_playbooks")
    .select("id, is_system, organization_id")
    .eq("id", playbookId)
    .maybeSingle();

  if (existingError || !existing) {
    return { error: "Playbook not found.", success: false };
  }

  // System templates are global read-only (RLS). Saving forks an org copy.
  if (existing.is_system) {
    const organization = await getLatestOrganization();
    if (!organization?.id) {
      return {
        error: "Complete School Setup before customizing playbooks.",
        success: false,
      };
    }

    const forkedId = await createPlaybook(organization.id, parsed);
    if (!forkedId) {
      return {
        error: "Unable to create an editable copy of this system playbook.",
        success: false,
      };
    }

    const stepsOk = await replacePlaybookSteps(forkedId, steps);
    if (!stepsOk) {
      return {
        error: "Unable to save milestones on the new playbook copy.",
        success: false,
        playbookId: forkedId,
      };
    }

    revalidatePlaybookPaths(forkedId);
    revalidatePlaybookPaths(playbookId);
    return {
      error: null,
      success: true,
      playbookId: forkedId,
      forkedFromSystem: true,
    };
  }

  const success = await updatePlaybook(playbookId, parsed);
  if (!success) {
    return {
      error:
        "Unable to update playbook. You can only edit playbooks owned by your organization.",
      success: false,
    };
  }

  const stepsOk = await replacePlaybookSteps(playbookId, steps);
  if (!stepsOk) {
    return {
      error: "Playbook details saved, but milestones could not be updated.",
      success: false,
      playbookId,
    };
  }

  revalidatePlaybookPaths(playbookId);
  return { error: null, success: true, playbookId };
}

export async function duplicatePlaybookAction(
  playbookId: string,
): Promise<PlaybookActionState> {
  const organization = await getLatestOrganization();
  const newId = await duplicatePlaybook(playbookId, organization?.id ?? null);

  if (!newId) {
    return { error: "Unable to duplicate playbook.", success: false };
  }

  revalidatePlaybookPaths(newId);
  return { error: null, success: true, playbookId: newId };
}

export async function archivePlaybookAction(
  playbookId: string,
): Promise<PlaybookActionState> {
  const success = await archivePlaybook(playbookId);

  if (!success) {
    return {
      error: "Unable to archive playbook. System playbooks cannot be archived.",
      success: false,
    };
  }

  revalidatePlaybookPaths(playbookId);
  return { error: null, success: true };
}

export async function deletePlaybookAction(
  playbookId: string,
): Promise<PlaybookActionState> {
  const organization = await getLatestOrganization();
  const result = await deletePlaybook(playbookId, organization?.id ?? null);

  if (!result.success) {
    return { error: result.error, success: false };
  }

  revalidatePlaybookPaths(playbookId);
  return { error: null, success: true };
}

export async function hideSystemPlaybookAction(
  playbookId: string,
): Promise<PlaybookActionState> {
  const organization = await getLatestOrganization();

  if (!organization?.id) {
    return { error: "Organization not found.", success: false };
  }

  const result = await hideSystemPlaybookForOrg(playbookId, organization.id);

  if (!result.success) {
    return { error: result.error, success: false };
  }

  revalidatePlaybookPaths(playbookId);
  return { error: null, success: true };
}

export async function assignPlaybookToEventAction(
  eventId: string,
  playbookId: string,
): Promise<PlaybookActionState> {
  const event = await getEventById(eventId);

  if (!event) {
    return { error: "Event not found.", success: false };
  }

  if (!shouldAssignPlaybook(event.communicationStrategy)) {
    return {
      error: "This event strategy does not use a communication playbook.",
      success: false,
    };
  }

  const success = await reassignEventPlaybook(event, playbookId);

  if (!success) {
    return { error: "Unable to assign playbook.", success: false };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return { error: null, success: true };
}

export async function completeCommunicationStepAction(
  stepId: string,
  eventId: string,
): Promise<PlaybookActionState> {
  const success = await updateEventCommunicationStepStatus(stepId, "completed");

  if (!success) {
    return { error: "Unable to mark step complete.", success: false };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return { error: null, success: true };
}

export async function skipCommunicationStepAction(
  stepId: string,
  eventId: string,
): Promise<PlaybookActionState> {
  const success = await updateEventCommunicationStepStatus(stepId, "skipped");

  if (!success) {
    return { error: "Unable to skip step.", success: false };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return { error: null, success: true };
}

export async function resetCommunicationStepAction(
  stepId: string,
  eventId: string,
): Promise<PlaybookActionState> {
  const success = await updateEventCommunicationStepStatus(stepId, "upcoming");

  if (!success) {
    return { error: "Unable to reset step.", success: false };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/dashboard");
  return { error: null, success: true };
}

export async function ensureEventHasPlaybookAction(
  eventId: string,
): Promise<boolean> {
  const event = await getEventById(eventId);
  if (!event || !shouldAssignPlaybook(event.communicationStrategy)) return false;

  const organization = await getLatestOrganization();
  return assignPlaybookToEvent(event, undefined, organization?.id ?? null);
}

export async function getPlaybookEditorData(playbookId: string) {
  return getPlaybookWithSteps(playbookId);
}

export async function updateEventCommunicationTimelineAction(
  eventId: string,
  steps: PlaybookStepInput[],
): Promise<PlaybookActionState> {
  const event = await getEventById(eventId);

  if (!event) {
    return { error: "Event not found.", success: false };
  }

  if (steps.length === 0) {
    return { error: "Add at least one communication milestone.", success: false };
  }

  const success = await replaceEventCommunicationTimeline(event, steps);

  if (!success) {
    return { error: "Unable to save timeline changes.", success: false };
  }

  await resyncCampaignPlanDownstream(eventId);
  await applyMilestoneScheduleTimesFromSteps(eventId, steps);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return { error: null, success: true };
}
