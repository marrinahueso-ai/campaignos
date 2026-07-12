import { META_INSIGHTS_OAUTH_SCOPE_LIST } from "@/lib/meta-publishing/oauth-scopes";

export const FACEBOOK_INSIGHTS_SCOPES = ["read_insights"] as const;
export const INSTAGRAM_INSIGHTS_SCOPES = ["instagram_manage_insights"] as const;

export function missingInsightsScopes(scopes: string[]): string[] {
  return META_INSIGHTS_OAUTH_SCOPE_LIST.filter((scope) => !scopes.includes(scope));
}

export function hasFacebookInsightsScopes(scopes: string[]): boolean {
  return FACEBOOK_INSIGHTS_SCOPES.every((scope) => scopes.includes(scope));
}

export function hasInstagramInsightsScopes(scopes: string[]): boolean {
  return INSTAGRAM_INSIGHTS_SCOPES.every((scope) => scopes.includes(scope));
}

export function hasAnyInsightsScopes(scopes: string[]): boolean {
  return hasFacebookInsightsScopes(scopes) || hasInstagramInsightsScopes(scopes);
}
