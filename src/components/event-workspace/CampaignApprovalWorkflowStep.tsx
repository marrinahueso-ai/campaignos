"use client";

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { CampaignWorkflowStepHeader } from "@/components/event-workspace/CampaignWorkflowStepHeader";
import { MetaPublishBundlesPanel } from "@/components/meta-publishing/MetaPublishBundlesPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { approveAllScheduledMetaBundlesAction } from "@/lib/meta-publishing/actions";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";

interface CampaignApprovalWorkflowStepProps {
  eventId: string;
  metaPublishBundles: MetaPublishBundle[];
}

export function CampaignApprovalWorkflowStep({
  eventId,
  metaPublishBundles,
}: CampaignApprovalWorkflowStepProps) {
  const scheduledCount = metaPublishBundles.filter((bundle) => bundle.status === "scheduled").length;
  const approvedCount = metaPublishBundles.filter((bundle) => bundle.status === "approved").length;
  const hasPending = scheduledCount > 0;

  return (
    <div className="space-y-6">
      <CampaignWorkflowStepHeader
        question="Who needs to approve this?"
        description="Approve scheduled Meta bundles in one click. Nothing publishes until you mark it published in the next step."
        nextStep="publish"
        nextLabel="Continue to Publishing"
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {hasPending
              ? `${scheduledCount} milestone bundle${scheduledCount === 1 ? "" : "s"} waiting`
              : approvedCount > 0
                ? "All scheduled bundles approved"
                : "Nothing waiting on approval"}
          </CardTitle>
          <CardDescription>
            Each bundle includes feed + story artwork for Facebook and Instagram at one timing
            milestone.
          </CardDescription>
        </CardHeader>
      </Card>

      {metaPublishBundles.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No Meta bundles yet"
          description="Schedule milestones first, then approve them here."
          action={{ label: "Go to Schedule", href: "#schedule" }}
        />
      ) : (
        <MetaPublishBundlesPanel
          eventId={eventId}
          bundles={metaPublishBundles}
          mode="approval"
          onApproveAll={() => approveAllScheduledMetaBundlesAction(eventId)}
        />
      )}

      {approvedCount > 0 && (
        <p className="text-sm text-cos-muted">
          {approvedCount} approved — continue to{" "}
          <Link href="#publishing" className="font-medium text-cos-primary hover:underline">
            Publishing
          </Link>
          .
        </p>
      )}
    </div>
  );
}
