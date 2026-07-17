import type { CampaignRole } from "@/lib/auth/campaign-roles";

/** View: any authenticated member who can load the event (org school-year scope). */
export function canViewVolunteerStats(_role: CampaignRole | null): boolean {
  return true;
}

/**
 * Manage connect/refresh/replace/disconnect.
 * Aligns with existing event manage gates (admin/president) plus developer/tester.
 */
export function canManageVolunteerStats(role: CampaignRole | null): boolean {
  if (!role) return false;
  return (
    role === "admin" ||
    role === "president" ||
    role === "developer" ||
    role === "tester"
  );
}
