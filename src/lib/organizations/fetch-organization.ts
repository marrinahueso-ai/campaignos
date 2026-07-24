import "server-only";

import { cache } from "react";
import { mapOrganizationRow } from "@/lib/organizations/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Organization, OrganizationRow } from "@/types";

/**
 * Per-request cached org-by-id. Shared by getCurrentOrganization and page loaders
 * so membership → org and direct by-id do not double-fetch.
 */
export const getOrganizationById = cache(
  async (id: string): Promise<Organization | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapOrganizationRow(data as OrganizationRow);
  },
);
