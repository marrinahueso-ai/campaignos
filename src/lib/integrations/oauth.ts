/**
 * Thin shared helpers for third-party OAuth connect CTAs.
 * Provider token exchange stays in each provider’s start/callback routes.
 */

export type OAuthProvider = "meta" | "canva" | "monday" | "google";

export type IntegrationSettingsProvider =
  | OAuthProvider
  | "calendar";

const SETTINGS_PATH: Record<IntegrationSettingsProvider, string> = {
  meta: "/settings/meta",
  canva: "/settings/canva",
  monday: "/settings/monday",
  google: "/settings/integrations/calendar",
  calendar: "/settings/integrations/calendar",
};

const OAUTH_START_PATH: Record<OAuthProvider, string> = {
  meta: "/api/meta/oauth/start",
  canva: "/api/canva/oauth/start",
  monday: "/api/monday/oauth/start",
  google: "/api/google/oauth/start",
};

/** Safe in-app path for post-OAuth redirect (blocks open redirects). */
export function safeOAuthReturnTo(
  value: string | null | undefined,
  fallback: string,
): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return fallback;
}

export function buildIntegrationSettingsPath(
  provider: IntegrationSettingsProvider,
  returnTo?: string | null,
): string {
  const base = SETTINGS_PATH[provider];
  const safe = returnTo
    ? safeOAuthReturnTo(returnTo, base)
    : null;
  if (!safe || safe === base) {
    return base;
  }
  return `${base}?returnTo=${encodeURIComponent(safe)}`;
}

export interface BuildOAuthStartPathOptions {
  returnTo: string;
  pageId?: string | null;
  /** Meta only — forces Facebook to re-prompt permissions. */
  authType?: "rerequest" | null;
}

/** Build the provider OAuth start URL (one click → provider consent). */
export function buildOAuthStartPath(
  provider: OAuthProvider,
  options: BuildOAuthStartPathOptions,
): string {
  const fallback = SETTINGS_PATH[provider];
  const params = new URLSearchParams({
    returnTo: safeOAuthReturnTo(options.returnTo, fallback),
  });

  if (provider === "meta") {
    const pageId = options.pageId?.trim();
    if (pageId) {
      params.set("pageId", pageId);
    }
    if (options.authType === "rerequest") {
      params.set("auth_type", "rerequest");
    }
  }

  return `${OAUTH_START_PATH[provider]}?${params.toString()}`;
}

export function buildMetaOAuthStartPath(options: BuildOAuthStartPathOptions): string {
  return buildOAuthStartPath("meta", options);
}
