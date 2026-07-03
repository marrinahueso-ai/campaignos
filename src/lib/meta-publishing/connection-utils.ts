import type { ResolvedMetaPage } from "@/lib/meta-publishing/graph-api";
import type { MetaConnection } from "@/lib/meta-publishing/types";

export function pickPageFromTokenResult(
  pages: ResolvedMetaPage[],
  preferredPageId?: string,
): ResolvedMetaPage | null {
  if (preferredPageId) {
    const preferred = pages.find((page) => page.id === preferredPageId);
    if (preferred) {
      return preferred;
    }
  }

  const linkedInstagramPage = pages.find((page) => page.instagramAccountId);
  if (linkedInstagramPage) {
    return linkedInstagramPage;
  }

  const testPage = pages.find((page) => /test|pto/i.test(page.name));
  return testPage ?? pages[0] ?? null;
}

export function isMetaConnectionConfigured(connection: MetaConnection | null): boolean {
  return Boolean(connection?.facebookPageId && connection.pageAccessToken);
}

export function isInstagramPublishingConfigured(connection: MetaConnection | null): boolean {
  return Boolean(connection?.instagramAccountId?.trim());
}

const META_OAUTH_ERROR_MESSAGES: Record<string, string> = {
  no_pages:
    "Facebook login succeeded but no Page access token could be resolved. This usually means your Page is in Meta Business Suite — granular page permissions may not survive token exchange, or META_FACEBOOK_PAGE_ID is not the numeric Page ID.",
  not_configured: "Meta app credentials are not configured on the server.",
  token_exchange_failed: "Meta token exchange failed. Check META_APP_ID, META_APP_SECRET, and redirect URL.",
  long_lived_exchange_failed: "Could not exchange for a long-lived token.",
  invalid_state:
    "OAuth session could not be verified. Close other CampaignOS tabs, then click Connect with Facebook again. If it keeps failing, confirm META_REDIRECT_URI matches your live site URL exactly.",
  missing_code: "Facebook did not return an authorization code.",
  no_organization: "Set up your organization before connecting Meta.",
  verify_failed: "Connected to Meta but Page verification failed.",
  save_failed: "Could not save the Meta connection.",
  migration_required: "Meta connection storage is not set up. Run database migration 021.",
};

export function getMetaOAuthErrorMessage(errorCode: string | undefined): string | null {
  if (!errorCode) {
    return null;
  }
  return (
    META_OAUTH_ERROR_MESSAGES[errorCode] ??
    `Could not connect Meta (${errorCode.replaceAll("_", " ")}).`
  );
}
