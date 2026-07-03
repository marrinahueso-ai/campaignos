import "server-only";

import { randomBytes } from "node:crypto";

export function createMetaOAuthState(): string {
  return randomBytes(96).toString("base64url");
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
