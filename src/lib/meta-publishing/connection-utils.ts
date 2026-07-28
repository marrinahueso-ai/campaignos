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
    "Facebook sign-in worked, but we couldn’t find a Page to connect. Confirm you admin a Facebook Page, then try Connect with Facebook again.",
  not_configured: "Facebook connection isn’t available yet. Contact support if this continues.",
  token_exchange_failed:
    "We couldn’t finish connecting Facebook. Try again in a moment, or contact support if it keeps failing.",
  long_lived_exchange_failed:
    "We couldn’t finish connecting Facebook. Try Connect with Facebook again.",
  invalid_state:
    "That Facebook connection timed out. Close other Hey Ralli tabs, then click Connect with Facebook again.",
  missing_code: "Facebook didn’t finish authorizing. Try Connect with Facebook again.",
  no_organization: "Set up your organization before connecting Facebook.",
  verify_failed: "Connected to Facebook, but we couldn’t verify your Page. Try again.",
  save_failed: "Could not save the Facebook connection. Try again.",
  migration_required:
    "Facebook connection isn’t ready on this workspace yet. Contact support for help.",
  capacity_exceeded:
    "Your plan’s social account limit is reached. Upgrade in Billing to connect another account.",
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
