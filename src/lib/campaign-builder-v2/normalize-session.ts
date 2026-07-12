import {
  defaultEnabledFormats,
  normalizeMilestoneArtwork,
} from "./platform-utils.ts";
import {
  generationStatusAfterContent,
  inferGenerationStatus,
  isStaleGeneration,
  milestoneHasArtwork,
} from "./milestone-status.ts";
import { buildDefaultSession } from "./seed-data.ts";
import type {
  CampaignBuilderMilestone,
  CampaignBuilderSession,
  MilestoneGenerationStatus,
  MilestonePreviewContent,
  PreviewTabId,
} from "./types.ts";

const STALE_MILESTONE_NAME_FIXES: Record<string, string> = {
  "Two-Week Reminder": "Two-Week Push",
  "Two Week Reminder": "Two-Week Push",
  "two-week reminder": "Two-Week Push",
};

function normalizeMilestoneName(name: string): string {
  const trimmed = name.trim();
  if (STALE_MILESTONE_NAME_FIXES[trimmed]) {
    return STALE_MILESTONE_NAME_FIXES[trimmed];
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("two") && lower.includes("week") && lower.includes("reminder")) {
    return "Two-Week Push";
  }

  return trimmed;
}

function buildEmptyPreviewContent(
  milestone: CampaignBuilderMilestone,
): MilestonePreviewContent {
  return {
    milestoneId: milestone.id,
    status: "draft",
    generationStatus: "ready_to_generate",
    generationStartedAt: null,
    artwork: normalizeMilestoneArtwork(null),
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
    manualEmailTo: "marrina@heyralli.com",
    approvalStatuses: [],
  };
}

function previewContentRichness(content: MilestonePreviewContent): number {
  let score = 0;
  if (milestoneHasArtwork(content)) {
    score += 10;
  }
  if (content.captions.some((caption) => caption.text.trim())) {
    score += 1;
  }
  if (content.generationStatus === "generated") {
    score += 2;
  }
  if (content.generationStatus === "needs_review") {
    score += 1;
  }
  return score;
}

/**
 * Prefer preview rows that carry generated artwork when server and local diverge.
 */
export function mergeCampaignBuilderSessions(
  primary: Partial<CampaignBuilderSession>,
  secondary: Partial<CampaignBuilderSession>,
): Partial<CampaignBuilderSession> {
  const primaryPreviews = primary.previewContents ?? [];
  const secondaryPreviews = secondary.previewContents ?? [];
  const secondaryById = new Map(
    secondaryPreviews.map((content) => [content.milestoneId, content]),
  );
  const mergedIds = new Set<string>();

  const previewContents = primaryPreviews.map((primaryPreview) => {
    mergedIds.add(primaryPreview.milestoneId);
    const secondaryPreview = secondaryById.get(primaryPreview.milestoneId);
    if (!secondaryPreview) {
      return primaryPreview;
    }

    return previewContentRichness(secondaryPreview) >
      previewContentRichness(primaryPreview)
      ? secondaryPreview
      : primaryPreview;
  });

  const milestoneIds = new Set(
    (primary.milestones ?? []).map((milestone) => milestone.id),
  );

  for (const secondaryPreview of secondaryPreviews) {
    if (
      mergedIds.has(secondaryPreview.milestoneId) ||
      !milestoneIds.has(secondaryPreview.milestoneId)
    ) {
      continue;
    }
    previewContents.push(secondaryPreview);
    mergedIds.add(secondaryPreview.milestoneId);
  }

  return {
    ...primary,
    ...secondary,
    milestones: primary.milestones ?? secondary.milestones,
    previewContents,
    selectedMilestoneId:
      primary.selectedMilestoneId ?? secondary.selectedMilestoneId ?? null,
    currentStep: primary.currentStep ?? secondary.currentStep,
    previewTab: primary.previewTab ?? secondary.previewTab,
  };
}

export function reconcilePreviewContent(
  content: MilestonePreviewContent,
  milestone?: CampaignBuilderMilestone,
  defaultApprovalStatuses: MilestonePreviewContent["approvalStatuses"] = [],
): MilestonePreviewContent {
  const enabledFormats =
    content.enabledFormats && content.enabledFormats.length > 0
      ? content.enabledFormats
      : milestone?.platformFormats && milestone.platformFormats.length > 0
        ? milestone.platformFormats
        : defaultEnabledFormats();

  const normalized: MilestonePreviewContent = {
    ...content,
    artwork: normalizeMilestoneArtwork(content.artwork),
    enabledFormats,
    captions: content.captions ?? [
      { platform: "facebook", text: "" },
      { platform: "instagram", text: "" },
    ],
    emailSendDate: content.emailSendDate ?? content.scheduleDate,
    emailSendTime: content.emailSendTime ?? content.scheduleTime,
    manualEmailTo: content.manualEmailTo ?? "marrina@heyralli.com",
    approvalStatuses: content.approvalStatuses ?? defaultApprovalStatuses,
    generationStartedAt: content.generationStartedAt ?? null,
  };

  let generationStatus: MilestoneGenerationStatus =
    content.generationStatus ??
    generationStatusAfterContent(normalized, enabledFormats);

  if (
    generationStatus === "generating" &&
    isStaleGeneration(normalized.generationStartedAt)
  ) {
    generationStatus = generationStatusAfterContent(normalized, enabledFormats);
    if (generationStatus === "ready_to_generate") {
      generationStatus = "failed";
    }
  }

  return {
    ...normalized,
    generationStatus: inferGenerationStatus(
      { ...normalized, generationStatus },
      enabledFormats,
    ),
  };
}

