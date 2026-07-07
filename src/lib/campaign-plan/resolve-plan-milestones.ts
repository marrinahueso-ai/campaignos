import {
  milestonesFromCommunicationSteps,
  resolveMetaArtworkMilestonesForEvent,
} from "@/lib/artwork-v2/campaign-phases";
import {
  findCommunicationStepForRelativeDay,
  metaWorkflowMilestonesFromCommunicationSteps,
  metaWorkflowMilestonesFromStepRows,
  META_SOCIAL_CHANNELS,
  type PlanMilestone,
} from "@/lib/campaign-plan/plan-milestone-client";
import { getEventById } from "@/lib/events/queries";
import { getEventCommunicationSteps } from "@/lib/playbooks/queries";
import type { MetaArtworkMilestone } from "@/lib/artwork-v2/campaign-phases";
import type {
  EventCommunicationStep,
  EventCommunicationStepRow,
} from "@/types/playbooks";

export { milestonesFromCommunicationSteps };
export {
  findCommunicationStepForRelativeDay,
  metaWorkflowMilestonesFromCommunicationSteps,
  metaWorkflowMilestonesFromStepRows,
  META_SOCIAL_CHANNELS,
  type PlanMilestone,
};

function planMilestonesFromStepRows(
  steps: EventCommunicationStepRow[],
): PlanMilestone[] {
  const byDay = new Map<number, string>();

  for (const step of [...steps].sort(
    (left, right) =>
      left.relative_day - right.relative_day || left.sort_order - right.sort_order,
  )) {
    if (!byDay.has(step.relative_day)) {
      byDay.set(step.relative_day, step.title);
    }
  }

  return Array.from(byDay.entries())
    .sort(([leftDay], [rightDay]) => leftDay - rightDay)
    .map(([relativeDay, title]) => ({ relativeDay, title }));
}

export function planMilestonesFromCommunicationSteps(
  steps: EventCommunicationStep[],
): PlanMilestone[] {
  return planMilestonesFromStepRows(
    steps.map((step) => ({
      relative_day: step.relativeDay,
      title: step.title,
      sort_order: step.sortOrder,
    })) as EventCommunicationStepRow[],
  );
}

export function planMilestonesFromStepRowsForDisplay(
  steps: EventCommunicationStepRow[],
): PlanMilestone[] {
  return planMilestonesFromStepRows(steps);
}

export async function resolveArtworkMilestonesForEvent(
  eventId: string,
): Promise<MetaArtworkMilestone[]> {
  const event = await getEventById(eventId);
  if (!event) {
    return [];
  }

  const steps = await getEventCommunicationSteps(eventId);

  if (steps.length > 0) {
    return metaWorkflowMilestonesFromCommunicationSteps(steps);
  }

  return resolveMetaArtworkMilestonesForEvent({
    eventType: event.eventType,
    communicationStrategy: event.communicationStrategy,
  });
}

export async function resolvePlanMilestonesForEvent(
  eventId: string,
): Promise<PlanMilestone[]> {
  const event = await getEventById(eventId);
  if (!event) {
    return [];
  }

  const steps = await getEventCommunicationSteps(eventId);

  if (steps.length > 0) {
    return planMilestonesFromCommunicationSteps(steps);
  }

  return resolveMetaArtworkMilestonesForEvent({
    eventType: event.eventType,
    communicationStrategy: event.communicationStrategy,
  });
}

/** Meta publish + caption milestones — Facebook and Instagram steps only. */
export async function resolveSocialMetaMilestonesForEvent(
  eventId: string,
): Promise<MetaArtworkMilestone[]> {
  const event = await getEventById(eventId);
  if (!event) {
    return [];
  }

  const steps = await getEventCommunicationSteps(eventId);

  if (steps.length > 0) {
    return metaWorkflowMilestonesFromCommunicationSteps(steps);
  }

  return resolveMetaArtworkMilestonesForEvent({
    eventType: event.eventType,
    communicationStrategy: event.communicationStrategy,
  });
}
