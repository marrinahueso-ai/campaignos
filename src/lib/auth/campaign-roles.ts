export type CampaignRole =
  | "admin"
  | "president"
  | "vp_communications"
  | "committee_chair"
  | "contributor"
  | "view_only";

export const CAMPAIGN_ROLES: CampaignRole[] = [
  "admin",
  "president",
  "vp_communications",
  "committee_chair",
  "contributor",
  "view_only",
];

export const APPROVER_ROLES: CampaignRole[] = [
  "admin",
  "president",
  "vp_communications",
];

export const SUBMITTER_ROLES: CampaignRole[] = [
  "committee_chair",
  "contributor",
];

export function isCampaignRole(value: string): value is CampaignRole {
  return (CAMPAIGN_ROLES as string[]).includes(value);
}

export function canApproveDraft(role: CampaignRole): boolean {
  return APPROVER_ROLES.includes(role);
}

export function canSubmitForApproval(role: CampaignRole): boolean {
  return SUBMITTER_ROLES.includes(role) || canApproveDraft(role);
}

export function canDraftCommunications(role: CampaignRole): boolean {
  return canSubmitForApproval(role);
}

export function campaignRoleLabel(role: CampaignRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "president":
      return "President";
    case "vp_communications":
      return "VP Communications";
    case "committee_chair":
      return "Committee chair";
    case "contributor":
      return "Contributor";
    case "view_only":
      return "View only";
    default:
      return role;
  }
}
