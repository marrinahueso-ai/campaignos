"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveEvent,
  deleteEvent,
  insertEvent,
  restoreEvent,
} from "@/lib/events/mutations";
import { updateEventCommunicationStrategy } from "@/lib/calendar-import/mutations";
import { initializeEventWorkspace } from "@/lib/event-workspace/mutations";
import {
  canDemoteToCalendarOnly,
  shouldAssignPlaybook,
} from "@/lib/events/communication-strategy";
import { parseCreateEventInput } from "@/lib/events/validation";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import { resyncCampaignPlanDownstream } from "@/lib/campaign-plan/plan-milestones";
import { assignPlaybookToEvent, reassignEventPlaybook } from "@/lib/playbooks/mutations";
import {
  getDefaultPlaybookIdForEventType,
  getPlaybooksForOrganization,
} from "@/lib/playbooks/queries";
import type { EventType } from "@/types/playbooks";
import { getEventById } from "@/lib/events/queries";
import { updateEventCampaignSettings } from "@/lib/events/mutations";
import { getLatestOrganization } from "@/lib/organizations/queries";
import type { CommunicationStrategy } from "@/types/communication-strategy";

import {
  createEventErrorState,
  type CreateEventFormState,
} from "@/lib/events/create-event-form-state";

export type EventActionState = {
  error: string | null;
  success: boolean;
};

