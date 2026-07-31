import { NextResponse } from "next/server";
import { requireFlyerComposerGenerateAccess } from "@/lib/flyer-composer/api-auth";
import { getFlyerComposerApprovalStatus } from "@/lib/flyer-composer/send-for-approval";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireFlyerComposerGenerateAccess();
  if (!access.ok) {
    return NextResponse.json(
      { success: false, error: access.error, status: null },
      { status: access.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId")?.trim() || "";
  const submissionKey = searchParams.get("submissionKey")?.trim() || "";

  if (!eventId || !submissionKey) {
    return NextResponse.json(
      {
        success: false,
        error: "eventId and submissionKey are required.",
        status: null,
      },
      { status: 400 },
    );
  }

  const status = await getFlyerComposerApprovalStatus({
    eventId,
    submissionKey,
  });

  return NextResponse.json({
    success: true,
    error: null,
    status,
  });
}
