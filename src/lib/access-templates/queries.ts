import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { DEFAULT_ACCESS_TEMPLATES } from "@/lib/access-templates/defaults";
import { mergeAccessTemplates } from "@/lib/access-templates/merge";
import type { AccessTemplate, AccessTemplateRow } from "@/lib/access-templates/types";

export const getOrganizationAccessTemplates = cache(
  async function getOrganizationAccessTemplates(
    organizationId: string,
  ): Promise<AccessTemplate[]> {
    if (!organizationId) {
      return DEFAULT_ACCESS_TEMPLATES;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_access_templates")
      .select(
        "organization_id, template_id, display_name, description, permissions, base_role, updated_at",
      )
      .eq("organization_id", organizationId);

    if (error) {
      if (isMissingSchemaError(error)) {
        return DEFAULT_ACCESS_TEMPLATES;
      }
      // Older schema without base_role — retry without that column.
      if (error.message?.includes("base_role")) {
        const fallback = await supabase
          .from("organization_access_templates")
          .select(
            "organization_id, template_id, display_name, description, permissions, updated_at",
          )
          .eq("organization_id", organizationId);
        if (fallback.error) {
          console.error("Failed to load access templates:", fallback.error.message);
          return DEFAULT_ACCESS_TEMPLATES;
        }
        return mergeAccessTemplates((fallback.data ?? []) as AccessTemplateRow[]);
      }
      console.error("Failed to load access templates:", error.message);
      return DEFAULT_ACCESS_TEMPLATES;
    }

    return mergeAccessTemplates((data ?? []) as AccessTemplateRow[]);
  },
);
