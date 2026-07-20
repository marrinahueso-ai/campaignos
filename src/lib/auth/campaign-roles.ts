export type CampaignRole =
  | "admin"
  | "president"
  | "vp_communications"
  | "committee_chair"
  | "contributor"
  | "view_only"
  | "developer"
  | "tester";

export const CAMPAIGN_ROLES: CampaignRole[] = [
  "admin",
  "president",
  "vp_communications",
  "committee_chair",
  "contributor",
  "view_only",
  "developer",
  "tester",
];

/** Roles that can approve drafts. Developer has full app access including approval. */
export const APPROVER_ROLES: CampaignRole[] = [
  "admin",
  "president",
  "vp_communications",
  "developer",
];

/** Roles that can submit drafts. Tester defaults to contributor-like submit access. */
export const SUBMITTER_ROLES: CampaignRole[] = [
  "committee_chair",
  "contributor",
  "tester",
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

/** Meta / social publishing — Tester is excluded by product rule. */
export function canPublishCampaignContent(role: CampaignRole): boolean {
  return role !== "view_only" && role !== "tester";
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
      return "Committee Chair";
    case "contributor":
      return "Contributor";
    case "view_only":
      return "View Only";
    case "developer":
      return "Developer";
    case "tester":
      return "Tester";
    default:
      return role;
  }
}
