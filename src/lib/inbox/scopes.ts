import {
  META_INBOX_OAUTH_SCOPE_LIST,
  META_OAUTH_SCOPE_LIST,
} from "@/lib/meta-publishing/oauth-scopes";

export const INBOX_MESSAGING_SCOPES = [
  "pages_messaging",
  "instagram_manage_messages",
] as const;

export const INBOX_COMMENT_SCOPES = [
  "pages_read_engagement",
  "instagram_manage_comments",
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

export function hasCommentScopes(scopes: string[]): boolean {
  return INBOX_COMMENT_SCOPES.some((scope) => scopes.includes(scope));
}

export function isMessagingReady(input: {
  metaConnected: boolean;
  grantedScopes: string[];
  syncEnabled?: boolean;
}): boolean {
  if (!input.metaConnected) {
    return false;
  }

  if (input.syncEnabled) {
    return true;
  }

  return hasMessagingScopes(input.grantedScopes) || hasCommentScopes(input.grantedScopes);
}
