"use server";

import { campaignRoleLabel } from "@/lib/auth/campaign-roles";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getApprovalActorFromSession } from "@/lib/event-workspace/get-approval-actor";
import { getEventById } from "@/lib/events/queries";
import {
  approveCommunicationDraft,
  requestCommunicationChanges,
  sendCommunicationForApproval,
} from "@/lib/event-workspace/approval-workflow";
import type { ApprovalActor } from "@/lib/event-workspace/approval-permissions";
import { normalizeEventDetailsInput } from "@/lib/event-workspace/event-form-utils";
import {
  generateCommunicationContent,
  initializeEventWorkspace,
  markCommunicationPublished,
  updateEventDetails,
  updateEventOverview,
  uploadEventAsset,
} from "@/lib/event-workspace/mutations";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import {
  isAllowedEventAssetFile,
  MAX_EVENT_ASSET_BYTES,
} from "@/lib/event-workspace/storage";
import type {
  CommunicationChannel,
  EventDetailsInput,
  EventOverviewInput,
} from "@/types/event-workspace";

export type WorkspaceActionState = {
  error: string | null;
  success: boolean;
};

async function getApprovalActor(): Promise<ApprovalActor | null> {
  return getApprovalActorFromSession();
}

export async function ensureEventWorkspaceAction(
  eventId: string,
): Promise<WorkspaceActionState> {
  const event = await getEventById(eventId);

  if (!event) {
    return { error: "Event not found.", success: false };
  }

  const initialized = await initializeEventWorkspace(event);

  if (!initialized) {
    return {
      error: "Unable to initialize event workspace. Run migration 003 first.",
      success: false,
    };
  }

  revalidateEventPaths(eventId);
  return { error: null, success: true };
}

export async function updateEventDetailsAction(
  eventId: string,
  input: EventDetailsInput,
): Promise<WorkspaceActionState> {
  if (!input.title.trim()) {
    return { error: "Event title is required.", success: false };
  }

  if (!input.date) {
    return { error: "Event date is required.", success: false };
  }

  const normalized = normalizeEventDetailsInput(input);
  if ("error" in normalized) {
    return { error: normalized.error, success: false };
  }

  const success = await updateEventDetails(eventId, normalized);

  if (!success) {
    return { error: "Unable to save event details.", success: false };
  }

  revalidateEventPaths(eventId);
  return { error: null, success: true };
}

export async function updateEventOverviewAction(
  eventId: string,
  input: EventOverviewInput,
): Promise<WorkspaceActionState> {
  const event = await getEventById(eventId);

  if (!event) {
    return { error: "Event not found.", success: false };
  }

  const success = await updateEventOverview(eventId, input, {
    title: event.title,
    date: event.date,
    category: event.category,
  });

  if (!success) {
    return { error: "Unable to save event overview.", success: false };
  }

  revalidateEventPaths(eventId);
  return { error: null, success: true };
}

export async function generateCommunicationAction(
  eventId: string,
  communicationItemId: string,
  channel: CommunicationChannel,
): Promise<WorkspaceActionState> {
  const success = await generateCommunicationContent(
    eventId,
    communicationItemId,
    channel,
  );

  if (!success) {
    return { error: "Unable to generate communication preview.", success: false };
  }

  revalidateEventPaths(eventId);
  return { error: null, success: true };
}

export async function approveCommunicationAction(
  eventId: string,
  communicationItemId: string,
): Promise<WorkspaceActionState> {
  const [role, actor] = await Promise.all([
    getCurrentCampaignRole(),
    getApprovalActor(),
  ]);
  const result = await approveCommunicationDraft(
    eventId,
    communicationItemId,
    role,
    actor,
  );

  if (!result.success) {
    return {
      error: result.error ?? "Unable to approve communication.",
      success: false,
    };
  }

  revalidateEventPaths(eventId);
  return { error: null, success: true };
}

export async function sendCommunicationForApprovalAction(
  eventId: string,
  communicationItemId: string,
): Promise<WorkspaceActionState> {
  const [role, actor] = await Promise.all([
    getCurrentCampaignRole(),
    getApprovalActor(),
  ]);
  const result = await sendCommunicationForApproval(
    eventId,
    communicationItemId,
    role,
    actor,
  );

  if (!result.success) {
    return {
      error: result.error ?? "Unable to send draft for approval.",
      success: false,
    };
  }

  revalidateEventPaths(eventId);
  return { error: null, success: true };
}

export async function requestCommunicationChangesAction(
  eventId: string,
  communicationItemId: string,
  notes?: string | null,
): Promise<WorkspaceActionState> {
  const [role, actor] = await Promise.all([
    getCurrentCampaignRole(),
    getApprovalActor(),
  ]);
  const result = await requestCommunicationChanges(
    eventId,
    communicationItemId,
    role,
    notes,
    actor,
  );

  if (!result.success) {
    return {
      error: result.error ?? "Unable to request changes.",
      success: false,
    };
  }

  revalidateEventPaths(eventId);
  return { error: null, success: true };
}

export async function publishCommunicationAction(
  eventId: string,
  communicationItemId: string,
): Promise<WorkspaceActionState> {
  const success = await markCommunicationPublished(communicationItemId);

  if (!success) {
    return { error: "Unable to mark communication as published.", success: false };
  }

  revalidateEventPaths(eventId);
  return { error: null, success: true };
}

export async function uploadEventAssetAction(
  eventId: string,
  assetId: string,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload.", success: false };
  }

  if (!isAllowedEventAssetFile(file)) {
    return {
      error: "Upload PNG, JPG, WebP, or PDF files only.",
      success: false,
    };
  }

  if (file.size > MAX_EVENT_ASSET_BYTES) {
    return { error: "File is too large (max 10 MB).", success: false };
  }

  const success = await uploadEventAsset(
    eventId,
    assetId,
    file,
    campaignRoleLabel(await getCurrentCampaignRole()),
  );

  if (!success) {
    return { error: "Unable to upload asset.", success: false };
  }

  revalidateEventPaths(eventId);
  return { error: null, success: true };
}
