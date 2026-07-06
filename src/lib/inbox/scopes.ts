import {
  META_INBOX_OAUTH_SCOPE_LIST,
  META_OAUTH_SCOPE_LIST,
} from "@/lib/meta-publishing/oauth-scopes";

export const INBOX_MESSAGING_SCOPES = [
  "pages_messaging",
  "instagram_manage_messages",
] as const;

/** Required on the Page token for Instagram Messaging / Conversations API. */
export const INSTAGRAM_DM_SCOPES = [
  "instagram_basic",
  "instagram_manage_messages",
  "pages_manage_metadata",
] as const;

/** Facebook post comments require pages_read_user_content (not pages_read_engagement alone). */
export const FACEBOOK_COMMENT_SCOPES = ["pages_read_user_content"] as const;

export const INSTAGRAM_COMMENT_SCOPES = ["instagram_manage_comments"] as const;

export const INBOX_COMMENT_SCOPES = [
  ...FACEBOOK_COMMENT_SCOPES,
  ...INSTAGRAM_COMMENT_SCOPES,
] as const;

export function parseGrantedScopes(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export function formatGrantedScopes(scopes: string[]): string {
  return [...new Set(scopes)].sort().join(",");
}

export function filterInboxRelevantScopes(scopes: string[]): string[] {
  const allowed = new Set<string>([
    ...META_OAUTH_SCOPE_LIST,
    ...META_INBOX_OAUTH_SCOPE_LIST,
  ]);

  return scopes.filter((scope) => allowed.has(scope));
}

export function hasMessagingScopes(scopes: string[]): boolean {
  return INBOX_MESSAGING_SCOPES.some((scope) => scopes.includes(scope));
}

export function hasInstagramDmScopes(scopes: string[]): boolean {
  return INSTAGRAM_DM_SCOPES.every((scope) => scopes.includes(scope));
}

export function missingInstagramDmScopes(scopes: string[]): string[] {
  return INSTAGRAM_DM_SCOPES.filter((scope) => !scopes.includes(scope));
}

export function missingInstagramCommentScopes(scopes: string[]): string[] {
  return INSTAGRAM_COMMENT_SCOPES.filter((scope) => !scopes.includes(scope));
}

export function missingFacebookCommentScopes(scopes: string[]): string[] {
  return FACEBOOK_COMMENT_SCOPES.filter((scope) => !scopes.includes(scope));
}

export function hasCommentScopes(scopes: string[]): boolean {
  return INBOX_COMMENT_SCOPES.some((scope) => scopes.includes(scope));
}

export function hasInboxOAuthScopes(scopes: string[]): boolean {
  return hasMessagingScopes(scopes) || hasCommentScopes(scopes);
}

/** True only when debug_token / stored scopes include inbox permissions — not sync history. */
export function isMessagingReady(input: {
  metaConnected: boolean;
  grantedScopes: string[];
}): boolean {
  if (!input.metaConnected) {
    return false;
  }

  return hasInboxOAuthScopes(input.grantedScopes);
}
