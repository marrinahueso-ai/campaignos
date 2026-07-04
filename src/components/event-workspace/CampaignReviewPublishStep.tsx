"use client";

import { CalendarClock, Send, User } from "lucide-react";
import { MetaPublishBundlesPanel } from "@/components/meta-publishing/MetaPublishBundlesPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  approveAllScheduledMetaBundlesAction,
  publishAllActionableMetaBundlesNowAction,
  scheduleAllReadyMetaBundlesAction,
} from "@/lib/meta-publishing/actions";
import {
  allReviewPublishMetaBundlesHandled,
  isReviewPublishVisibleBundle,
} from "@/lib/meta-publishing/bundle-display";
import { resolveEventShareLink } from "@/lib/meta-publishing/post-kit";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { Event } from "@/types";

interface CampaignReviewPublishStepProps {
  eventId: string;
  event: Event;
  metaPublishBundles: MetaPublishBundle[];
  approvalRoleLabel?: string | null;
  initialExpandedDay?: number | null;
}

export function CampaignReviewPublishStep({
  eventId,
  event,
  metaPublishBundles,
  approvalRoleLabel = null,
  initialExpandedDay = null,
}: CampaignReviewPublishStepProps) {
  const eventLink = resolveEventShareLink(event);
  const visibleBundles = metaPublishBundles.filter(isReviewPublishVisibleBundle);
  const activeMetaBundles = metaPublishBundles.filter(
    (bundle) => bundle.isMetaPost && bundle.status !== "skipped",
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="studio-eyebrow">Review &amp; publish</p>
        <h2 className="font-display mt-2 text-3xl text-cos-text sm:text-4xl">
          Review &amp; publish
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
          Confirm each milestone&apos;s go-live date, then schedule or publish to Facebook and
          Instagram.
        </p>
        {approvalRoleLabel && (
          <p className="mt-3 inline-flex items-start gap-2 text-sm text-cos-text">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-cos-muted" />
            <span>
              <span className="font-medium text-cos-muted">Approver · </span>
              {approvalRoleLabel}
            </span>
          </p>
        )}
      </header>

      {activeMetaBundles.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Nothing ready to publish"
          description="Approve artwork and captions in Captions first."
          action={{ label: "Go to Captions", href: "#schedule" }}
        />
      ) : visibleBundles.length === 0 &&
        allReviewPublishMetaBundlesHandled(metaPublishBundles) ? (
        <EmptyState
          icon={CalendarClock}
          title="All milestones handled"
          description="Published posts appear in the Published step. Need to adjust captions? Go back to Captions."
          action={{ label: "Go to Captions", href: "#schedule" }}
        />
      ) : visibleBundles.length > 0 ? (
        <MetaPublishBundlesPanel
          eventId={eventId}
          bundles={metaPublishBundles}
          mode="publishing"
          approvalRoleLabel={approvalRoleLabel}
          initialExpandedDay={initialExpandedDay}
          eventLink={eventLink}
          showPostKit
          onScheduleAll={() => scheduleAllReadyMetaBundlesAction(eventId)}
          onApproveAll={() => approveAllScheduledMetaBundlesAction(eventId)}
          onPublishAll={() => publishAllActionableMetaBundlesNowAction(eventId)}
        />
      ) : (
        <EmptyState
          icon={Send}
          title="Nothing ready to publish"
          description="Approve artwork and captions in Captions first."
          action={{ label: "Go to Captions", href: "#schedule" }}
        />
      )}
    </div>
  );
}
