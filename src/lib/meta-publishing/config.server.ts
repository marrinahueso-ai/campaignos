import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const META_OAUTH_STATE_TTL_SECONDS = 60 * 10;

function signMetaOAuthStatePayload(payload: string): string {
  return createHmac("sha256", getMetaAppSecret()).update(payload).digest("base64url");
}

function safeCompareSignatures(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export type MetaOAuthStatePayload = {
  valid: boolean;
  pageId: string | null;
};

function normalizeOAuthStatePageId(value: string | null | undefined): string | null {
  const id = value?.trim() ?? "";
  return /^\d+$/.test(id) ? id : null;
}

/** Signed OAuth state survives Safari and cross-site redirects without relying on cookies. */
export function createMetaOAuthState(options?: { pageId?: string }): string {
  const nonce = randomBytes(32).toString("base64url");
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const pageId = normalizeOAuthStatePageId(options?.pageId);
  const payload = pageId ? `${nonce}.${issuedAt}.${pageId}` : `${nonce}.${issuedAt}`;
  return `${payload}.${signMetaOAuthStatePayload(payload)}`;
}

export function parseMetaOAuthState(state: string | null | undefined): MetaOAuthStatePayload {
  if (!state) {
    return { valid: false, pageId: null };
  }

  const parts = state.split(".");
  if (parts.length !== 3 && parts.length !== 4) {
    return { valid: false, pageId: null };
  }

  const nonce = parts[0];
  const issuedAtRaw = parts[1];
  const signature = parts[parts.length - 1] ?? "";
  const pageId = parts.length === 4 ? normalizeOAuthStatePageId(parts[2]) : null;

  if (!nonce || !issuedAtRaw || !signature) {
    return { valid: false, pageId: null };
  }

  const payload = pageId ? `${nonce}.${issuedAtRaw}.${pageId}` : `${nonce}.${issuedAtRaw}`;
  if (!safeCompareSignatures(signature, signMetaOAuthStatePayload(payload))) {
    return { valid: false, pageId: null };
  }

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) {
    return { valid: false, pageId: null };
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAt;
  const valid = ageSeconds >= 0 && ageSeconds <= META_OAUTH_STATE_TTL_SECONDS;
  return { valid, pageId: valid ? pageId : null };
}

export function verifyMetaOAuthState(state: string | null | undefined): boolean {
  return parseMetaOAuthState(state).valid;
}

export function getMetaOAuthCookieOptions(origin: string) {
  const secure = origin.startsWith("https://");
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: META_OAUTH_STATE_TTL_SECONDS,
  };
}

export function isMetaIntegrationConfigured(): boolean {
  return Boolean(
    process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim(),
  );
}

export function getMetaAppId(): string {
  const appId = process.env.META_APP_ID?.trim();
  if (!appId) {
    throw new Error("META_APP_ID is not configured.");
  }
  return appId;
}

export function getMetaAppSecret(): string {
  const secret = process.env.META_APP_SECRET?.trim();
  if (!secret) {
    throw new Error("META_APP_SECRET is not configured.");
  }
  return secret;
}

export function getMetaRedirectUri(origin: string): string {
  const configured = process.env.META_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }
  return new URL("/api/meta/oauth/callback", origin).toString();
}

export function getMetaAppAccessToken(): string {
  return `${getMetaAppId()}|${getMetaAppSecret()}`;
}

/** Facebook Login for Business configuration ID (optional). When set, OAuth uses config_id instead of scope. */
export function getMetaOAuthConfigId(): string | null {
  const configId = process.env.META_OAUTH_CONFIG_ID?.trim();
  return configId || null;
}

/** Known Facebook Page ID for OAuth fallback when list endpoints return empty. */
export function getMetaFacebookPageId(): string | null {
  const pageId = process.env.META_FACEBOOK_PAGE_ID?.trim();
  return pageId || null;
}
