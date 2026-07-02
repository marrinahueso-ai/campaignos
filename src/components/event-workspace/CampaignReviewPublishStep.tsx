"use client";

import { MetaPublishReviewPanel } from "@/components/meta-publishing/MetaPublishReviewPanel";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

interface CampaignReviewPublishStepProps {
  eventId: string;
  metaPublishBundles: MetaPublishBundle[];
}

export function CampaignReviewPublishStep({
  eventId,
  metaPublishBundles,
}: CampaignReviewPublishStepProps) {
  return (
    <MetaPublishReviewPanel eventId={eventId} bundles={metaPublishBundles} />
  );
}
