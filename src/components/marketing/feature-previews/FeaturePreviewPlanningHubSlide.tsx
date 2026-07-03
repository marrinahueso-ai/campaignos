"use client";

import { EventPlaybookHubShell } from "@/components/event-playbooks/EventPlaybookHubShell";
import {
  previewPlanningHubArtwork,
  previewPlanningHubData,
  previewPlanningHubEvent,
  previewPlanningHubOwnership,
} from "@/lib/marketing/feature-preview-fixtures";

export function FeaturePreviewPlanningHubSlide() {
  return (
    <div className="pointer-events-none">
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
      />
    </div>
  );
}
