"use client";

import dynamic from "next/dynamic";
import type { FeatureRecordScenario } from "@/lib/marketing/feature-preview-fixtures";
import { FeaturePreviewChrome } from "@/components/marketing/feature-previews/FeaturePreviewChrome";
import { FeaturePreviewRecordCampaignsFlow } from "@/components/marketing/feature-previews/FeaturePreviewRecordCampaignsFlow";

const FeaturePreviewCalendarSlide = dynamic(
  () =>
    import("@/components/marketing/feature-previews/FeaturePreviewCalendarSlide").then(
      (module) => module.FeaturePreviewCalendarSlide,
    ),
  { ssr: false },
);

const FeaturePreviewHeatmapSlide = dynamic(
  () =>
    import("@/components/marketing/feature-previews/FeaturePreviewHeatmapSlide").then(
      (module) => module.FeaturePreviewHeatmapSlide,
    ),
  { ssr: false },
);

interface FeaturePreviewRecordCaptureProps {
  scenario: FeatureRecordScenario;
}

export function FeaturePreviewRecordCapture({
  scenario,
}: FeaturePreviewRecordCaptureProps) {
  const chromeActive =
    scenario === "campaigns-flow"
      ? ("workflow" as const)
      : scenario === "calendar-month"
        ? ("calendar" as const)
        : ("heatmap" as const);

  const content = (() => {
    switch (scenario) {
      case "campaigns-flow":
        return <FeaturePreviewRecordCampaignsFlow />;
      case "calendar-month":
        return <FeaturePreviewCalendarSlide interactive />;
      case "calendar-heatmap":
        return (
          <FeaturePreviewHeatmapSlide
            interactive
            initialHeatmapEnabled={false}
            compact
          />
        );
      default:
        return null;
    }
  })();

  return (
    <FeaturePreviewChrome active={chromeActive}>
      {content}
    </FeaturePreviewChrome>
  );
}