export async function createEvent(
  _prevState: CreateEventFormState,
  formData: FormData,
): Promise<CreateEventFormState> {
  const parsed = parseCreateEventInput(formData);

  if ("error" in parsed) {
    return createEventErrorState(formData, parsed.error);
  }

  const organization = await getLatestOrganization();
  const playbookIdRaw = formData.get("playbookId")?.toString().trim() ?? "";
  let playbookId: string | undefined;
  const eventInput = { ...parsed.data };

  if (shouldAssignPlaybook(eventInput.communicationStrategy)) {
    const playbooks = await getPlaybooksForOrganization(organization?.id ?? null);
    const selected = playbooks.find((playbook) => playbook.id === playbookIdRaw);

    if (!selected) {
      return createEventErrorState(
        formData,
        "Please select a playbook from your Settings templates.",
      );
    }

    playbookId = selected.id;
    eventInput.eventType = selected.eventType;
  }

  const event = await insertEvent(eventInput);

  if (!event) {
    return createEventErrorState(
      formData,
      "Unable to save event. Please check your connection and try again.",
    );
  }

  await assignPlaybookToEvent(event, playbookId, organization?.id ?? null);

  const onboardingCreate =
    formData.get("onboarding")?.toString() === "1" ||
    formData.get("onboarding")?.toString() === "true";

  if (onboardingCreate && organization?.id) {
    const { patchOrganizationOnboardingState } = await import(
      "@/lib/onboarding/mutations"
    );
    const now = new Date().toISOString();
    await patchOrganizationOnboardingState(organization.id, {
      firstEventId: event.id,
      firstEventCompletedAt: now,
      startedAt: now,
    });
    revalidatePath("/dashboard");
    revalidatePath("/events");
    revalidatePath("/onboarding");
    redirect(`/events/${event.id}?onboarding=calendar`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}

export async function archiveEventAction(
  eventId: string,
): Promise<EventActionState> {
  const event = await getEventById(eventId);

  if (!event) {
    return { error: "Event not found.", success: false };
  }

  if (event.status === "archived") {
    return { error: null, success: true };
  }

  const success = await archiveEvent(eventId);

  if (!success) {
    return { error: "Unable to archive event.", success: false };
  }

  revalidateEventPaths(eventId);
  return { error: null, success: true };
}

export async function restoreEventAction(
  eventId: string,
): Promise<EventActionState> {
  const event = await getEventById(eventId);

  if (!event) {
    return { error: "Event not found.", success: false };
  }

  if (event.status !== "archived") {
    return { error: null, success: true };
  }

  const success = await restoreEvent(eventId);

  if (!success) {
    return { error: "Unable to restore event.", success: false };
  }

  revalidateEventPaths(eventId);
  return { error: null, success: true };
}

export async function deleteEventAction(
  eventId: string,
): Promise<EventActionState> {
  const event = await getEventById(eventId);

  if (!event) {
    return { error: "Event not found.", success: false };
  }

  const success = await deleteEvent(eventId);

  if (!success) {
    return {
      error: "Unable to delete event. It may still be linked to other records.",
      success: false,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/events");
  revalidatePath("/campaigns");
  revalidatePath("/calendar");
  revalidatePath("/communications/calendar");
  revalidatePath("/publishing");
  revalidatePath("/approvals");
  return { error: null, success: true };
}

export async function deleteEventAndRedirectAction(
  eventId: string,
): Promise<void> {
  const result = await deleteEventAction(eventId);

  if (!result.success) {
    throw new Error(result.error ?? "Unable to delete event.");
  }

  redirect("/events");
}

export async function removeFromCampaignsAction(
  eventId: string,
): Promise<EventActionState> {
  const event = await getEventById(eventId);

  if (!event) {
    return { error: "Event not found.", success: false };
  }

  if (event.communicationStrategy === "calendar_only") {
    return { error: null, success: true };
  }

  if (!canDemoteToCalendarOnly(event.communicationStrategy)) {
    return {
      error:
        "Reminder-only campaigns stay on this page because they include social posts.",
      success: false,
    };
  }

  const updated = await updateEventCommunicationStrategy(
    eventId,
    "calendar_only",
  );

  if (!updated) {
    return {
      error: "Unable to move this event to calendar-only.",
      success: false,
    };
  }

  revalidateEventPaths(eventId);
  return { error: null, success: true };
}

export async function updateEventPlanTypeAction(
  eventId: string,
  strategy: CommunicationStrategy,
): Promise<EventActionState> {
  const event = await getEventById(eventId);

  if (!event) {
    return { error: "Event not found.", success: false };
  }

  if (event.communicationStrategy === strategy) {
    return { error: null, success: true };
  }

  const wasCampaign = shouldAssignPlaybook(event.communicationStrategy);
  const willCampaign = shouldAssignPlaybook(strategy);

  const updated = await updateEventCommunicationStrategy(eventId, strategy);

  if (!updated) {
    return { error: "Unable to update plan type.", success: false };
  }

  if (!wasCampaign && willCampaign) {
    const organization = await getLatestOrganization();
    await assignPlaybookToEvent(updated, undefined, organization?.id ?? null);
    await initializeEventWorkspace(updated);
  } else if (wasCampaign && willCampaign) {
    const organization = await getLatestOrganization();
    await assignPlaybookToEvent(updated, undefined, organization?.id ?? null);
    await initializeEventWorkspace(updated);
  }

  revalidateEventPaths(eventId);
  revalidatePath("/calendar");
  revalidatePath("/events");
  return { error: null, success: true };
}

export async function updateEventCampaignSettingsAction(
  eventId: string,
  input: {
    eventType?: EventType;
    communicationStrategy?: CommunicationStrategy;
    approvalOrganizationRoleId?: string | null;
  },
): Promise<EventActionState> {
  const event = await getEventById(eventId);

  if (!event) {
    return { error: "Event not found.", success: false };
  }

  const eventTypeChanged =
    input.eventType !== undefined && input.eventType !== event.eventType;
  const strategyChanged =
    input.communicationStrategy !== undefined &&
    input.communicationStrategy !== event.communicationStrategy;

  const updated = await updateEventCampaignSettings(eventId, input);

  if (!updated) {
    return { error: "Unable to save campaign settings.", success: false };
  }

  if (eventTypeChanged || strategyChanged) {
    const wasCampaign = shouldAssignPlaybook(event.communicationStrategy);
    const willCampaign = shouldAssignPlaybook(updated.communicationStrategy);

    if (wasCampaign && !willCampaign) {
      // Playbook stays assigned; calendar-only events use a different layout.
    } else if (willCampaign) {
      const organization = await getLatestOrganization();
      const defaultPlaybookId = await getDefaultPlaybookIdForEventType(
        updated.eventType ?? "general_event",
        organization?.id ?? null,
      );

      if (defaultPlaybookId) {
        if (wasCampaign) {
          await reassignEventPlaybook(updated, defaultPlaybookId);
        } else {
          await assignPlaybookToEvent(updated, defaultPlaybookId, organization?.id ?? null);
          await initializeEventWorkspace(updated);
        }
        await resyncCampaignPlanDownstream(eventId);
      }
    }
  }

  revalidateEventPaths(eventId);
  revalidatePath("/calendar");
  revalidatePath("/events");
  return { error: null, success: true };
}

