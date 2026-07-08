import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "@/lib/campaign-builder-v2/types";

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

  const targetMilestones = input.milestoneIds?.length
    ? input.milestones.filter((milestone) =>
        input.milestoneIds!.includes(milestone.id),
      )
    : input.milestones;

  if (input.milestoneIds?.length && targetMilestones.length === 0) {
    return {
      valid: false,
      errors: ["Could not find the selected milestone."],
      message: "Could not find the selected milestone.",
    };
  }

  return validateMilestonesForGeneration(targetMilestones);
}
