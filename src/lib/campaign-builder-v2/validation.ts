import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "@/lib/campaign-builder-v2/types";
import { isFirstCampaignMilestone } from "./first-milestone.ts";
import { defaultPurposeForMilestone } from "./milestone-purpose.ts";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  message: string | null;
}

export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) {
    return "";
  }
  if (errors.length === 1) {
    return errors[0]!;
  }
  return errors.join(" ");
}

export function validateInspirationForGeneration(
  inspiration: CampaignBuilderInspiration,
): ValidationResult {
  const errors: string[] = [];

  if (!inspiration.campaignName?.trim()) {
    errors.push("Select or enter a campaign name.");
  }
  if (!inspiration.eventDate?.trim()) {
    errors.push("Set the event date.");
  }
  if (!inspiration.playbookId?.trim()) {
    errors.push("Select a playbook.");
  }

  return {
    valid: errors.length === 0,
    errors,
    message: errors.length > 0 ? formatValidationErrors(errors) : null,
  };
}

/** Fill blank purposes so playbook-built milestones can generate immediately. */
export function ensurePurposesForGeneration(
  milestones: CampaignBuilderMilestone[],
  eventDate?: string | null,
): CampaignBuilderMilestone[] {
  return milestones.map((milestone) => {
    if (milestone.purpose?.trim()) {
      return milestone;
    }
    let relativeDay: number | null = null;
    if (eventDate && milestone.suggestedDate) {
      const event = Date.parse(`${eventDate}T12:00:00`);
      const suggested = Date.parse(`${milestone.suggestedDate}T12:00:00`);
      if (Number.isFinite(event) && Number.isFinite(suggested)) {
        relativeDay = Math.round((suggested - event) / (1000 * 60 * 60 * 24));
      }
    }
    return {
      ...milestone,
      purpose: defaultPurposeForMilestone({
        name: milestone.name,
        category: milestone.category,
        relativeDay,
        isFirstMilestone: isFirstCampaignMilestone(milestone.sortOrder),
      }),
    };
  });
}

export function validateMilestonesForGeneration(
  milestones: CampaignBuilderMilestone[],
): ValidationResult {
  const errors: string[] = [];

  if (milestones.length === 0) {
    errors.push("Add at least one milestone before generating content.");
    return { valid: false, errors, message: errors[0] ?? null };
  }

  for (const milestone of milestones) {
    if (!milestone.name?.trim()) {
      errors.push(`Milestone ${milestone.sortOrder + 1} needs a name.`);
    }
    if (!milestone.purpose?.trim()) {
      errors.push(`"${milestone.name || "Milestone"}" needs a purpose.`);
    }
    if (!milestone.suggestedDate?.trim()) {
      errors.push(`"${milestone.name || "Milestone"}" needs a suggested date.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    message: errors.length > 0 ? formatValidationErrors(errors) : null,
  };
}

export function validateBeforeGeneration(input: {
  inspiration: CampaignBuilderInspiration;
  milestones: CampaignBuilderMilestone[];
  milestoneIds?: string[];
}): ValidationResult {
  const inspirationResult = validateInspirationForGeneration(input.inspiration);
  if (!inspirationResult.valid) {
    return inspirationResult;
  }

  const withPurposes = ensurePurposesForGeneration(
    input.milestones,
    input.inspiration.eventDate,
  );

  const targetMilestones = input.milestoneIds?.length
    ? withPurposes.filter((milestone) =>
        input.milestoneIds!.includes(milestone.id),
      )
    : withPurposes;

  if (input.milestoneIds?.length && targetMilestones.length === 0) {
    return {
      valid: false,
      errors: ["Could not find the selected milestone."],
      message: "Could not find the selected milestone.",
    };
  }

  return validateMilestonesForGeneration(targetMilestones);
}

export interface SingleGenerationTargetResult {
  milestone: CampaignBuilderMilestone | null;
  error: string | null;
}

/**
 * Strictly resolves exactly one milestone eligible for generation.
 *
 * Every "generate content for this milestone" entry point must go through
 * this so a single, server-validated milestone (one that actually belongs to
 * the campaign's own milestone list) is ever targeted — never the whole
 * campaign, never a caller-supplied milestone that isn't part of this event.
 */
export function resolveSingleGenerationTarget(input: {
  milestones: CampaignBuilderMilestone[];
  milestoneIds: string[] | undefined;
}): SingleGenerationTargetResult {
  if (!input.milestoneIds || input.milestoneIds.length !== 1) {
    return {
      milestone: null,
      error: "Select exactly one milestone to generate content.",
    };
  }

  const [milestoneId] = input.milestoneIds;
  const milestone = input.milestones.find((entry) => entry.id === milestoneId) ?? null;

  if (!milestone) {
    return {
      milestone: null,
      error: "That milestone does not belong to this campaign.",
    };
  }

  return { milestone, error: null };
}
