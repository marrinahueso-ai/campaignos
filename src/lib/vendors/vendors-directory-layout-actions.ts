"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeVendorsDirectoryLayout,
  type VendorsDirectoryLayout,
} from "@/lib/vendors/vendors-directory-layout";

export async function saveVendorsDirectoryLayoutAction(
  layout: VendorsDirectoryLayout,
): Promise<{ success: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { success: false, error: "Not signed in." };
  }

  const normalized = normalizeVendorsDirectoryLayout(layout);
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .update({ vendors_directory_layout: normalized })
    .eq("id", membership.user.id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    console.error(
      "[vendors] failed to save directory layout:",
      error.message,
    );
    return { success: false, error: "Could not save Vendor summary layout." };
  }

  revalidatePath("/vendors");
  return { success: true };
}
