import type { ResolvedMetaPage } from "@/lib/meta-publishing/graph-api";
import type {
  MetaConnection,
  MetaSettingsConnectionView,
} from "@/lib/meta-publishing/types";

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

/**
 * Strip decrypted Page tokens before any Meta connection reaches a client
 * component. Mirrors the InsightsConnectionHealth pattern.
 */
export function toMetaSettingsConnectionView(
  connection: MetaConnection | null,
): MetaSettingsConnectionView | null {
  if (!connection) {
    return null;
  }

  return {
    id: connection.id,
    facebookPageId: connection.facebookPageId,
    instagramAccountId: connection.instagramAccountId,
    pageName: connection.pageName,
    connected: isMetaConnectionConfigured(connection),
    hasInstagram: isInstagramPublishingConfigured(connection),
    configuredViaEnv: connection.id === "env",
  };
}

/** UI phase for Settings → Facebook & Instagram (one route, three visual states). */
export type MetaConnectUiPhase =
  | "not_connected"
  | "facebook_only"
  | "fully_connected"
  | "reconnect_required";

export function getMetaConnectUiPhase(input: {
  connected: boolean;
  hasInstagram: boolean;
  reconnectRequired: boolean;
}): MetaConnectUiPhase {
  if (input.reconnectRequired && input.connected) {
    return "reconnect_required";
  }
  if (!input.connected) {
    return "not_connected";
  }
  if (!input.hasInstagram) {
    return "facebook_only";
  }
  return "fully_connected";
}

/**
 * Honest capability labels for Settings — never "Ready" from OAuth alone.
 * Messaging uses real inbox scope readiness; publishing is "Available" only
 * when the Page token connection is healthy (not a Graph publish smoke test).
 */
export function getMetaCapabilityStatusLabels(input: {
  connected: boolean;
  hasInstagram: boolean;
  reconnectRequired: boolean;
  messagingReady: boolean;
}): {
  facebookPage: string;
  instagram: string;
  messaging: string;
  publishing: string;
} {
  if (input.reconnectRequired) {
    return {
      facebookPage: "Reconnect needed",
      instagram: input.hasInstagram ? "Reconnect needed" : "Not linked yet",
      messaging: "Reconnect needed",
      publishing: "Reconnect needed",
    };
  }
  if (!input.connected) {
    return {
      facebookPage: "Not connected",
      instagram: "Waiting…",
      messaging: "Waiting…",
      publishing: "Waiting…",
    };
  }
  return {
    facebookPage: "Connected",
    instagram: input.hasInstagram ? "Connected" : "Not linked yet",
    messaging: input.messagingReady ? "Ready" : "Needs setup",
    publishing: "Available",
  };
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
