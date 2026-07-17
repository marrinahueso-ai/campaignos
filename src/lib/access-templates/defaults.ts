import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { isCampaignRole } from "@/lib/auth/campaign-roles";
import type {
  AccessTemplate,
  AccessTemplatePermissions,
  AccessPermissionKey,
} from "@/lib/access-templates/types";
import { ACCESS_PERMISSION_KEYS } from "@/lib/access-templates/types";

function perms(
  overrides: Partial<AccessTemplatePermissions>,
): AccessTemplatePermissions {
  const base: AccessTemplatePermissions = {
    view_all_events: true,
    view_assigned_events_only: false,
    draft_edit: false,
    submit_approval: false,
    approve_comms: false,
    publish_social: false,
    upload_artwork: false,
    manage_people: false,
    manage_billing: false,
    manage_integrations: false,
  };
  return { ...base, ...overrides };
}

/**
 * Defaults mirror today's hardcoded CampaignRole behavior so enabling the
 * templates UI does not change access until an org edits a toggle.
 */
export const DEFAULT_ACCESS_TEMPLATES: AccessTemplate[] = [
  {
    id: "admin",
    displayName: "Admin",
    description: "Full organization control, including people and integrations.",
    baseRole: "admin",
    isCustom: false,
    permissions: perms({
      view_all_events: true,
      draft_edit: true,
      submit_approval: true,
      approve_comms: true,
      publish_social: true,
      upload_artwork: true,
      manage_people: true,
      manage_billing: true,
      manage_integrations: true,
    }),
  },
  {
    id: "president",
    displayName: "President",
    description: "Organization leadership with people and approval access.",
    baseRole: "president",
    isCustom: false,
    permissions: perms({
      view_all_events: true,
      draft_edit: true,
      submit_approval: true,
      approve_comms: true,
      publish_social: true,
      upload_artwork: true,
      manage_people: true,
      manage_billing: true,
      manage_integrations: true,
    }),
  },
  {
    id: "vp_communications",
    displayName: "VP Communications",
    description: "Approves and publishes communications across events.",
    baseRole: "vp_communications",
    isCustom: false,
    permissions: perms({
      view_all_events: true,
      draft_edit: true,
      submit_approval: true,
      approve_comms: true,
      publish_social: true,
      upload_artwork: true,
    }),
  },
  {
    id: "committee_chair",
    displayName: "Event Lead",
    description: "Leads work on assigned events. Rename for your org type.",
    baseRole: "committee_chair",
    isCustom: false,
    permissions: perms({
      view_all_events: true,
      draft_edit: true,
      submit_approval: true,
      publish_social: true,
      upload_artwork: true,
    }),
  },
  {
    id: "contributor",
    displayName: "Contributor",
    description: "Drafts and submits work; can publish when allowed.",
    baseRole: "contributor",
    isCustom: false,
    permissions: perms({
      view_all_events: true,
      draft_edit: true,
      submit_approval: true,
      publish_social: true,
      upload_artwork: true,
    }),
  },
  {
    id: "view_only",
    displayName: "View Only",
    description: "Read access. Safe default for limited login seats.",
    baseRole: "view_only",
    isCustom: false,
    permissions: perms({
      view_all_events: true,
      view_assigned_events_only: false,
    }),
  },
  {
    id: "developer",
    displayName: "Developer",
    description: "Internal full-access seat for product support.",
    baseRole: "developer",
    isCustom: false,
    permissions: perms({
      view_all_events: true,
      draft_edit: true,
      submit_approval: true,
      approve_comms: true,
      publish_social: true,
      upload_artwork: true,
      manage_people: false,
      manage_billing: false,
      manage_integrations: false,
    }),
  },
  {
    id: "tester",
    displayName: "Tester",
    description: "Can draft and submit; cannot publish or manage org.",
    baseRole: "tester",
    isCustom: false,
    permissions: perms({
      view_all_events: true,
      draft_edit: true,
      submit_approval: true,
      publish_social: false,
      upload_artwork: false,
    }),
  },
];

export function getDefaultAccessTemplate(id: CampaignRole): AccessTemplate {
  return (
    DEFAULT_ACCESS_TEMPLATES.find((template) => template.id === id) ??
    DEFAULT_ACCESS_TEMPLATES.find((template) => template.id === "view_only")!
  );
}

export function emptyPermissions(): AccessTemplatePermissions {
  return perms({});
}

export function normalizePermissions(
  input: Partial<Record<string, boolean>> | null | undefined,
  fallback: AccessTemplatePermissions,
): AccessTemplatePermissions {
  const next = { ...fallback };
  if (!input) {
    return next;
  }
  for (const key of ACCESS_PERMISSION_KEYS) {
    if (typeof input[key] === "boolean") {
      next[key] = input[key]!;
    }
  }
  // Keep the two view modes coherent.
  if (next.view_assigned_events_only) {
    next.view_all_events = false;
  } else if (next.view_all_events) {
    next.view_assigned_events_only = false;
  }
  return next;
}

/** Admin/President cannot lose manage_people (prevents lockout). */
export function applySafetyLocks(
  templateId: string,
  permissions: AccessTemplatePermissions,
  baseRole?: CampaignRole,
): AccessTemplatePermissions {
  const lockRole = baseRole ?? (isCampaignRole(templateId) ? templateId : null);
  if (lockRole === "admin" || lockRole === "president") {
    return { ...permissions, manage_people: true };
  }
  return permissions;
}

export function isAccessPermissionKey(value: string): value is AccessPermissionKey {
  return (ACCESS_PERMISSION_KEYS as string[]).includes(value);
}

export function slugifyTemplateName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return slug || "role";
}

export function buildCustomTemplateId(displayName: string): string {
  const slug = slugifyTemplateName(displayName);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `custom_${slug}_${suffix}`;
}
