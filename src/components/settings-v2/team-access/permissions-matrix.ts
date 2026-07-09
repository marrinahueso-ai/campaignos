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
    id: "view_dashboard",
    label: "View dashboard",
    levels: {
      owner: "allowed",
      president: "allowed",
      vp: "allowed",
      chair: "allowed",
      volunteer: "allowed",
      viewer: "allowed",
    },
  },
  {
    id: "create_edit_campaigns",
    label: "Create / edit campaigns",
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
    id: "create_assign_tasks",
    label: "Create / assign tasks",
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
    id: "approve_comms",
    label: "Approve / request changes communications",
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
    id: "publish_comms",
    label: "Schedule / publish posts",
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
    id: "manage_committee",
    label: "Manage committee",
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
    id: "manage_members",
    label: "Invite members",
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
    id: "view_insights",
    label: "View insights",
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
    label: "Edit AI Brain",
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
    id: "inbox_ai",
    label: "Edit Inbox AI",
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
    id: "edit_playbooks",
    label: "Edit playbooks",
    levels: {
      owner: "allowed",
      president: "allowed",
      vp: "allowed",
      chair: "limited",
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
