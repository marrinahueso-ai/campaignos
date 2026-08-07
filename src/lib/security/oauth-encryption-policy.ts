/**
 * Production-deployed environments must encrypt OAuth tokens at rest.
 * Local development may omit the key (tokens stay plaintext with a warning).
 */
export function isOAuthTokenEncryptionRequired(): boolean {
  const vercelEnv = (process.env.VERCEL_ENV || "").toLowerCase();
  if (vercelEnv === "production" || vercelEnv === "preview") {
    return true;
  }
  return (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PLAINTEXT_OAUTH_TOKENS !== "true"
  );
}
