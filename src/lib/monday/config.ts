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
export const MONDAY_OAUTH_REDIRECT_URI_COOKIE = "monday_oauth_redirect_uri";

const MONDAY_CLIENT_SECRET_MIN_LENGTH = 10;

/** Strip whitespace and surrounding quotes (common Vercel paste mistake). */
function sanitizeMondayEnvCredential(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }

  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value || undefined;
}

export type MondayClientSecretDiagnostics = {
  length: number;
  firstCharCode: number;
  lastCharCode: number;
  hasSurroundingQuotes: boolean;
};

export function describeMondayClientSecretForLogging(
  secret: string,
  raw?: string,
): MondayClientSecretDiagnostics {
  const rawTrimmed = raw?.trim() ?? "";
  const hasSurroundingQuotes =
    rawTrimmed.length >= 2 &&
    ((rawTrimmed.startsWith('"') && rawTrimmed.endsWith('"')) ||
      (rawTrimmed.startsWith("'") && rawTrimmed.endsWith("'")));

  return {
    length: secret.length,
    firstCharCode: secret.charCodeAt(0),
    lastCharCode: secret.charCodeAt(secret.length - 1),
    hasSurroundingQuotes,
  };
}

export class MondayClientSecretConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MondayClientSecretConfigError";
  }
}

export function isMondayIntegrationConfigured(): boolean {
  try {
    getMondayClientId();
    getMondayClientSecret();
    return true;
  } catch {
    return false;
  }
}

export function getMondayClientId(): string {
  const clientId = sanitizeMondayEnvCredential(process.env.MONDAY_CLIENT_ID);
  if (!clientId) {
    throw new Error("MONDAY_CLIENT_ID is not configured.");
  }
  return clientId;
}

export function getMondayClientSecret(): string {
  const raw = process.env.MONDAY_CLIENT_SECRET;
  const secret = sanitizeMondayEnvCredential(raw);
  if (!secret) {
    throw new Error("MONDAY_CLIENT_SECRET is not configured.");
  }

  const rawTrimmed = raw?.trim() ?? "";
  const hadSurroundingQuotes =
    rawTrimmed.length >= 2 &&
    ((rawTrimmed.startsWith('"') && rawTrimmed.endsWith('"')) ||
      (rawTrimmed.startsWith("'") && rawTrimmed.endsWith("'")));

  if (secret.length < MONDAY_CLIENT_SECRET_MIN_LENGTH) {
    throw new MondayClientSecretConfigError(
      `MONDAY_CLIENT_SECRET must be at least ${MONDAY_CLIENT_SECRET_MIN_LENGTH} characters after trimming${hadSurroundingQuotes ? " (surrounding quotes were stripped)" : ""}. Use Client Secret from Developer Center → Basic Information, not Signing Secret.`,
    );
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
  invalid_client_secret_config:
    "MONDAY_CLIENT_SECRET looks misconfigured (too short or empty after trimming). Use Client Secret from Developer Center → Basic Information, not Signing Secret.",
  missing_code:
    "Monday did not return an authorization code. Confirm the redirect URL in the Monday Developer Center matches exactly.",
  invalid_state: "OAuth session expired or was invalid. Click Connect Monday and try again.",
  no_organization: "Sign in to CampaignOS before connecting Monday.",
  token_exchange_failed:
    "Could not exchange the Monday authorization code for a token. Check client secret and redirect URL.",
  invalid_client:
    "Monday rejected the client ID or client secret. In Developer Center → Basic Information copy Client ID and Client Secret (not Signing Secret). Set both in Vercel Production (not Preview-only), without quotes, then redeploy.",
  invalid_grant:
    "Monday rejected the authorization code. The code may have expired, already been used, or the redirect URL did not match the authorize request.",
  save_failed: "Monday authorized successfully but CampaignOS could not save the connection.",
  access_denied: "Monday access was denied.",
  invalid_scope: "Requested OAuth scopes do not match your Monday app configuration.",
  invalid_request: "Monday rejected the OAuth request. Check redirect URL and scopes.",
  unauthorized_client: "Monday rejected the client ID or redirect URL.",
  server_error: "Monday returned a server error during OAuth.",
  temporary_unavailable: "Monday OAuth is temporarily unavailable. Try again shortly.",
};

export function formatMondayOAuthError(
  error: string,
  errorDescription?: string | null,
): string {
  const base =
    MONDAY_OAUTH_ERROR_MESSAGES[error] ??
    `Could not connect Monday (${error.replaceAll("_", " ")}).`;

  const detail = errorDescription?.trim();
  if (!detail) {
    return base;
  }

  return `${base} Monday says: ${detail}`;
}
