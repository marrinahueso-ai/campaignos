import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  defaultVendorsDirectoryLayout,
  normalizeVendorsDirectoryLayout,
  type VendorsDirectoryLayout,
} from "@/lib/vendors/vendors-directory-layout";

export async function getVendorsDirectoryLayoutForCurrentUser(): Promise<VendorsDirectoryLayout> {
  const membership = await getActiveMembership();
  if (!membership) {
    return defaultVendorsDirectoryLayout();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select("vendors_directory_layout")
    .eq("id", membership.user.id)
    .maybeSingle();

  if (error) {
    if (
      error.code === "42703" ||
      error.message.includes("vendors_directory_layout")
    ) {
      return defaultVendorsDirectoryLayout();
    }
    console.error(
      "[vendors] failed to load directory layout:",
      error.message,
    );
    return defaultVendorsDirectoryLayout();
  }

  return normalizeVendorsDirectoryLayout(
    (data as { vendors_directory_layout?: unknown } | null)
      ?.vendors_directory_layout,
  );
}
