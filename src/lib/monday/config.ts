import "server-only";

export const MONDAY_API_URL = "https://api.monday.com/v2";
export const MONDAY_AUTHORIZE_URL = "https://auth.monday.com/oauth2/authorize";
export const MONDAY_TOKEN_URL = "https://auth.monday.com/oauth2/token";

/** Phase 1 OAuth scopes — must match Developer Center OAuth settings exactly. */
export const MONDAY_OAUTH_SCOPES = [
  "me:read",
  "boards:read",
  "boards:write",
  "workspaces:read",
].join(" ");

/** Exact Vercel env var name for Monday OAuth client ID — do not alias or cache. */
export const MONDAY_CLIENT_ID_ENV = "MONDAY_CLIENT_ID";

export const MONDAY_OAUTH_STATE_COOKIE = "monday_oauth_state";
export const MONDAY_OAUTH_RETURN_COOKIE = "monday_oauth_return_to";
export const MONDAY_OAUTH_REDIRECT_URI_COOKIE = "monday_oauth_redirect_uri";

const MONDAY_CLIENT_SECRET_MIN_LENGTH = 10;

/** Strip whitespace, BOM, zero-width chars, and surrounding quotes (common Vercel paste mistakes). */
function sanitizeMondayEnvCredential(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }

  let value = raw.replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
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

export type MondayOAuthConfigDiagnostics = {
  hasClientId: boolean;
  clientIdPrefix: string | null;
  hasClientSecret: boolean;
  secretLength: number;
  secretFirstCharCode: number | null;
  secretLastCharCode: number | null;
  secretHadSurroundingQuotes: boolean;
  redirectUri: string;
  vercelEnv: string | null;
  integrationConfigured: boolean;
};

/** Safe runtime diagnostics for OAuth debugging — never exposes secret values. */
export function getMondayOAuthConfigDiagnostics(
  requestOrigin: string,
): MondayOAuthConfigDiagnostics {
  const rawSecret = process.env.MONDAY_CLIENT_SECRET;
  const rawClientId = process.env[MONDAY_CLIENT_ID_ENV];

  let secretLength = 0;
  let secretFirstCharCode: number | null = null;
  let secretLastCharCode: number | null = null;
  let secretHadSurroundingQuotes = false;

  try {
    const secret = getMondayClientSecret();
    const diagnostics = describeMondayClientSecretForLogging(secret, rawSecret);
    secretLength = diagnostics.length;
    secretFirstCharCode = diagnostics.firstCharCode;
    secretLastCharCode = diagnostics.lastCharCode;
    secretHadSurroundingQuotes = diagnostics.hasSurroundingQuotes;
  } catch {
    // Leave secret fields at defaults when misconfigured.
  }

  let clientIdPrefix: string | null = null;
  try {
    clientIdPrefix = getMondayClientId().slice(0, 8);
  } catch {
    // Leave null when misconfigured.
  }

  return {
    hasClientId: Boolean(sanitizeMondayEnvCredential(rawClientId)),
    clientIdPrefix,
    hasClientSecret: Boolean(sanitizeMondayEnvCredential(rawSecret)),
    secretLength,
    secretFirstCharCode,
    secretLastCharCode,
    secretHadSurroundingQuotes,
    redirectUri: getMondayRedirectUri(requestOrigin),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    integrationConfigured: isMondayIntegrationConfigured(),
  };
}

export function hasMondayClientId(): boolean {
  return Boolean(sanitizeMondayEnvCredential(process.env[MONDAY_CLIENT_ID_ENV]));
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

/** Alias for isMondayIntegrationConfigured — OAuth routes use this name. */
export const isMondayOAuthConfigured = isMondayIntegrationConfigured;

export function getMondayClientId(): string {
  const clientId = sanitizeMondayEnvCredential(process.env[MONDAY_CLIENT_ID_ENV]);
  if (!clientId) {
    throw new Error(`${MONDAY_CLIENT_ID_ENV} is not configured.`);
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

  if (secret.startsWith("sk_live_") || secret.startsWith("sk_test_")) {
    throw new MondayClientSecretConfigError(
      "MONDAY_CLIENT_SECRET looks like a Stripe secret key (sk_live_ / sk_test_). Use Client Secret from Monday Developer Center → Basic Information — a hex string like your Client ID, not Signing Secret.",
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
  missing_client_id: `${MONDAY_CLIENT_ID_ENV} is missing or empty in Vercel. Set it in Production (exact name: ${MONDAY_CLIENT_ID_ENV}), paste without quotes, and redeploy.`,
  not_configured:
    "Monday OAuth is not configured on the server (missing client ID or secret).",
  invalid_client_secret_config:
    "MONDAY_CLIENT_SECRET looks misconfigured (too short, Stripe key, or wrong field). Use Client Secret from Developer Center → Basic Information — hex format like Client ID, not Signing Secret and not sk_live_/sk_test_ Stripe keys.",
  callback_failed:
    "Monday OAuth callback failed unexpectedly. Check server logs, verify MONDAY_CLIENT_SECRET, and try Connect Monday again.",
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
  invalid_request:
    "Monday rejected the OAuth request. If the message mentions client_secret, the value in Vercel does not match Developer Center → Basic Information for this Client ID — regenerate Client Secret there, update MONDAY_CLIENT_SECRET in Vercel Production, and redeploy.",
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
