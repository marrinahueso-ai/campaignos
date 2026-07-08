/**
 * Create with AI (Campaign Builder V2 / Creative Studio) is enabled by default.
 * Set NEXT_PUBLIC_CAMPAIGNOS_CAMPAIGN_BUILDER_V2_ENABLED=false to hide
 * the "Create with AI" sidebar entry and block the /events/[id]/campaign-builder route.
 */
export function isCampaignBuilderV2Enabled(): boolean {
  const value =
    process.env.NEXT_PUBLIC_CAMPAIGNOS_CAMPAIGN_BUILDER_V2_ENABLED?.trim().toLowerCase();
  if (value === "false" || value === "0" || value === "no") {
    return false;
  }
  return true;
}
