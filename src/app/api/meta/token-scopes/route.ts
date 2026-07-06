import { NextResponse } from "next/server";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { canUploadCampaignAssets } from "@/lib/creative-assets/permissions";
import {
  getMetaTokenScopeDiagnostics,
  refreshInboxScopesFromPageToken,
} from "@/lib/inbox/settings";
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

  const diagnostics = await getMetaTokenScopeDiagnostics({
    pageAccessToken: connection.pageAccessToken,
  });

  await refreshInboxScopesFromPageToken({
    organizationId: organization.id,
    pageAccessToken: connection.pageAccessToken,
    enableSync: true,
  });

  return NextResponse.json({
    pageId: connection.facebookPageId,
    pageName: connection.pageName,
    ...diagnostics,
    reconnectRequired: diagnostics.missingFacebookCommentReplyScopes.length > 0,
    reconnectHint:
      diagnostics.missingFacebookCommentReplyScopes.length > 0
        ? "pages_manage_engagement is missing on this Page token. Set it to Ready for testing in Meta Developer Dashboard, then click Reconnect with Facebook in Settings → Meta."
        : null,
  });
}
