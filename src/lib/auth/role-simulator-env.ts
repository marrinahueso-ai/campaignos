/**
 * Role simulation is for local/staging developer tooling only.
 * Production stays closed unless ALLOW_ROLE_SIMULATOR=true.
 */
export function isRoleSimulatorEnvironmentAllowed(): boolean {
  if (process.env.ALLOW_ROLE_SIMULATOR === "true") {
    return true;
  }
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  const environment = (
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    ""
  ).toLowerCase();
  return (
    environment === "development" ||
    environment === "preview" ||
    environment === "staging"
  );
}
