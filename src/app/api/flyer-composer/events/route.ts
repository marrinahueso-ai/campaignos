import { NextResponse } from "next/server";
import { requireFlyerComposerGenerateAccess } from "@/lib/flyer-composer/api-auth";
import { getCampaignPageEvents } from "@/lib/events/campaign-page-queries";

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
  return NextResponse.json({
    success: true,
    error: null,
    events: events.map((event) => {
      const socialImageUrl = event.approvedSquareImageUrl?.trim() || null;
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
