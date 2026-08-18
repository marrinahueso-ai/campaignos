import { NextResponse } from "next/server";
import { getCampaignSocialFeedUrlMap } from "@/lib/campaign-builder-v2/social-feed-artwork";
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";
import { requireFlyerComposerGenerateAccess } from "@/lib/flyer-composer/api-auth";
import { resolveFlyerEventInspirationUrl } from "@/lib/flyers/event-inspiration";

export const dynamic = "force-dynamic";

/** Org-scoped campaigns for Flyer Start binding + Send for approval. */
export async function GET() {
  const access = await requireFlyerComposerGenerateAccess();
  if (!access.ok) {
    return NextResponse.json(
      { success: false, error: access.error, events: [] },
      { status: access.status },
    );
  }

  const events = await getCampaignPageEvents(access.organizationId);
  const socialFeedByEvent = await getCampaignSocialFeedUrlMap(
    events.map((event) => event.id),
  );
  return NextResponse.json({
    success: true,
    error: null,
    events: events.map((event) => {
      const socialImageUrl = resolveFlyerEventInspirationUrl({
        socialFeedUrl: socialFeedByEvent.get(event.id) ?? null,
        approvedSquareUrl: event.approvedSquareImageUrl,
      });
      return {
        id: event.id,
        title: event.title,
        date: event.date ?? null,
        socialImageUrl,
        hasSocialImagery: Boolean(socialImageUrl),
      };
    }),
  });
}
