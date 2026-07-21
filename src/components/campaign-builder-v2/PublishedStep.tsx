"use client";

import { CheckCircle2 } from "lucide-react";
import { useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { CampaignBuilderFooter } from "@/components/campaign-builder-v2/CampaignBuilderFooter";
import { Button } from "@/components/ui/Button";

export function PublishedStep() {
  const { session, goToStep, setReviewFilter } = useCampaignBuilder();

  function returnToReview() {
    setReviewFilter("needs-review");
    goToStep("review");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-8">
        <div className="studio-page">
          <div className="cos-card mx-auto max-w-2xl text-center">
            <CheckCircle2
              className="mx-auto h-14 w-14 text-cos-success"
              strokeWidth={1.25}
            />
            <h1 className="mt-6 font-display text-4xl text-cos-text">
              Sent for approval
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-cos-muted">
              <span className="font-medium text-cos-text">
                {session.inspiration.campaignName}
              </span>{" "}
              is in the approval queue. Track milestones under Review (Needs
              review), or open Approvals &amp; Schedule for the queue.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button onClick={returnToReview}>View milestones in Review</Button>
              <Button variant="secondary" href="/approvals">
                View approvals & schedule
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CampaignBuilderFooter
        showContinue={false}
        onBack={returnToReview}
        backLabel="Back to review"
      />
    </div>
  );
}
