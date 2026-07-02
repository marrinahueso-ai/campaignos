import { notFound } from "next/navigation";
import { FeaturePreviewCapture } from "@/components/marketing/feature-previews/FeaturePreviewCapture";
import {
  FEATURE_PREVIEW_SLUGS,
  type FeaturePreviewSlug,
} from "@/lib/marketing/feature-preview-fixtures";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return FEATURE_PREVIEW_SLUGS.map((slug) => ({ slug }));
}

export default async function FeaturePreviewCapturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!FEATURE_PREVIEW_SLUGS.includes(slug as FeaturePreviewSlug)) {
    notFound();
  }

  return (
    <div className="bg-cos-bg" data-feature-capture>
      <FeaturePreviewCapture slug={slug as FeaturePreviewSlug} />
    </div>
  );
}
