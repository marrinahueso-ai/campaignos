import "server-only";

export const MONDAY_API_URL = "https://api.monday.com/v2";
export const MONDAY_AUTHORIZE_URL = "https://auth.monday.com/oauth2/authorize";
export const MONDAY_TOKEN_URL = "https://auth.monday.com/oauth2/token";

/** Phase 1 OAuth scopes — must match Developer Center OAuth settings exactly. */
export const MONDAY_OAUTH_SCOPES = [
  "boards:read",
  "boards:write",
  "workspaces:read",
].join(" ");

export const MONDAY_OAUTH_STATE_COOKIE = "monday_oauth_state";
export const MONDAY_OAUTH_RETURN_COOKIE = "monday_oauth_return_to";

export function isMondayIntegrationConfigured(): boolean {
  return Boolean(
    process.env.MONDAY_CLIENT_ID?.trim() &&
      process.env.MONDAY_CLIENT_SECRET?.trim(),
  );
}

export function getMondayClientId(): string {
  const clientId = process.env.MONDAY_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("MONDAY_CLIENT_ID is not configured.");
  }
  return clientId;
}

export function getMondayClientSecret(): string {
  const secret = process.env.MONDAY_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error("MONDAY_CLIENT_SECRET is not configured.");
  }
  return secret;
}

/** Canonical site origin for OAuth redirect_uri — must match Monday Developer Center exactly. */
export function resolveMondayOAuthOrigin(requestOrigin: string): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    requestOrigin.trim() ||
    "http://localhost:3000";
  return configured.replace(/\/$/, "");
}

function normalizeMondayRedirectUri(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.pathname.endsWith("/") && url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.toString();
  } catch {
    return uri.replace(/\/+$/, "");
  }
}

export function getMondayRedirectUri(requestOrigin: string): string {
  const configured = process.env.MONDAY_REDIRECT_URI?.trim();
  if (configured) {
    return normalizeMondayRedirectUri(configured);
  }
  const origin = resolveMondayOAuthOrigin(requestOrigin);
  return normalizeMondayRedirectUri(
    new URL("/api/monday/oauth/callback", origin).toString(),
  );
}

export function getMondayOAuthCallbackUrl(requestOrigin = "http://localhost:3000"): string {
  return getMondayRedirectUri(requestOrigin);
}

export function getMondayOAuthCookieOptions(origin: string) {
  const secure = origin.startsWith("https://");
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
}

export const MONDAY_OAUTH_ERROR_MESSAGES: Record<string, string> = {
  not_configured:
    "Monday OAuth is not configured on the server (missing client ID or secret).",
  missing_code:
    "Monday did not return an authorization code. Confirm the redirect URL in the Monday Developer Center matches exactly.",
  invalid_state: "OAuth session expired or was invalid. Click Connect Monday and try again.",
  no_organization: "Sign in to CampaignOS before connecting Monday.",
  token_exchange_failed:
    "Could not exchange the Monday authorization code for a token. Check client secret and redirect URL.",
  save_failed: "Monday authorized successfully but CampaignOS could not save the connection.",
  access_denied: "Monday access was denied.",
  invalid_scope: "Requested OAuth scopes do not match your Monday app configuration.",
  invalid_request: "Monday rejected the OAuth request. Check redirect URL and scopes.",
  unauthorized_client: "Monday rejected the client ID or redirect URL.",
  server_error: "Monday returned a server error during OAuth.",
  temporary_unavailable: "Monday OAuth is temporarily unavailable. Try again shortly.",
};
