"use client";

import { Send } from "lucide-react";
import { CampaignWorkflowStepHeader } from "@/components/event-workspace/CampaignWorkflowStepHeader";
import { MetaPublishBundlesPanel } from "@/components/meta-publishing/MetaPublishBundlesPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { publishAllApprovedMetaBundlesAction } from "@/lib/meta-publishing/actions";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

interface CampaignPublishingQueueStepProps {
  eventId: string;
  metaPublishBundles: MetaPublishBundle[];
}

export function CampaignPublishingQueueStep({
  eventId,
  metaPublishBundles,
}: CampaignPublishingQueueStepProps) {
  const approvedCount = metaPublishBundles.filter((bundle) => bundle.status === "approved").length;
  const hasQueue = approvedCount > 0 || metaPublishBundles.some((bundle) => bundle.status === "scheduled");

  return (
    <div className="space-y-6">
      <CampaignWorkflowStepHeader
        question="What is approved and ready to go?"
        description="Approved milestones auto-post to Facebook and Instagram at the scheduled time. Use Publish now to post immediately or retry failures."
        nextStep="published"
        nextLabel="View Published"
      />

      {!hasQueue ? (
        <EmptyState
          icon={Send}
          title="Nothing in the queue yet"
          description="Approved milestones will appear here when they are ready to mark as published."
          action={{ label: "Go to Approval", href: "#approval" }}
        />
      ) : (
        <MetaPublishBundlesPanel
          eventId={eventId}
          bundles={metaPublishBundles}
          mode="publishing"
          onPublishAll={() => publishAllApprovedMetaBundlesAction(eventId)}
        />
      )}
    </div>
  );
}
