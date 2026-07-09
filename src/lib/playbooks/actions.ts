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
  reassignEventPlaybook,
  replaceEventCommunicationTimeline,
  replacePlaybookSteps,
  updateEventCommunicationStepStatus,
  updatePlaybook,
} from "@/lib/playbooks/mutations";
import { resyncCampaignPlanDownstream } from "@/lib/campaign-plan/plan-milestones";
import { applyMilestoneScheduleTimesFromSteps } from "@/lib/meta-publishing/sync-slots";
import { getEventById } from "@/lib/events/queries";
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
    await replacePlaybookSteps(playbookId, steps);
  }

  revalidatePath("/settings/playbooks");
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

  const success = await updatePlaybook(playbookId, parsed);
  if (!success) {
    return { error: "Unable to update playbook.", success: false };
  }

  const steps = parseStepsFromFormData(formData);
  await replacePlaybookSteps(playbookId, steps);

  revalidatePath("/settings/playbooks");
  revalidatePath(`/settings/playbooks/${playbookId}`);
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

  revalidatePath("/settings/playbooks");
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

  revalidatePath("/settings/playbooks");
  revalidatePath("/settings/playbooks-milestones");
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

  revalidatePath("/settings/playbooks");
  revalidatePath("/settings/playbooks-milestones");
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
