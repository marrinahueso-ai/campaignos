import {
  milestonesFromCommunicationSteps,
  resolveMetaArtworkMilestonesForEvent,
} from "@/lib/artwork-v2/campaign-phases";
import { getEventById } from "@/lib/events/queries";
import { getEventCommunicationSteps } from "@/lib/playbooks/queries";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { MetaArtworkMilestone } from "@/lib/artwork-v2/campaign-phases";
import type {
  EventCommunicationStep,
  EventCommunicationStepRow,
} from "@/types/playbooks";
export const META_SOCIAL_CHANNELS: CommunicationChannel[] = ["facebook", "instagram"];

export { milestonesFromCommunicationSteps };

export interface PlanMilestone {
  relativeDay: number;
  title: string;
}

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

type MilestoneStepRow = Pick<
  EventCommunicationStepRow,
  "relative_day" | "title" | "sort_order" | "channel" | "status"
>;

/** Meta workflow milestones (Artwork, Captions, Review) — FB/IG steps only, skipped excluded. */
export function metaWorkflowMilestonesFromStepRows(
  steps: MilestoneStepRow[],
): PlanMilestone[] {
  const active = steps.filter((step) => step.status !== "skipped");
  const socialDays = new Set<number>();

  for (const step of active) {
    if (META_SOCIAL_CHANNELS.includes(step.channel as CommunicationChannel)) {
      socialDays.add(step.relative_day);
    }
  }

  return Array.from(socialDays)
    .sort((leftDay, rightDay) => leftDay - rightDay)
    .map((relativeDay) => {
      const step = findCommunicationStepForRelativeDay(active, relativeDay, {
        preferMetaSocial: true,
      });
      return {
        relativeDay,
        title: step?.title ?? `Day ${relativeDay}`,
      };
    });
}

export function metaWorkflowMilestonesFromCommunicationSteps(
  steps: EventCommunicationStep[],
): PlanMilestone[] {
  return metaWorkflowMilestonesFromStepRows(
    steps.map((step) => ({
      relative_day: step.relativeDay,
      title: step.title,
      sort_order: step.sortOrder,
      channel: step.channel,
      status: step.status,
    })) as MilestoneStepRow[],
  );
}

/** Prefer the Meta social step when multiple plan rows share a relative day. */
export function findCommunicationStepForRelativeDay<T extends MilestoneStepRow>(
  steps: T[],
  relativeDay: number,
  options?: { preferMetaSocial?: boolean },
): T | undefined {
  const atDay = steps
    .filter((step) => step.relative_day === relativeDay)
    .sort(
      (left, right) =>
        left.sort_order - right.sort_order || left.relative_day - right.relative_day,
    );

  if (atDay.length === 0) {
    return undefined;
  }

  if (options?.preferMetaSocial) {
    return (
      atDay.find((step) =>
        META_SOCIAL_CHANNELS.includes(step.channel as CommunicationChannel),
      ) ?? atDay[0]
    );
  }

  return atDay[0];
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