function alignPreviewContentsWithMilestones(
  milestones: CampaignBuilderMilestone[],
  rawPreviews: MilestonePreviewContent[],
  rawMilestones: CampaignBuilderMilestone[],
  defaults: CampaignBuilderSession,
): MilestonePreviewContent[] {
  const rawMilestoneById = new Map(rawMilestones.map((milestone) => [milestone.id, milestone]));
  const defaultMilestoneById = new Map(
    defaults.milestones.map((milestone) => [milestone.id, milestone]),
  );
  const defaultApprovalStatuses =
    defaults.previewContents[0]?.approvalStatuses ?? [];

  const normalizedPreviews = rawPreviews.map((content) =>
    reconcilePreviewContent(
      content,
      rawMilestoneById.get(content.milestoneId),
      defaultApprovalStatuses,
    ),
  );

  const previewByMilestoneId = new Map<string, MilestonePreviewContent>();
  const orphans: MilestonePreviewContent[] = [];

  for (const preview of normalizedPreviews) {
    if (milestones.some((milestone) => milestone.id === preview.milestoneId)) {
      previewByMilestoneId.set(preview.milestoneId, preview);
      continue;
    }
    orphans.push(preview);
  }

  for (const orphan of orphans) {
    const rawMilestone =
      rawMilestoneById.get(orphan.milestoneId) ??
      defaultMilestoneById.get(orphan.milestoneId);
    const orphanName = rawMilestone
      ? normalizeMilestoneName(rawMilestone.name)
      : null;
    if (!orphanName) {
      continue;
    }

    const targetMilestone = milestones.find(
      (milestone) =>
        milestone.name === orphanName && !previewByMilestoneId.has(milestone.id),
    );
    if (!targetMilestone) {
      continue;
    }

    previewByMilestoneId.set(targetMilestone.id, {
      ...orphan,
      milestoneId: targetMilestone.id,
    });
  }

  return milestones.map((milestone) => {
    const existing = previewByMilestoneId.get(milestone.id);
    if (existing) {
      return reconcilePreviewContent(existing, milestone, defaultApprovalStatuses);
    }

    const defaultPreview = defaults.previewContents.find(
      (content) => content.milestoneId === milestone.id,
    );
    if (defaultPreview) {
      return reconcilePreviewContent(
        defaultPreview,
        milestone,
        defaultApprovalStatuses,
      );
    }

    return reconcilePreviewContent(
      buildEmptyPreviewContent(milestone),
      milestone,
      defaultApprovalStatuses,
    );
  });
}

export function hydrateCampaignBuilderSession(
  base: Partial<CampaignBuilderSession>,
  local: Partial<CampaignBuilderSession> | null,
  eventId: string,
  eventTitle: string,
  eventDate: string,
): CampaignBuilderSession {
  const merged = local ? mergeCampaignBuilderSessions(base, local) : base;
  return normalizeCampaignBuilderSession(merged, eventId, eventTitle, eventDate);
}

function normalizePreviewTab(tab: PreviewTabId | string | undefined): PreviewTabId {
  if (tab === "fb-feed" || tab === "ig-feed") {
    return "feed";
  }
  if (tab === "fb-story" || tab === "ig-story") {
    return "story";
  }
  if (
    tab === "all" ||
    tab === "feed" ||
    tab === "story" ||
    tab === "captions" ||
    tab === "schedule"
  ) {
    return tab;
  }
  return "all";
}

/**
 * Backward-compatible hydration for sessions saved before V2 field expansions.
 */
export function normalizeCampaignBuilderSession(
  raw: Partial<CampaignBuilderSession>,
  eventId: string,
  eventTitle: string,
  eventDate: string,
): CampaignBuilderSession {
  const defaults = buildDefaultSession(eventId, eventTitle, eventDate);

  const inspiration = {
    ...defaults.inspiration,
    ...raw.inspiration,
    campaignId: raw.inspiration?.campaignId ?? eventId,
    selectedLogoId: raw.inspiration?.selectedLogoId ?? defaults.inspiration.selectedLogoId,
    includeLogoInArtwork:
      raw.inspiration?.includeLogoInArtwork ??
      defaults.inspiration.includeLogoInArtwork,
    useSchoolColors:
      raw.inspiration?.useSchoolColors ?? defaults.inspiration.useSchoolColors,
    primarySchoolColor:
      raw.inspiration?.primarySchoolColor ?? defaults.inspiration.primarySchoolColor,
    secondarySchoolColor:
      raw.inspiration?.secondarySchoolColor ?? defaults.inspiration.secondarySchoolColor,
  };

  const milestones = [...(raw.milestones ?? defaults.milestones)]
    .map((milestone, index) => ({
      ...milestone,
      name: normalizeMilestoneName(milestone.name),
      platformFormats:
        milestone.platformFormats ?? defaultEnabledFormats(),
      artworkNotes: milestone.artworkNotes ?? "",
      captionNotes: milestone.captionNotes ?? "",
      statusTag: milestone.statusTag ?? "not-started",
      sortOrder: milestone.sortOrder ?? index,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((milestone, index) => ({ ...milestone, sortOrder: index }));

  const rawMilestones = raw.milestones ?? defaults.milestones;
  const previewContents = alignPreviewContentsWithMilestones(
    milestones,
    raw.previewContents ?? defaults.previewContents,
    rawMilestones,
    defaults,
  );

  return {
    ...defaults,
    ...raw,
    eventId,
    inspiration,
    milestones,
    previewContents,
    expandedReviewMilestoneIds: raw.expandedReviewMilestoneIds ?? [],
    previewTab: normalizePreviewTab(raw.previewTab),
    currentStep: raw.currentStep ?? defaults.currentStep,
  };
}
