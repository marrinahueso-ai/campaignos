import type {
  AccessPermissionKey,
  AccessTemplatePermissions,
} from "@/lib/access-templates/types";
import { emptyPermissions } from "@/lib/access-templates/defaults";

/** UX Pilot–friendly event access modes → permission flags. */
export type EventAccessMode = "all" | "mixed" | "assigned";

export const EVENT_ACCESS_MODE_OPTIONS: Array<{
  value: EventAccessMode;
  title: string;
  description: string;
}> = [
  {
    value: "all",
    title: "ALL EVENTS",
    description: "Can see and work on every event.",
  },
  {
    value: "mixed",
    title: "SEE ALL, WORK ON ASSIGNED",
    description:
      "Can see every event but can only make changes to events assigned to them.",
  },
  {
    value: "assigned",
    title: "ASSIGNED EVENTS ONLY",
    description: "Can only see and work on events assigned to them.",
  },
];

export function eventAccessModeLabel(mode: EventAccessMode): string {
  switch (mode) {
    case "all":
      return "All events";
    case "mixed":
      return "See all, work on assigned";
    case "assigned":
      return "Assigned events only";
  }
}

export function deriveEventAccessMode(
  permissions: Pick<
    AccessTemplatePermissions,
    | "view_all_events"
    | "view_assigned_events_only"
    | "access_assigned_events_only"
  >,
): EventAccessMode {
  if (permissions.view_assigned_events_only) {
    return "assigned";
  }
  if (permissions.access_assigned_events_only) {
    return "mixed";
  }
  return "all";
}

export function applyEventAccessMode(
  permissions: AccessTemplatePermissions,
  mode: EventAccessMode,
): AccessTemplatePermissions {
  const next = { ...permissions };
  if (mode === "all") {
    next.view_all_events = true;
    next.view_assigned_events_only = false;
    next.access_assigned_events_only = false;
  } else if (mode === "mixed") {
    next.view_all_events = true;
    next.view_assigned_events_only = false;
    next.access_assigned_events_only = true;
  } else {
    next.view_all_events = false;
    next.view_assigned_events_only = true;
    next.access_assigned_events_only = true;
  }
  return next;
}

export function buildPermissionsFromCreateRoleForm(input: {
  eventMode: EventAccessMode;
  draftEdit: boolean;
  submitApproval: boolean;
  approveComms: boolean;
  publishSocial: boolean;
  uploadArtwork: boolean;
  managePeople: boolean;
  manageBilling: boolean;
  manageIntegrations: boolean;
}): AccessTemplatePermissions {
  const base = emptyPermissions();
  const withEvents = applyEventAccessMode(base, input.eventMode);
  return {
    ...withEvents,
    draft_edit: input.draftEdit,
    submit_approval: input.submitApproval,
    approve_comms: input.approveComms,
    publish_social: input.publishSocial,
    upload_artwork: input.uploadArtwork,
    manage_people: input.managePeople,
    manage_billing: input.manageBilling,
    manage_integrations: input.manageIntegrations,
  };
}

export const CREATE_ROLE_COMM_KEYS: Array<{
  key: AccessPermissionKey;
  label: string;
  description: string;
}> = [
  {
    key: "draft_edit",
    label: "Draft & edit",
    description: "Create and edit communication drafts.",
  },
  {
    key: "submit_approval",
    label: "Submit for approval",
    description: "Send content to an approver.",
  },
  {
    key: "approve_comms",
    label: "Approve communications",
    description: "Approve content or request changes.",
  },
  {
    key: "publish_social",
    label: "Publish / schedule",
    description: "Publish or schedule approved content.",
  },
  {
    key: "upload_artwork",
    label: "Upload artwork",
    description: "Upload and manage artwork.",
  },
];

export const CREATE_ROLE_ADMIN_KEYS: Array<{
  key: AccessPermissionKey;
  label: string;
  description: string;
}> = [
  {
    key: "manage_people",
    label: "Manage people",
    description: "Invite members and manage team access.",
  },
  {
    key: "manage_billing",
    label: "Manage billing",
    description: "View and manage billing and plan information.",
  },
  {
    key: "manage_integrations",
    label: "Manage integrations",
    description: "Connect and manage organization integrations.",
  },
];

export function isAssignedOnlyAccess(
  permissions: Pick<
    AccessTemplatePermissions,
    "view_assigned_events_only" | "access_assigned_events_only"
  >,
): boolean {
  return (
    permissions.view_assigned_events_only ||
    permissions.access_assigned_events_only
  );
}
