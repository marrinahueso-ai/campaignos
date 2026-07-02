export const OAUTH_SIGN_IN_PROVIDERS = ["google", "facebook"] as const;

export type OAuthSignInProvider = (typeof OAUTH_SIGN_IN_PROVIDERS)[number];

export function isOAuthSignInProvider(
  value: string,
): value is OAuthSignInProvider {
  return (OAUTH_SIGN_IN_PROVIDERS as readonly string[]).includes(value);
}

export const OAUTH_PROVIDER_LABELS: Record<OAuthSignInProvider, string> = {
  google: "Google",
  facebook: "Facebook",
};
