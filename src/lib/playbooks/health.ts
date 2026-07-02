import type {
  CommunicationHealthSummary,
  EventCommunicationStep,
} from "@/types/playbooks";
import { getTodayDateString } from "@/lib/utils/dates";

export function calculateCommunicationHealth(
  steps: EventCommunicationStep[],
): CommunicationHealthSummary {
  const requiredSteps = steps.filter((step) => step.isRequired);

  if (requiredSteps.length === 0) {
    return {
      totalRequired: 0,
      completedRequired: 0,
      healthPercent: 0,
    };
  }

  const completedRequired = requiredSteps.filter(
    (step) => step.status === "completed",
  ).length;

  const healthPercent = Math.round(
    (completedRequired / requiredSteps.length) * 100,
  );

  return {
    totalRequired: requiredSteps.length,
    completedRequired,
    healthPercent,
  };
}

export function calculateAggregateHealth(
  summaries: CommunicationHealthSummary[],
): number {
  const withSteps = summaries.filter((summary) => summary.totalRequired > 0);

  if (withSteps.length === 0) {
    return 0;
  }

  const totalPercent = withSteps.reduce(
    (sum, summary) => sum + summary.healthPercent,
    0,
  );

  return Math.round(totalPercent / withSteps.length);
}

export function getUpcomingSteps(
  steps: EventCommunicationStep[],
  limit = 5,
): EventCommunicationStep[] {
  return steps
    .filter((step) => step.status === "upcoming")
    .sort((a, b) => {
      if (a.dueDate === b.dueDate) {
        return a.sortOrder - b.sortOrder;
      }
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, limit);
}

export function getDueTodaySteps(
  steps: EventCommunicationStep[],
): EventCommunicationStep[] {
  const today = getTodayDateString();
  return steps.filter(
    (step) => step.status === "upcoming" && step.dueDate === today,
  );
}

export function getOverdueSteps(
  steps: EventCommunicationStep[],
): EventCommunicationStep[] {
  const today = getTodayDateString();
  return steps.filter(
    (step) => step.status === "upcoming" && step.dueDate < today,
  );
}
