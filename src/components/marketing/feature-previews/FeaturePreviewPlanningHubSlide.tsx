"use client";

import { EventPlaybookHubShell } from "@/components/event-playbooks/EventPlaybookHubShell";
import {
  previewPlanningHubArtwork,
  previewPlanningHubData,
  previewPlanningHubEvent,
  previewPlanningHubOwnership,
  previewPlanningOverview,
} from "@/lib/marketing/feature-preview-fixtures";

export function FeaturePreviewPlanningHubSlide({
  carousel = false,
}: {
  carousel?: boolean;
}) {
  return (
    <div
      className={carousel ? "pointer-events-none origin-top scale-[0.97]" : "pointer-events-none"}
    >
      <EventPlaybookHubShell
        event={previewPlanningHubEvent}
        artwork={previewPlanningHubArtwork}
        ownership={previewPlanningHubOwnership}
        hubData={previewPlanningHubData}
        pastEvents={[]}
        pastLessonCount={0}
        aiStatus={{ available: true, reason: null }}
        tablesAvailable
        hasCampaign
        socialMedia={null}
        defaultTab="overview"
        planningOverview={previewPlanningOverview}
      />
    </div>
  );
}
