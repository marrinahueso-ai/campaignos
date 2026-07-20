import "server-only";

export const GOOGLE_OAUTH_AUTHORIZE_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_URL =
  "https://www.googleapis.com/oauth2/v2/userinfo";
export const GOOGLE_CALENDAR_API_BASE =
  "https://www.googleapis.com/calendar/v3";

/** Calendar-only scopes for phase 1 (no Gmail). */
export const GOOGLE_CALENDAR_OAUTH_SCOPE_LIST = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
] as const;

export const GOOGLE_CALENDAR_OAUTH_SCOPES =
  GOOGLE_CALENDAR_OAUTH_SCOPE_LIST.join(" ");

export const GOOGLE_OAUTH_STATE_COOKIE = "google_cal_oauth_state";
export const GOOGLE_OAUTH_RETURN_COOKIE = "google_cal_oauth_return_to";

export function isGoogleCalendarIntegrationConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export function getGoogleClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }
  return clientId;
}

export function getGoogleClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error("GOOGLE_CLIENT_SECRET is not configured.");
  }
  return secret;
}

export function getGoogleRedirectUri(origin: string): string {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return new URL("/api/google/oauth/callback", origin).toString();
}

export function getGoogleOAuthCookieOptions(origin: string) {
  const isHttps = origin.startsWith("https://");
  return {
    httpOnly: true,
    secure: isHttps || process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
}
