/**
 * Role simulation is for local/staging developer tooling only.
 * Production and Preview stay closed unless ALLOW_ROLE_SIMULATOR=true
 * is set explicitly (never rely on VERCEL_ENV alone).
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
    ""
  ).toLowerCase();
  return environment === "development" || environment === "staging";
}
