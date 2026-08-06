import { NextResponse } from "next/server";
import { requireFlyerComposerGenerateAccess } from "@/lib/flyer-composer/api-auth";
import { listSavedFlyersForEvent } from "@/lib/flyer-composer/saved-flyers";

export const dynamic = "force-dynamic";

/** Event-scoped saved flyers (Files · category flyer) for composer load/select. */
export async function GET(request: Request) {
  const access = await requireFlyerComposerGenerateAccess();
  if (!access.ok) {
    return NextResponse.json(
      {
        success: false,
        error: access.error,
        eventId: null,
        eventTitle: null,
        flyers: [],
      },
      { status: access.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const eventId = (searchParams.get("eventId") || "").trim();
  if (!eventId) {
    return NextResponse.json(
      {
        success: false,
        error: "eventId is required.",
        eventId: null,
        eventTitle: null,
        flyers: [],
      },
      { status: 400 },
    );
  }

  const result = await listSavedFlyersForEvent(eventId);
  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        eventId: null,
        eventTitle: null,
        flyers: [],
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    error: null,
    eventId: result.eventId,
    eventTitle: result.eventTitle,
    flyers: result.flyers,
  });
}
