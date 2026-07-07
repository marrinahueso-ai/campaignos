"use client";

import { EventPlaybookHubShell } from "@/components/event-playbooks/EventPlaybookHubShell";
import {
  previewPlanningHubArtwork,
  previewPlanningHubData,
  previewPlanningHubEvent,
  previewPlanningHubOwnership,
  PREVIEW_USER_FIRST_NAME,
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
        pastLessonCount={0}
        aiStatus={{ available: true, reason: null }}
        tablesAvailable
        hasCampaign
        socialMedia={null}
        defaultTab="overview"
        greetingName={PREVIEW_USER_FIRST_NAME}
        campaignEvents={[previewPlanningHubEvent]}
        notificationCount={3}
        userEmail="ralli@example.com"
      />
    </div>
  );
}
