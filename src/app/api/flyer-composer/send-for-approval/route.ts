import { NextResponse } from "next/server";
import { requireFlyerComposerSubmitApprovalAccess } from "@/lib/flyer-composer/api-auth";
import { sendFlyerComposerForApproval } from "@/lib/flyer-composer/send-for-approval";

export const dynamic = "force-dynamic";

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const access = await requireFlyerComposerSubmitApprovalAccess();
  if (!access.ok) {
    return NextResponse.json(
      {
        success: false,
        error: access.error,
        schedulingItemId: null,
        workflowStatus: null,
        campaignMilestoneId: null,
        feedArtworkUrl: null,
      },
      { status: access.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body.",
        schedulingItemId: null,
        workflowStatus: null,
        campaignMilestoneId: null,
        feedArtworkUrl: null,
      },
      { status: 400 },
    );
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  if (!raw) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body.",
        schedulingItemId: null,
        workflowStatus: null,
        campaignMilestoneId: null,
        feedArtworkUrl: null,
      },
      { status: 400 },
    );
  }

  const eventId = readString(raw.eventId).trim();
  const submissionKey = readString(raw.submissionKey).trim();
  const imageUrl = readString(raw.imageUrl).trim();

  if (!eventId || !submissionKey || !imageUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "eventId, submissionKey, and imageUrl are required.",
        schedulingItemId: null,
        workflowStatus: null,
        campaignMilestoneId: null,
        feedArtworkUrl: null,
      },
      { status: 400 },
    );
  }

  const result = await sendFlyerComposerForApproval({
    eventId,
    submissionKey,
    imageUrl,
    versionId: readString(raw.versionId).trim() || null,
    headline: readString(raw.headline).trim() || null,
    orgName: readString(raw.orgName).trim() || null,
    templateName: readString(raw.templateName).trim() || null,
    captionText: readString(raw.captionText).trim() || null,
  });

  return NextResponse.json(
    {
      success: result.success,
      error: result.success ? null : result.message,
      message: result.message,
      schedulingItemId: result.schedulingItemId,
      workflowStatus: result.workflowStatus,
      campaignMilestoneId: result.campaignMilestoneId,
      feedArtworkUrl: result.feedArtworkUrl,
    },
    { status: result.success ? 200 : 400 },
  );
}
