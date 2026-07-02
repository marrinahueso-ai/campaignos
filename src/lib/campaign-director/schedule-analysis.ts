import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import { shouldAssignPlaybook } from "@/lib/events/communication-strategy";
import { addDaysToDateOnly } from "@/lib/utils/dates";
import type { CampaignIntelligenceInput } from "@/lib/campaign-intelligence/types";
import type { ScheduleInsight } from "@/lib/campaign-director/types";
import type { CommunicationChannel } from "@/types/event-workspace";

function channelLabel(channel: CommunicationChannel): string {
  return CHANNEL_LABELS[channel] ?? channel.replaceAll("_", " ");
}

export function analyzeCampaignSchedule(
  input: CampaignIntelligenceInput,
): ScheduleInsight[] {
  const insights: ScheduleInsight[] = [];

  if (
    input.event.communicationStrategy === "calendar_only" ||
    !shouldAssignPlaybook(input.event.communicationStrategy)
  ) {
    return insights;
  }

  const upcomingSteps = input.steps
    .filter((step) => step.status === "upcoming" && step.isRequired)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  for (const step of upcomingSteps) {
    if (step.dueDate < input.today) {
      insights.push({
        id: `schedule-overdue-${step.id}`,
        label: `${step.title} was due ${step.dueDate}`,
        dueDate: step.dueDate,
        severity: "critical",
      });
      continue;
    }

    if (step.dueDate === input.today) {
      insights.push({
        id: `schedule-today-${step.id}`,
        label: `${step.title} (${channelLabel(step.channel)}) is due today`,
        dueDate: step.dueDate,
        severity: "high",
      });
      continue;
    }

    if (step.dueDate <= addDaysToDateOnly(input.today, 3)) {
      insights.push({
        id: `schedule-soon-${step.id}`,
        label: `${step.title} due in the next few days`,
        dueDate: step.dueDate,
        severity: "medium",
      });
    }
  }

  const eventDate = input.event.date;
  if (eventDate && eventDate >= input.today && eventDate <= addDaysToDateOnly(input.today, 7)) {
    const incompleteBeforeEvent = upcomingSteps.filter(
      (step) => step.dueDate <= eventDate,
    );
    if (incompleteBeforeEvent.length >= 2) {
      insights.push({
        id: "schedule-cluster",
        label: `${incompleteBeforeEvent.length} communications due before event day`,
        dueDate: eventDate,
        severity: "medium",
      });
    }
  }

  return insights.slice(0, 6);
}
