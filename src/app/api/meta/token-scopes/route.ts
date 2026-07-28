import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/access-templates/effective-access";
import {
  ensureMetaConnectionHealthyForOrganization,
} from "@/lib/meta-publishing/connection-token-health";
import { getMetaConnectionForCurrentOrg } from "@/lib/meta-publishing/connection";
import { getLatestOrganization } from "@/lib/organizations/queries";

export async function GET() {
  if (!(await hasPermission("upload_artwork"))) {
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
      ? "Your Facebook connection needs a refresh. Reconnect once in Settings → Meta."
      : health.missingFacebookCommentReplyScopes.length > 0
        ? "Comment replies need one more Facebook approval. Publishing and inbox still work — reconnect only if you need comment replies."
        : null,
    debugError: health.error,
  });
}
