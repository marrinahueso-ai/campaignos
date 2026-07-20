import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import {
  applySafetyLocks,
  getDefaultAccessTemplate,
  normalizePermissions,
} from "@/lib/access-templates/defaults";
import type { AccessTemplate } from "@/lib/access-templates/types";
import { isCustomAccessTemplateId } from "@/lib/access-templates/types";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import { isCampaignRole } from "@/lib/auth/campaign-roles";

export async function upsertOrganizationAccessTemplate(input: {
  organizationId: string;
  template: AccessTemplate;
}): Promise<{ error: string } | { success: true }> {
  const baseRole: CampaignRole = isCampaignRole(input.template.baseRole)
    ? input.template.baseRole
    : "contributor";
  const defaults = getDefaultAccessTemplate(
    isCampaignRole(input.template.id) ? input.template.id : baseRole,
  );
  const permissions = applySafetyLocks(
    input.template.id,
    normalizePermissions(input.template.permissions, defaults.permissions),
    baseRole,
  );
  const displayName = input.template.displayName.trim();
  if (!displayName) {
    return { error: "Display name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("organization_access_templates").upsert(
    {
      organization_id: input.organizationId,
      template_id: input.template.id,
      display_name: displayName,
      description: input.template.description.trim() || defaults.description,
      permissions,
      base_role: baseRole,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,template_id" },
  );

  if (error) {
    if (isMissingSchemaError(error)) {
      return {
        error:
          "Access templates table is missing. Apply migration organization_access_templates.",
      };
    }
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteOrganizationAccessTemplate(input: {
  organizationId: string;
  templateId: string;
}): Promise<{ error: string } | { success: true }> {
  if (!isCustomAccessTemplateId(input.templateId)) {
    return { error: "Built-in templates cannot be deleted. Rename them instead." };
  }

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("organization_users")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("access_template_id", input.templateId);

  if (countError && !isMissingSchemaError(countError)) {
    // Column may not exist yet — allow delete.
    if (!countError.message?.includes("access_template_id")) {
      return { error: countError.message };
    }
  } else if ((count ?? 0) > 0) {
    return {
      error:
        "This role is assigned to people. Reassign them first, then delete the template.",
    };
  }

  const { error } = await supabase
    .from("organization_access_templates")
    .delete()
    .eq("organization_id", input.organizationId)
    .eq("template_id", input.templateId);

  if (error) {
    if (isMissingSchemaError(error)) {
      return { error: "Access templates table is missing." };
    }
    return { error: error.message };
  }

  return { success: true };
}
