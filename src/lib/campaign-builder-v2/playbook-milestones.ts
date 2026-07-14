import { defaultEnabledFormats, emptyMilestoneArtwork } from "./platform-utils.ts";
import { milestoneNameMatchKey, normalizeMilestoneName } from "./milestone-names.ts";
import type {
  CampaignBuilderMilestone,
  MilestoneCategory,
  MilestonePreviewContent,
  PlatformFormat,
} from "./types.ts";

/** Minimal shape needed from a communication playbook step (avoids importing
 * the full @/types/playbooks module into every consumer). */
export interface PlaybookMilestoneStep {
  title: string;
  channel: string;
  relativeDay: number;
  sortOrder: number;
}

function createMilestoneId(): string {
  return `ms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function categoryForRelativeDay(relativeDay: number): MilestoneCategory {
  if (relativeDay < -14) return "awareness";
  if (relativeDay < 0) return "reminder";
  if (relativeDay === 0) return "event-day";
  return "recap";
}

function dateForRelativeDay(eventDate: string, relativeDay: number): string {
  const base = new Date(`${eventDate}T12:00:00`);
  base.setDate(base.getDate() + relativeDay);
  return base.toISOString().slice(0, 10);
}

function platformsForChannel(channel: string): Array<"facebook" | "instagram"> {
  if (channel === "facebook") return ["facebook"];
  if (channel === "instagram") return ["instagram"];
  // Non-social channels (email/newsletter/website) don't map to a single
  // social platform; default to both so the milestone still has feed/story
  // artwork + caption slots to work with.
  return ["facebook", "instagram"];
}

function platformFormatsForPlatforms(
  platforms: Array<"facebook" | "instagram">,
): PlatformFormat[] {
  const all = defaultEnabledFormats();
  if (platforms.length === 2) return all;
  return all.filter((format) => format.startsWith(platforms[0]));
}

function buildPreviewForMilestone(
  milestone: CampaignBuilderMilestone,
): MilestonePreviewContent {
  return {
    milestoneId: milestone.id,
    status: "draft",
    artwork: emptyMilestoneArtwork(),
    captions: [
      { platform: "facebook", text: "" },
      { platform: "instagram", text: "" },
    ],
    enabledFormats: milestone.platformFormats,
    deliveryMethod: "auto-publish",
    scheduleDate: milestone.suggestedDate,
    scheduleTime: "09:00",
    emailSendDate: milestone.suggestedDate,
    emailSendTime: "09:00",
    manualEmailTo: "",
    manualUploadLink: "",
    approvalStatuses: [
      { role: "creator", label: "Creator", status: "not-started", timestamp: null },
      {
        role: "committee-chair",
        label: "Committee Chair",
        status: "not-started",
        timestamp: null,
      },
      {
        role: "vp-comms",
        label: "VP Communications",
        status: "not-started",
        timestamp: null,
      },
    ],
  };
}

function buildMilestoneFromPlaybookStep(
  step: PlaybookMilestoneStep,
  eventDate: string,
  sortOrder: number,
): CampaignBuilderMilestone {
  const platforms = platformsForChannel(step.channel);
  return {
    id: createMilestoneId(),
    name: normalizeMilestoneName(step.title),
    category: categoryForRelativeDay(step.relativeDay),
    // Playbook steps don't carry a description/prompt field today — leave
    // purpose blank rather than inventing one; the user can add notes.
    purpose: "",
    suggestedDate: dateForRelativeDay(eventDate, step.relativeDay),
    platforms,
    platformFormats: platformFormatsForPlatforms(platforms),
    artworkNotes: "",
    captionNotes: "",
    statusTag: "not-started",
    sortOrder,
  };
}

function hasMeaningfulMilestoneWork(
  milestone: CampaignBuilderMilestone,
  preview: MilestonePreviewContent | undefined,
): boolean {
  return (
    Boolean(milestone.artworkNotes.trim()) ||
    Boolean(milestone.captionNotes.trim()) ||
    Boolean(milestone.creativeOverrides) ||
    Boolean(preview?.artwork.feedUrl) ||
    Boolean(preview?.artwork.storyUrl) ||
    Boolean(preview?.captions.some((caption) => caption.text.trim().length > 0))
  );
}

/**
 * Milestones that would be dropped by switching to `newSteps` AND that carry
 * meaningful user-entered work (notes, overrides, generated artwork, or
 * captions) — used to decide whether to warn before replacing the milestone
 * set on a playbook change.
 */
export function milestonesLostOnPlaybookSwitch(
  newSteps: PlaybookMilestoneStep[],
  existingMilestones: CampaignBuilderMilestone[],
  existingPreviewContents: MilestonePreviewContent[],
): CampaignBuilderMilestone[] {
  const newTitles = new Set(
    newSteps.map((step) => milestoneNameMatchKey(step.title)),
  );
  const previewByMilestoneId = new Map(
    existingPreviewContents.map((preview) => [preview.milestoneId, preview]),
  );

  return existingMilestones.filter((milestone) => {
    if (newTitles.has(milestoneNameMatchKey(milestone.name))) {
      return false;
    }
    return hasMeaningfulMilestoneWork(
      milestone,
      previewByMilestoneId.get(milestone.id),
    );
  });
}

/**
 * Build a fresh milestone + preview-content list from a playbook's steps.
 * Any existing milestone whose name matches a step (case-insensitive,
 * trimmed) keeps its id/notes/overrides/preview-content — so user-entered
 * work is preserved only for milestones that still belong to the selected
 * playbook. Milestones with no matching step are dropped (never mixed in),
 * and steps with no existing match get a brand-new milestone. Never
 * duplicates: exactly one milestone per playbook step.
 */
export function reconcileMilestonesWithPlaybookSteps(
  steps: PlaybookMilestoneStep[],
  eventDate: string,
  existingMilestones: CampaignBuilderMilestone[],
  existingPreviewContents: MilestonePreviewContent[],
): {
  milestones: CampaignBuilderMilestone[];
  previewContents: MilestonePreviewContent[];
} {
  const existingByName = new Map(
    existingMilestones.map((milestone) => [
      milestoneNameMatchKey(milestone.name),
      milestone,
    ]),
  );
  const previewByMilestoneId = new Map(
    existingPreviewContents.map((preview) => [preview.milestoneId, preview]),
  );

  const milestones: CampaignBuilderMilestone[] = [];
  const previewContents: MilestonePreviewContent[] = [];

  const sortedSteps = [...steps].sort((a, b) => a.sortOrder - b.sortOrder);

  sortedSteps.forEach((step, index) => {
    const matched = existingByName.get(milestoneNameMatchKey(step.title));

    if (matched) {
      const milestone: CampaignBuilderMilestone = {
        ...matched,
        name: normalizeMilestoneName(step.title),
        category: categoryForRelativeDay(step.relativeDay),
        suggestedDate: dateForRelativeDay(eventDate, step.relativeDay),
        sortOrder: index,
      };
      milestones.push(milestone);
      const existingPreview = previewByMilestoneId.get(matched.id);
      previewContents.push(
        existingPreview
          ? { ...existingPreview, milestoneId: milestone.id }
          : buildPreviewForMilestone(milestone),
      );
    } else {
      const milestone = buildMilestoneFromPlaybookStep(step, eventDate, index);
      milestones.push(milestone);
      previewContents.push(buildPreviewForMilestone(milestone));
    }
  });

  return { milestones, previewContents };
}
