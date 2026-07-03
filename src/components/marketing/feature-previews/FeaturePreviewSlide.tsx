"use client";

import { TodayHero } from "@/components/today/TodayHero";
import { TodayPulseSection } from "@/components/today/TodayPulseSection";
import { TodaySnapshot } from "@/components/today/TodaySnapshot";
import { WhatsNextSection } from "@/components/today/WhatsNextSection";
import {
  PREVIEW_TODAY,
  PREVIEW_USER_FIRST_NAME,
  previewDashboardArtwork,
  previewWeather,
  previewWeekEntries,
  previewWhatsNext,
} from "@/lib/marketing/feature-preview-fixtures";
import { FeaturePreviewHeatmapSlide } from "@/components/marketing/feature-previews/FeaturePreviewHeatmapSlide";
import type { FeaturePreviewSlug } from "@/lib/marketing/feature-preview-fixtures";
import { FeaturePreviewArtworkSlide } from "@/components/marketing/feature-previews/FeaturePreviewArtworkSlide";
import { FeaturePreviewCalendarSlide } from "@/components/marketing/feature-previews/FeaturePreviewCalendarSlide";
import { FeaturePreviewChrome } from "@/components/marketing/feature-previews/FeaturePreviewChrome";
import { FeaturePreviewWorkflowSlide } from "@/components/marketing/feature-previews/FeaturePreviewWorkflowSlide";
import { FeaturePreviewApprovalsSlide } from "@/components/marketing/feature-previews/FeaturePreviewApprovalsSlide";
import { FeaturePreviewPublishSlide } from "@/components/marketing/feature-previews/FeaturePreviewPublishSlide";
import { FeaturePreviewPlanningHubSlide } from "@/components/marketing/feature-previews/FeaturePreviewPlanningHubSlide";

interface FeaturePreviewSlideProps {
  slug: FeaturePreviewSlug;
  chrome?: boolean;
  /** Tighter framing for the marketing features carousel. */
  carousel?: boolean;
}

export function FeaturePreviewSlide({
  slug,
  chrome = true,
  carousel = false,
}: FeaturePreviewSlideProps) {
  const content = <FeaturePreviewSlideContent slug={slug} carousel={carousel} />;

  if (!chrome) {
    return content;
  }

  return (
    <FeaturePreviewChrome active={slug} compact={carousel} carousel={carousel}>
      {content}
    </FeaturePreviewChrome>
  );
}

function FeaturePreviewSlideContent({
  slug,
  carousel = false,
}: {
  slug: FeaturePreviewSlug;
  carousel?: boolean;
}) {
  switch (slug) {
    case "dashboard":
      return (
        <div className="grid gap-4 lg:grid-cols-[1fr_220px] lg:gap-5">
          <div className="space-y-4">
            <TodayHero firstName={PREVIEW_USER_FIRST_NAME} attentionCount={3} />
            <WhatsNextSection
              whatsNext={previewWhatsNext}
              artwork={previewDashboardArtwork}
            />
            <TodayPulseSection
              pendingApprovals={[]}
              totalPendingCount={1}
              recentPublished={[
                {
                  id: "p1",
                  kind: "published",
                  message: "Facebook post published",
                  timestampLabel: "Yesterday",
                  occurredOn: "2026-06-30",
                  href: null,
                },
              ]}
            />
          </div>
          <TodaySnapshot
            today={PREVIEW_TODAY}
            weather={previewWeather}
            weekEntries={previewWeekEntries}
            waitingOnOthers={[]}
          />
        </div>
      );
    case "planning-hub":
      return <FeaturePreviewPlanningHubSlide />;
    case "workflow":
      return <FeaturePreviewWorkflowSlide />;
    case "calendar":
      return <FeaturePreviewCalendarSlide />;
    case "heatmap":
      return <FeaturePreviewHeatmapSlide compact={carousel} />;
    case "artwork":
      return <FeaturePreviewArtworkSlide />;
    case "approvals":
      return <FeaturePreviewApprovalsSlide />;
    case "publish":
      return <FeaturePreviewPublishSlide />;
    default:
      return null;
  }
}
