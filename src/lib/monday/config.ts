import "server-only";

export const MONDAY_API_URL = "https://api.monday.com/v2";
export const MONDAY_AUTHORIZE_URL = "https://auth.monday.com/oauth2/authorize";
export const MONDAY_TOKEN_URL = "https://auth.monday.com/oauth2/token";

/** Scopes needed for CampaignOS task hub sync (boards, items, webhooks). */
export const MONDAY_OAUTH_SCOPES = [
  "boards:read",
  "boards:write",
  "workspaces:read",
  "webhooks:write",
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

export function getMondayRedirectUri(origin: string): string {
  const configured = process.env.MONDAY_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return new URL("/api/monday/oauth/callback", origin).toString();
}
