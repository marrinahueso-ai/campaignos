import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { isCampaignRole } from "@/lib/auth/campaign-roles";
import {
  applySafetyLocks,
  DEFAULT_ACCESS_TEMPLATES,
  getDefaultAccessTemplate,
  normalizePermissions,
} from "@/lib/access-templates/defaults";
import type {
  AccessTemplate,
  AccessTemplateRow,
  AccessPermissionKey,
} from "@/lib/access-templates/types";
import { isCustomAccessTemplateId } from "@/lib/access-templates/types";

function resolveBaseRole(
  templateId: string,
  rowBaseRole: string | null | undefined,
  fallback: CampaignRole,
): CampaignRole {
  if (rowBaseRole && isCampaignRole(rowBaseRole)) {
    return rowBaseRole;
  }
  if (isCampaignRole(templateId)) {
    return templateId;
  }
  return fallback;
}

export function mergeAccessTemplates(
  rows: AccessTemplateRow[] | null | undefined,
): AccessTemplate[] {
  const byId = new Map<string, AccessTemplateRow>();
  for (const row of rows ?? []) {
    byId.set(row.template_id, row);
  }

  const system = DEFAULT_ACCESS_TEMPLATES.map((defaults) => {
    const row = byId.get(defaults.id);
    if (!row) {
      return defaults;
    }

    const baseRole = resolveBaseRole(defaults.id, row.base_role, defaults.baseRole);
    const permissions = applySafetyLocks(
      defaults.id,
      normalizePermissions(row.permissions, defaults.permissions),
      baseRole,
    );

    return {
      id: defaults.id,
      displayName: row.display_name.trim() || defaults.displayName,
      description: row.description?.trim() || defaults.description,
      permissions,
      baseRole,
      isCustom: false,
    };
  });

  const custom: AccessTemplate[] = [];
  for (const row of rows ?? []) {
    if (!isCustomAccessTemplateId(row.template_id)) {
      continue;
    }
    const baseRole = resolveBaseRole(row.template_id, row.base_role, "contributor");
    const fallback = getDefaultAccessTemplate(baseRole);
    custom.push({
      id: row.template_id,
      displayName: row.display_name.trim() || "Custom role",
      description: row.description?.trim() || fallback.description,
      permissions: applySafetyLocks(
        row.template_id,
        normalizePermissions(row.permissions, fallback.permissions),
        baseRole,
      ),
      baseRole,
      isCustom: true,
    });
  }

  custom.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return [...system, ...custom];
}

export function accessTemplateLabel(
  role: string,
  templates: AccessTemplate[],
): string {
  return (
    templates.find((template) => template.id === role)?.displayName ??
    (isCampaignRole(role)
      ? getDefaultAccessTemplate(role).displayName
      : role)
  );
}

export function accessTemplateLabelMap(
  templates: AccessTemplate[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const template of templates) {
    map[template.id] = template.displayName;
  }
  return map;
}

export function findAccessTemplate(
  templates: AccessTemplate[],
  templateId: string | null | undefined,
): AccessTemplate | null {
  if (!templateId) {
    return null;
  }
  return templates.find((template) => template.id === templateId) ?? null;
}

export function resolveAccessTemplateSelection(
  templates: AccessTemplate[],
  selectedId: string,
): { templateId: string; campaignRole: CampaignRole } | null {
  const template = findAccessTemplate(templates, selectedId);
  if (template) {
    return { templateId: template.id, campaignRole: template.baseRole };
  }
  if (isCampaignRole(selectedId)) {
    return { templateId: selectedId, campaignRole: selectedId };
  }
  return null;
}

export function hasAccessPermission(
  templates: AccessTemplate[],
  role: CampaignRole,
  key: AccessPermissionKey,
): boolean {
  const template =
    templates.find((entry) => entry.id === role) ?? getDefaultAccessTemplate(role);
  return Boolean(template.permissions[key]);
}

export function parseTemplateId(value: string): string | null {
  if (isCampaignRole(value) || isCustomAccessTemplateId(value)) {
    return value;
  }
  return null;
}
