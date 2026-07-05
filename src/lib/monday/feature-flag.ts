/**
 * Monday integration is opt-in. Set NEXT_PUBLIC_CAMPAIGNOS_MONDAY_INTEGRATION_ENABLED=true
 * in Vercel when OAuth, board sync, and Task Hub Monday views are ready.
 */
export function isMondayIntegrationEnabled(): boolean {
  const value =
    process.env.NEXT_PUBLIC_CAMPAIGNOS_MONDAY_INTEGRATION_ENABLED?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}
