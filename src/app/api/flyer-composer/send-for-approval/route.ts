import { NextResponse } from "next/server";
import { requireFlyerComposerSubmitApprovalAccess } from "@/lib/flyer-composer/api-auth";
import {
  flyerSendForApprovalBodySchema,
  parseJsonBody,
} from "@/lib/flyer-composer/request-schemas";
import { sendFlyerComposerForApproval } from "@/lib/flyer-composer/send-for-approval";
import { isSameOriginRequest } from "@/lib/security/verify-same-origin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "Forbidden.",
        schedulingItemId: null,
        workflowStatus: null,
        campaignMilestoneId: null,
        feedArtworkUrl: null,
      },
      { status: 403 },
    );
  }

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

  const parsed = parseJsonBody(flyerSendForApprovalBodySchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error,
        schedulingItemId: null,
        workflowStatus: null,
        campaignMilestoneId: null,
        feedArtworkUrl: null,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const flyerId = data.flyerId?.trim() || null;
  const result = await sendFlyerComposerForApproval({
    eventId: data.eventId?.trim() || null,
    flyerId,
    submissionKey: data.submissionKey?.trim() || flyerId || "",
    imageUrl: data.imageUrl,
    versionId: data.versionId?.trim() || null,
    headline: data.headline?.trim() || null,
    orgName: data.orgName?.trim() || null,
    templateName: data.templateName?.trim() || null,
    captionText: data.captionText?.trim() || null,
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
