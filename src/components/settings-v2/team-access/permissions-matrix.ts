export type PermissionLevel = "allowed" | "limited" | "denied";

export interface PermissionRow {
  id: string;
  label: string;
  levels: Record<string, PermissionLevel>;
}

export const PERMISSION_COLUMNS = [
  { id: "owner", label: "Owner" },
  { id: "president", label: "President" },
  { id: "vp", label: "VP" },
  { id: "chair", label: "Chair" },
  { id: "volunteer", label: "Volunteer" },
  { id: "viewer", label: "Viewer" },
] as const;

export const PERMISSION_MATRIX: PermissionRow[] = [
  {
    id: "manage_members",
    label: "Manage members",
    levels: {
      owner: "allowed",
      president: "allowed",
      vp: "limited",
      chair: "denied",
      volunteer: "denied",
      viewer: "denied",
    },
  },
  {
    id: "manage_roles",
    label: "Manage roles",
    levels: {
      owner: "allowed",
      president: "allowed",
      vp: "denied",
      chair: "denied",
      volunteer: "denied",
      viewer: "denied",
    },
  },
  {
    id: "view_committees",
    label: "View all committees",
    levels: {
      owner: "allowed",
      president: "allowed",
      vp: "allowed",
      chair: "limited",
      volunteer: "limited",
      viewer: "limited",
    },
  },
  {
    id: "edit_committee",
    label: "Edit committee",
    levels: {
      owner: "allowed",
      president: "allowed",
      vp: "allowed",
      chair: "limited",
      volunteer: "denied",
      viewer: "denied",
    },
  },
  {
    id: "create_campaigns",
    label: "Create campaigns",
    levels: {
      owner: "allowed",
      president: "allowed",
      vp: "allowed",
      chair: "allowed",
      volunteer: "limited",
      viewer: "denied",
    },
  },
  {
    id: "publish_comms",
    label: "Publish communications",
    levels: {
      owner: "allowed",
      president: "allowed",
      vp: "allowed",
      chair: "limited",
      volunteer: "denied",
      viewer: "denied",
    },
  },
  {
    id: "approve_comms",
    label: "Approve communications",
    levels: {
      owner: "allowed",
      president: "allowed",
      vp: "allowed",
      chair: "denied",
      volunteer: "denied",
      viewer: "denied",
    },
  },
  {
    id: "view_reports",
    label: "View reports",
    levels: {
      owner: "allowed",
      president: "allowed",
      vp: "allowed",
      chair: "limited",
      volunteer: "limited",
      viewer: "limited",
    },
  },
  {
    id: "manage_billing",
    label: "Manage billing",
    levels: {
      owner: "allowed",
      president: "limited",
      vp: "denied",
      chair: "denied",
      volunteer: "denied",
      viewer: "denied",
    },
  },
  {
    id: "ai_brain",
    label: "AI Brain settings",
    levels: {
      owner: "allowed",
      president: "allowed",
      vp: "limited",
      chair: "denied",
      volunteer: "denied",
      viewer: "denied",
    },
  },
];

export const BUILT_IN_ROLES = [
  {
    id: "owner",
    name: "Owner",
    description: "Full workspace control including billing and team management.",
    template: "owner",
  },
  {
    id: "president",
    name: "President",
    description: "Leads the board and approves major communications.",
    template: "president",
  },
  {
    id: "vp",
    name: "VP",
    description: "Oversees committees and manages VP-level communications.",
    template: "vp",
  },
  {
    id: "chair",
    name: "Committee Chair",
    description: "Leads a committee and drafts campaign communications.",
    template: "chair",
  },
  {
    id: "co_chair",
    name: "Committee Co-Chair",
    description: "Supports the chair and shares committee responsibilities.",
    template: "chair",
  },
  {
    id: "volunteer",
    name: "Volunteer",
    description: "Contributes to tasks and drafts within assigned committees.",
    template: "volunteer",
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access to campaigns and reports.",
    template: "viewer",
  },
] as const;
