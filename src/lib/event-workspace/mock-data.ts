import type { Event } from "@/types";
import { sanitizeVolunteerNeeds } from "@/lib/events/volunteer-needs";
import {
  COMMUNICATION_CHANNELS,
  DEFAULT_BUDGET,
  DEFAULT_EVENT_CATEGORY,
  DEFAULT_EVENT_OWNER,
  EVENT_ASSET_TYPES,
  TIMELINE_STEPS,
} from "@/lib/event-workspace/constants";
import type {
  CommunicationItem,
  EventAsset,
  EventWorkspaceData,
  ActivityLogEntry,
} from "@/types/event-workspace";

function offsetDate(dateString: string, days: number): string {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function buildFallbackWorkspaceData(event: Event): EventWorkspaceData {
  const now = new Date().toISOString();

  const assets: EventAsset[] = EVENT_ASSET_TYPES.map(({ assetType }, index) => ({
    id: `mock-asset-${index}`,
    eventId: event.id,
    assetType,
    filename: null,
    storagePath: null,
    status: "placeholder",
    aiGenerated: false,
    uploadedBy: null,
    currentVersion: 1,
    tags: [],
    isFavorite: false,
    canvaUrl: null,
    isCustom: false,
    planStatus: null,
    planLabel: null,
    generationPrompt: null,
    aiReview: null,
    inspirationMatch: null,
    generationSettings: null,
    createdAt: now,
    updatedAt: now,
  }));

  const communications: CommunicationItem[] = COMMUNICATION_CHANNELS.map(
    ({ channel }, index) => ({
      id: `mock-comm-${index}`,
      eventId: event.id,
      channel,
      eventCommunicationStepId: null,
      status: "draft",
      lastUpdated: now,
      isPublished: false,
      createdAt: now,
      updatedAt: now,
      latestContent: null,
    }),
  );

  const timeline: ActivityLogEntry[] = TIMELINE_STEPS.map((step, index) => ({
    id: `mock-timeline-${index}`,
    eventId: event.id,
    activityType: step.activityType,
    title: step.title,
    description: step.description,
    occurredAt:
      index === 0
        ? offsetDate(event.date, -21)
        : index === TIMELINE_STEPS.length - 1
          ? offsetDate(event.date, 1)
          : offsetDate(event.date, -18 + index * 3),
    createdAt: now,
  }));

  return {
    assets,
    communications,
    timeline,
    approvalRequests: [],
    publicationSchedule: [],
  };
}

export function getDisplayCategory(event: Event): string {
  return event.category ?? DEFAULT_EVENT_CATEGORY;
}

export function getDisplayOwner(event: Event): string {
  return event.eventOwner ?? DEFAULT_EVENT_OWNER;
}

export function getDisplayBudget(event: Event): string {
  return event.budget ?? DEFAULT_BUDGET;
}

export function getDisplayVolunteerNeeds(event: Event): string {
  return sanitizeVolunteerNeeds(event.volunteerNeeds) ?? "";
}
