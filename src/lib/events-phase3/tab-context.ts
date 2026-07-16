import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { AuthUserSummary, OrganizationMembership } from "@/types/auth";
import type { Event } from "@/types";

/** Validated once per loadEventDetailTabAction request and reused by tab loaders. */
export type EventDetailTabContext = {
  user: AuthUserSummary;
  membership: OrganizationMembership;
  organizationId: string;
  event: Event;
  campaignRole: CampaignRole;
  tablesAvailable: boolean;
};
