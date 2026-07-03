import {
  DEFAULT_EVENT_TYPE,
  EVENT_TYPE_LABELS,
  SYSTEM_PLAYBOOK_IDS,
} from "@/lib/playbooks/constants";
import { computeDueDate } from "@/lib/playbooks/mappers";
import { resolveTimingStepsForEvent } from "@/lib/playbooks/timing-presets";
import { calculateCommunicationHealth } from "@/lib/playbooks/health";
import type { Event } from "@/types";
import type {
  CommunicationPlaybook,
  EventCommunicationStep,
  EventPlaybookData,
  EventType,
} from "@/types/playbooks";

export function buildFallbackPlaybookData(event: Event): EventPlaybookData {
  const eventType = (event.eventType as EventType | null) ?? DEFAULT_EVENT_TYPE;
  const stepDefs = resolveTimingStepsForEvent({
    eventType,
    communicationStrategy: event.communicationStrategy,
  });
  const now = new Date().toISOString();

  const playbook: CommunicationPlaybook = {
    id: SYSTEM_PLAYBOOK_IDS[eventType],
    organizationId: null,
    slug: eventType.replace(/_/g, "-"),
    name: EVENT_TYPE_LABELS[eventType],
    description: `Default ${EVENT_TYPE_LABELS[eventType]} communication plan.`,
    eventType,
    isSystem: true,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    stepCount: stepDefs.length,
  };

  const steps: EventCommunicationStep[] = stepDefs.map((def, index) => ({
    id: `mock-step-${event.id}-${index}`,
    eventId: event.id,
    assignmentId: `mock-assignment-${event.id}`,
    playbookStepId: null,
    sortOrder: index,
    relativeDay: def.relativeDay,
    dueDate: computeDueDate(event.date, def.relativeDay),
    title: def.title,
    channel: def.channel,
    isRequired: true,
    status: "upcoming",
    metaPublishSurfaces: def.metaPublishSurfaces ?? "both",
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  }));

  const health = calculateCommunicationHealth(steps);

  return {
    assignment: {
      id: `mock-assignment-${event.id}`,
      eventId: event.id,
      playbookId: playbook.id,
      assignedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    playbook,
    steps,
    healthPercent: health.healthPercent,
  };
}
