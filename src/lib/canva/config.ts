import "server-only";

export const CANVA_API_BASE = "https://api.canva.com/rest/v1";
export const CANVA_AUTHORIZE_URL = "https://www.canva.com/api/oauth/authorize";
export const CANVA_TOKEN_URL = `${CANVA_API_BASE}/oauth/token`;

export const CANVA_OAUTH_SCOPES = ["design:meta:read", "design:content:read"].join(" ");

export const CANVA_OAUTH_STATE_COOKIE = "canva_oauth_state";
export const CANVA_OAUTH_VERIFIER_COOKIE = "canva_oauth_verifier";
export const CANVA_OAUTH_RETURN_COOKIE = "canva_oauth_return_to";

export function isCanvaIntegrationConfigured(): boolean {
  return Boolean(
    process.env.CANVA_CLIENT_ID?.trim() && process.env.CANVA_CLIENT_SECRET?.trim(),
  );
}

export function getCanvaClientId(): string {
  const clientId = process.env.CANVA_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("CANVA_CLIENT_ID is not configured.");
  }
  return clientId;
}

export function getCanvaClientSecret(): string {
  const secret = process.env.CANVA_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new Error("CANVA_CLIENT_SECRET is not configured.");
  }
  return secret;
}

export function getCanvaRedirectUri(origin: string): string {
  const configured = process.env.CANVA_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return new URL("/api/canva/oauth/callback", origin).toString();
}

export function getCanvaBasicAuthHeader(): string {
  const credentials = Buffer.from(
    `${getCanvaClientId()}:${getCanvaClientSecret()}`,
  ).toString("base64");
  return `Basic ${credentials}`;
}
