import { EventDetailApprovalsEasePanel } from "@/components/events-phase3/EventDetailApprovalsEasePanel";
import { getUnifiedApprovalsSchedulingDataForEvent } from "@/lib/approvals-scheduling/queries";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getEventById } from "@/lib/events/queries";

/**
 * Streams Event Detail Approvals after the shell/hero paint.
 * Re-checks getEventById (request-cached with the page) so access stays gated.
 */
export async function EventDetailApprovalsStream({
  eventId,
}: {
  eventId: string;
}) {
  const event = await getEventById(eventId);
  if (!event) {
    return (
      <div className="rounded-xl border border-cos-border bg-cos-card p-6">
        <h3 className="font-display text-lg text-cos-text">
          Approvals unavailable
        </h3>
        <p className="mt-1 text-sm text-cos-muted">
          This event could not be loaded for approvals.
        </p>
      </div>
    );
  }

  const [campaignRole, membership] = await Promise.all([
    getCurrentCampaignRole(),
    getActiveMembership(),
  ]);

  if (!membership) {
    return (
      <div className="rounded-xl border border-cos-border bg-cos-card p-6">
        <h3 className="font-display text-lg text-cos-text">
          Approvals unavailable
        </h3>
        <p className="mt-1 text-sm text-cos-muted">
          Sign in with an active school membership to load approvals.
        </p>
      </div>
    );
  }

  const approvalsData = await getUnifiedApprovalsSchedulingDataForEvent(
    event.id,
    {
      campaignRole,
      membership,
    },
  );

  return (
    <EventDetailApprovalsEasePanel
      items={approvalsData.items}
      canViewAll={approvalsData.canViewAll}
      lockedEventId={event.id}
    />
  );
}
