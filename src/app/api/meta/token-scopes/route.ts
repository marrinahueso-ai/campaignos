import { NextResponse } from "next/server";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { canUploadCampaignAssets } from "@/lib/creative-assets/permissions";
import {
  ensureMetaConnectionHealthyForOrganization,
} from "@/lib/meta-publishing/connection-token-health";
import { getMetaConnectionForCurrentOrg } from "@/lib/meta-publishing/connection";
import { getLatestOrganization } from "@/lib/organizations/queries";

export async function GET() {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organization = await getLatestOrganization();
  if (!organization?.id) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const connection = await getMetaConnectionForCurrentOrg();
  if (!connection?.pageAccessToken) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 400 });
  }

  const health = await ensureMetaConnectionHealthyForOrganization(organization.id);
  if (!health) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 400 });
  }

  return NextResponse.json({
    pageId: health.connection.facebookPageId,
    pageName: health.connection.pageName,
    tokenValid: health.tokenValid,
    tokenNeverExpires: health.tokenNeverExpires,
    tokenExpiresAt: health.tokenExpiresAt,
    tokenType: health.tokenType,
    grantedScopes: health.grantedScopes,
    inboxRelevantScopes: health.inboxRelevantScopes,
    missingFacebookCommentReplyScopes: health.missingFacebookCommentReplyScopes,
    facebookCommentReplyReady: health.facebookCommentReplyReady,
    reconnectRequired: health.reconnectRequired,
    reconnectHint: health.reconnectRequired
      ? "Your Facebook Page token is no longer valid. Reconnect once in Settings → Meta Publishing."
      : health.missingFacebookCommentReplyScopes.length > 0
        ? "Facebook comment replies need pages_manage_engagement. Publishing and inbox sync still work — reconnect only if you need comment replies."
        : null,
    debugError: health.error,
  });
}
