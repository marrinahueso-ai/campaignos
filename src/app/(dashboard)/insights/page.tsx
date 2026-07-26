import { Suspense } from "react";
import { InsightsEaseShell } from "@/components/insights/InsightsEaseShell";
import { assertOrgFeature } from "@/lib/billing/gates";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { pickDefaultCreateWithAiEvent } from "@/lib/campaign-builder-v2/default-event";
import { getActiveEvents } from "@/lib/events/queries";
import { getEventInsightsPageData } from "@/lib/insights/event-queries";
import { getInsightsPageData } from "@/lib/insights/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Insights & Analytics",
};

interface InsightsPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    range?: string;
    platform?: string;
    view?: string;
    event?: string;
  }>;
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const params = await searchParams;

  const organization = await getCurrentOrganization();
  if (organization) {
    const featureGate = await assertOrgFeature(organization.id, "social_analytics");
    if (!featureGate.ok) {
      return (
        <div className="studio-page pb-12">
          <div className="cos-card px-6 py-12 text-center">
            <h1 className="font-display text-3xl text-cos-text">Insights &amp; Analytics</h1>
            <p className="mt-3 text-sm text-cos-muted">
              {featureGate.message} {featureGate.upgradeHint}
            </p>
          </div>
        </div>
      );
    }
  }

  const [data, activeEvents] = await Promise.all([
    getInsightsPageData({
      from: params.from,
      to: params.to,
      range: params.range,
    }),
    getActiveEvents(organization?.id),
  ]);

  if (!data) {
    return (
      <div className="studio-page pb-12">
        <div className="cos-card px-6 py-12 text-center">
          <h1 className="font-display text-3xl text-cos-text">Insights &amp; Analytics</h1>
          <p className="mt-3 text-sm text-cos-muted">
            Set up your organization to start tracking social performance.
          </p>
        </div>
      </div>
    );
  }

  const eventOptions = activeEvents.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date ?? null,
  }));

  const requestedEventId = params.event?.trim() || null;
  const requestedEvent = requestedEventId
    ? eventOptions.find((event) => event.id === requestedEventId) ?? null
    : null;
  const defaultEvent =
    requestedEvent ??
    pickDefaultCreateWithAiEvent(eventOptions) ??
    null;
  const initialEventId = defaultEvent?.id ?? null;
  const eventInsights = initialEventId
    ? await getEventInsightsPageData(initialEventId)
    : null;

  return (
    <div className="studio-page pb-12">
      <Suspense fallback={<div className="min-h-[16rem] animate-pulse bg-cos-bg/60" />}>
        <InsightsEaseShell
          data={data}
          events={eventOptions}
          eventInsights={eventInsights}
          initialEventId={initialEventId}
        />
      </Suspense>
    </div>
  );
}
