import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { isAdminRole } from "@/lib/auth/infer-campaign-role";

const WRITE_ROLES: CampaignRole[] = [
  "admin",
  "president",
  "vp_communications",
  "committee_chair",
  "contributor",
];

export function canWriteVendors(role: CampaignRole): boolean {
  return WRITE_ROLES.includes(role);
}

export function canManageVendors(role: CampaignRole): boolean {
  return isAdminRole(role) || role === "president";
}
