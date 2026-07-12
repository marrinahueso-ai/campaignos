import {
  defaultEnabledFormats,
  normalizeMilestoneArtwork,
} from "@/lib/campaign-builder-v2/platform-utils";
import { buildDefaultSession } from "@/lib/campaign-builder-v2/seed-data";
import type { CampaignBuilderSession, PreviewTabId } from "@/lib/campaign-builder-v2/types";

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
      platformFormats:
        milestone.platformFormats ?? defaultEnabledFormats(),
      artworkNotes: milestone.artworkNotes ?? "",
      captionNotes: milestone.captionNotes ?? "",
      statusTag: milestone.statusTag ?? "not-started",
      sortOrder: milestone.sortOrder ?? index,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((milestone, index) => ({ ...milestone, sortOrder: index }));

  const previewContents = (raw.previewContents ?? defaults.previewContents).map(
    (content) => ({
      ...content,
      artwork: normalizeMilestoneArtwork(content.artwork),
      enabledFormats:
        content.enabledFormats ?? defaultEnabledFormats(),
      emailSendDate: content.emailSendDate ?? content.scheduleDate,
      emailSendTime: content.emailSendTime ?? content.scheduleTime,
      manualEmailTo: content.manualEmailTo ?? "marrina@heyralli.com",
      approvalStatuses:
        content.approvalStatuses ?? defaults.previewContents[0]?.approvalStatuses ?? [],
    }),
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
