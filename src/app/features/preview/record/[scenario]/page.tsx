import { notFound } from "next/navigation";
import { FeaturePreviewRecordCapture } from "@/components/marketing/feature-previews/FeaturePreviewRecordCapture";
import {
  FEATURE_RECORD_SCENARIOS,
  type FeatureRecordScenario,
} from "@/lib/marketing/feature-preview-fixtures";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return FEATURE_RECORD_SCENARIOS.map((scenario) => ({ scenario }));
}

export default async function FeaturePreviewRecordPage({
  params,
}: {
  params: Promise<{ scenario: string }>;
}) {
  const { scenario } = await params;

  if (!FEATURE_RECORD_SCENARIOS.includes(scenario as FeatureRecordScenario)) {
    notFound();
  }

  return (
    <div className="bg-cos-bg" data-feature-capture>
      <FeaturePreviewRecordCapture scenario={scenario as FeatureRecordScenario} />
    </div>
  );
}
