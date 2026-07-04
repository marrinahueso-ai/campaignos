import { getArtworkWorkflowItems } from "@/lib/creative-studio/artwork-defaults";
import { groupArtworkPhasesByMilestone, type ArtworkPhaseWorkflowItem } from "@/lib/artwork-v2/campaign-phases";
import {
  resolveTimingPresetId,
  resolveTimingStepsForEvent,
  type TimingPresetId,
} from "@/lib/playbooks/timing-presets";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventAsset } from "@/types/event-workspace";
import type { EventCommunicationStep, EventType } from "@/types/playbooks";

export const COMMUNICATION_PLAN_STRATEGY_LABELS: Record<CommunicationStrategy, string> = {
  full_campaign: "Full Campaign",
  reminder_only: "Reminders Only",
  calendar_only: "Calendar Only",
  custom: "Custom",
};

const PRESET_DISPLAY_NAMES: Record<TimingPresetId, string> = {
  full_event: "General Event",
  book_fair: "Book Fair",
  pto_meeting: "PTO Meeting",
  recognition: "Teacher / Volunteer Appreciation",
  early_release: "Early Release Day",
  holiday: "Holiday / No School",
};

export function formatRelativeTimingLabel(relativeDay: number): string {
  if (relativeDay === 0) return "day of";
  if (relativeDay === 1) return "thank you";
  if (relativeDay === -1) return "day before";
  return `${Math.abs(relativeDay)} days before`;
}

export function getTimingPresetDisplayName(eventType: EventType | null): string {
  return PRESET_DISPLAY_NAMES[resolveTimingPresetId(eventType)];
}

export function getTimingPlanSummary(input: {
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  assignedSteps?: EventCommunicationStep[];
}): {
  presetName: string;
  summary: string;
  stepLabels: string[];
} {
  if (input.communicationStrategy === "calendar_only") {
    return {
      presetName: "Calendar Only",
      summary: "No campaign steps needed",
      stepLabels: [],
    };
  }

  if (input.communicationStrategy === "custom") {
    return {
      presetName: "Custom",
      summary: "Timing will be set when your custom plan is configured",
      stepLabels: [],
    };
  }

  const presetName = getTimingPresetDisplayName(input.eventType);

  if (input.assignedSteps && input.assignedSteps.length > 0) {
    const stepLabels = input.assignedSteps.map((step) =>
      formatRelativeTimingLabel(step.relativeDay),
    );
    return {
      presetName: `${presetName} (customized)`,
      summary: stepLabels.join(", "),
      stepLabels,
    };
  }

  const steps = resolveTimingStepsForEvent(input);
  const stepLabels = steps.map((step) => formatRelativeTimingLabel(step.relativeDay));
  const summary = stepLabels.length > 0 ? stepLabels.join(", ") : "No timing steps for this plan";

  return { presetName, summary, stepLabels };
}

export function getArtworkPlanLabels(input: {
  eventType: EventType | null;
  communicationStrategy: CommunicationStrategy;
  assets: EventAsset[];
}): string[] {
  const items = getArtworkWorkflowItems(input);

  if (items.some((item) => item.metaPlacement)) {
    return groupArtworkPhasesByMilestone(
      items.filter(
        (item): item is ArtworkPhaseWorkflowItem =>
          typeof item.relativeDay === "number" &&
          Boolean(item.metaPlacement) &&
          typeof item.formatLabel === "string",
      ),
    ).map((group) => `${group.title} — Feed + Story`);
  }

  return items.map(
    (item) =>
      item.channelLabel && item.channelLabel !== item.label
        ? `${item.label} (${item.channelLabel})`
        : item.label,
  );
}
