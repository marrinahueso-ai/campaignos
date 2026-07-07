import type { CommunicationChannel } from "@/types/event-workspace";
import type {
  EventCommunicationStep,
  EventCommunicationStepRow,
} from "@/types/playbooks";

export const META_SOCIAL_CHANNELS: CommunicationChannel[] = ["facebook", "instagram"];

export interface PlanMilestone {
  relativeDay: number;
  title: string;
}

type MilestoneStepRow = Pick<
  EventCommunicationStepRow,
  "relative_day" | "title" | "sort_order" | "channel" | "status"
>;

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

/** Meta workflow milestones — Facebook and Instagram steps only, skipped excluded. */
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
