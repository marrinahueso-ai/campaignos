"use client";

import { CampaignEventsList } from "@/components/events/CampaignEventsList";
import {
  getPreviewCampaignArtworkMap,
  getPreviewCampaignMonthGroups,
  getPreviewCampaignOwnershipMap,
  previewMetaScheduledEventIds,
  PREVIEW_TODAY,
} from "@/lib/marketing/feature-preview-fixtures";
import { useMemo } from "react";

export function FeaturePreviewWorkflowSlide() {
  const monthGroups = useMemo(() => getPreviewCampaignMonthGroups(), []);
  const artworkByEventId = useMemo(() => getPreviewCampaignArtworkMap(), []);
  const ownershipByEventId = useMemo(() => getPreviewCampaignOwnershipMap(), []);

  return (
    <div className="pointer-events-none space-y-6">
      <header className="border-b border-cos-border pb-6">
        <p className="studio-eyebrow">Workspace</p>
        <h2 className="font-display mt-2 text-3xl text-cos-text sm:text-4xl">Campaigns</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cos-muted">
          Full campaigns and reminder-only plans grouped by month — these are the
          events that get social posts and communications.
        </p>
      </header>

      <CampaignEventsList
        monthGroups={monthGroups}
        artworkByEventId={artworkByEventId}
        ownershipByEventId={ownershipByEventId}
        metaScheduledEventIds={previewMetaScheduledEventIds}
        today={PREVIEW_TODAY}
        defaultExpandedAll
      />
    </div>
  );
}
