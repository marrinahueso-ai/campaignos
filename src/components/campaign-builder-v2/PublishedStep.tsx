"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";
import { useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { CampaignBuilderFooter } from "@/components/campaign-builder-v2/CampaignBuilderFooter";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function PublishedStep() {
  const { session, goToStep } = useCampaignBuilder();

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
              Campaign published
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-cos-muted">
              <span className="font-medium text-cos-text">
                {session.inspiration.campaignName}
              </span>{" "}
              milestones are scheduled and ready to go live. Monitor delivery in
              Publishing or open Creative Studio (Classic) for legacy workflows.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/publishing">View publishing schedule</Button>
              <Button
                variant="secondary"
                href={`/events/${session.eventId}#published`}
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                Open Creative Studio (Classic)
              </Button>
            </div>

            <p className="mt-8 text-xs text-cos-muted">
              This is a V2 stub — full publish integration will sync with{" "}
              <code className="text-cos-text">meta_publication_slots</code> and
              approval workflows.
            </p>
          </div>
        </div>
      </div>

      <CampaignBuilderFooter
        showContinue={false}
        onBack={() => goToStep("review")}
        backLabel="Back to review"
        leftActions={
          <Link
            href={`/events/${session.eventId}#plan`}
            className="text-sm text-cos-muted transition-colors hover:text-cos-text"
          >
            Return to Creative Studio (Classic)
          </Link>
        }
      />
    </div>
  );
}
