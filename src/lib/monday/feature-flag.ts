/**
 * Monday integration is enabled by default. Set
 * NEXT_PUBLIC_CAMPAIGNOS_MONDAY_INTEGRATION_ENABLED=false to disable OAuth, sync, and Task Hub Monday views.
 */
export function isMondayIntegrationEnabled(): boolean {
  const value =
    process.env.NEXT_PUBLIC_CAMPAIGNOS_MONDAY_INTEGRATION_ENABLED?.trim().toLowerCase();
  if (value === "false" || value === "0" || value === "no") {
    return false;
  }
  return true;
}
