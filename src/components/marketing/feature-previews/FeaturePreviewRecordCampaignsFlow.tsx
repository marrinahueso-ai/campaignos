"use client";

import { ArrowRight } from "lucide-react";
import { EventArtworkPreview } from "@/components/events/EventArtworkPreview";
import { EventOwnershipStrip } from "@/components/events/EventOwnershipStrip";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import { EventPlaybookHubShell } from "@/components/event-playbooks/EventPlaybookHubShell";
import { Badge } from "@/components/ui/Badge";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import { getEventCardDescription } from "@/lib/events/event-card-display";
import {
  getPreviewCampaignArtworkMap,
  getPreviewCampaignMonthGroups,
  getPreviewCampaignOwnershipMap,
  previewMetaScheduledEventIds,
  previewPlanningHubArtwork,
  previewPlanningHubData,
  previewFilesPageData,
  previewPlanningHubEvent,
  previewPlanningHubOwnership,
  PREVIEW_USER_FIRST_NAME,
} from "@/lib/marketing/feature-preview-fixtures";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import { useMemo, useState } from "react";

export function FeaturePreviewRecordCampaignsFlow() {
  const [step, setStep] = useState<"campaigns" | "hub">("campaigns");

  const monthGroups = useMemo(() => getPreviewCampaignMonthGroups(), []);
  const artworkByEventId = useMemo(() => getPreviewCampaignArtworkMap(), []);
  const ownershipByEventId = useMemo(() => getPreviewCampaignOwnershipMap(), []);

  if (step === "hub") {
    return (
      <div data-record-step="planning-hub">
        <EventPlaybookHubShell
          event={previewPlanningHubEvent}
          artwork={previewPlanningHubArtwork}
          ownership={previewPlanningHubOwnership}
          hubData={previewPlanningHubData}
          filesPageData={previewFilesPageData}
          pastLessonCount={0}
          aiStatus={{ available: true, reason: null }}
          tablesAvailable
          hasCampaign
          socialMedia={null}
          defaultTab="overview"
          greetingName={PREVIEW_USER_FIRST_NAME}
          campaignEvents={[previewPlanningHubEvent]}
          notificationCount={3}
          userEmail="ralli@example.com"
        />
      </div>
    );
  }

  const activeGroups = monthGroups.activeGroups;

  return (
    <div className="space-y-6" data-record-step="campaigns">
      <header className="border-b border-cos-border pb-6">
        <p className="studio-eyebrow">Workspace</p>
        <h2 className="font-display mt-2 text-3xl text-cos-text sm:text-4xl">Campaigns</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cos-muted">
          Full campaigns and reminder-only plans grouped by month.
        </p>
      </header>

      {activeGroups.map((activeGroup) => (
        <section
          key={activeGroup.key}
          className="overflow-hidden border border-cos-border bg-cos-card"
        >
          <div className="border-b border-cos-border px-4 py-4">
            <p className="font-display text-2xl text-cos-text">{activeGroup.label}</p>
          </div>
          <div className="grid gap-6 p-5 md:grid-cols-2 xl:grid-cols-3">
            {activeGroup.events.map((event) => {
              const artwork = artworkByEventId.get(event.id) ?? null;
              const ownership = ownershipByEventId.get(event.id) ?? null;
              const showThumbnail = hasDisplayableArtwork(artwork);
              const cardDescription = getEventCardDescription(event.description);
              const formattedTime = formatEventTime(event.time);
              const metaScheduled = previewMetaScheduledEventIds.has(event.id);
              const isHubTarget = event.id === previewPlanningHubEvent.id;

              return (
                <Card key={event.id} interactive className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        {showThumbnail && (
                          <EventArtworkPreview
                            artwork={artwork}
                            eventTitle={event.title}
                            variant="thumbnail"
                          />
                        )}
                        <CardTitle>{event.title}</CardTitle>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {event.status !== "scheduled" || metaScheduled ? (
                          <EventStatusBadge status={event.status} />
                        ) : null}
                        {metaScheduled ? (
                          <Badge variant="success">Queued</Badge>
                        ) : (
                          <CommunicationStrategyBadge strategy={event.communicationStrategy} />
                        )}
                      </div>
                    </div>
                    {cardDescription && (
                      <CardDescription className="line-clamp-2">
                        {cardDescription}
                      </CardDescription>
                    )}
                    {ownership && (
                      <EventOwnershipStrip ownership={ownership} filledBadgeEmphasis="prominent" />
                    )}
                  </CardHeader>

                  <div className="mt-auto space-y-4">
                    <p className="text-sm text-cos-muted">{formatEventDate(event.date)}</p>
                    {formattedTime && (
                      <p className="text-sm text-cos-muted">{formattedTime}</p>
                    )}

                    <button
                      type="button"
                      data-record-target={
                        isHubTarget ? "open-planning-hub" : undefined
                      }
                      onClick={() => {
                        if (isHubTarget) {
                          setStep("hub");
                        }
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 border border-cos-border bg-cos-bg px-3 py-2 text-sm font-medium text-cos-text transition-colors hover:border-cos-text/30"
                    >
                      Open planning hub
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
