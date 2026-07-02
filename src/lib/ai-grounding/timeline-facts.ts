import { COMMUNICATION_CHANNELS } from "@/lib/event-workspace/constants";
import { formatEventDate } from "@/lib/utils/dates";
import type { TimelineStepGroundingFacts } from "@/lib/ai-grounding/types";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { EventCommunicationStep } from "@/types/playbooks";

function channelLabel(channel: CommunicationChannel): string {
  return (
    COMMUNICATION_CHANNELS.find((entry) => entry.channel === channel)?.label ??
    channel.replaceAll("_", " ")
  );
}

export function buildTimelineStepGroundingFacts(
  step: EventCommunicationStep | null | undefined,
): TimelineStepGroundingFacts | null {
  if (!step) return null;

  return {
    stepId: step.id,
    stepTitle: step.title,
    relativeDay: step.relativeDay,
    dueDate: formatEventDate(step.dueDate),
    channel: step.channel,
    channelLabel: channelLabel(step.channel),
    isRequired: step.isRequired,
  };
}
