"use client";

import { EventPlaybookHubShell } from "@/components/event-playbooks/EventPlaybookHubShell";
import {
  previewDashboardArtwork,
  previewEvent,
  previewHubData,
  previewOwnership,
} from "@/lib/marketing/feature-preview-fixtures";

export function FeaturePreviewPlanningHubSlide() {
  return (
    <div className="pointer-events-none origin-top scale-[0.97]">
      <EventPlaybookHubShell
        event={previewEvent}
        artwork={previewDashboardArtwork}
        ownership={previewOwnership}
        hubData={previewHubData}
        pastEvents={[]}
        pastLessonCount={0}
        aiStatus={{ available: true, reason: null }}
        tablesAvailable
        hasCampaign
        socialMedia={null}
      />
    </div>
  );
}
