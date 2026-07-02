import type { OrganizationRoleKind } from "@/types/organization-workspace";

export interface OrganizationRoleTemplateEntry {
  name: string;
  description: string;
  roleKind: OrganizationRoleKind;
  sortOrder: number;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

/** Default VP-board structure — matches Edmondson Elementary PTO. */
export const VP_BOARD_ROLE_TEMPLATE: OrganizationRoleTemplateEntry[] = [
  {
    name: "President",
    description: "Final approvals and board messaging.",
    roleKind: "president",
    sortOrder: 10,
    contactEmail: null,
    contactPhone: null,
  },
  {
    name: "VP Staff Support/Hospitality",
    description: "Staff appreciation, hospitality, and volunteer communications.",
    roleKind: "vp",
    sortOrder: 20,
    contactEmail: null,
    contactPhone: null,
  },
  {
    name: "VP Fundraising",
    description: "Fundraisers, donations, and sponsor communications.",
    roleKind: "vp",
    sortOrder: 30,
    contactEmail: null,
    contactPhone: null,
  },
  {
    name: "VP Events",
    description: "School events, book fair, and family programming.",
    roleKind: "vp",
    sortOrder: 40,
    contactEmail: null,
    contactPhone: null,
  },
  {
    name: "VP Communications",
    description: "Social media, newsletter, website, and publishing.",
    roleKind: "vp",
    sortOrder: 50,
    contactEmail: null,
    contactPhone: null,
  },
];

export const DEFAULT_ORGANIZATION_ROLE_TEMPLATE = VP_BOARD_ROLE_TEMPLATE;
