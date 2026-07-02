"use client";

import dynamic from "next/dynamic";
import type { FeaturePreviewSlug } from "@/lib/marketing/feature-preview-fixtures";

const FeaturePreviewSlide = dynamic(
  () =>
    import("@/components/marketing/feature-previews/FeaturePreviewSlide").then(
      (module) => module.FeaturePreviewSlide,
    ),
  { ssr: false },
);

interface FeaturePreviewCaptureProps {
  slug: FeaturePreviewSlug;
}

export function FeaturePreviewCapture({ slug }: FeaturePreviewCaptureProps) {
  return <FeaturePreviewSlide slug={slug} />;
}
