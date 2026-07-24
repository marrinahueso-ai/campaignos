"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeFilesLayout,
  type FilesLayout,
} from "@/lib/campaign-files/files-layout";

export async function saveFilesLayoutAction(
  layout: FilesLayout,
): Promise<{ success: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { success: false, error: "Not signed in." };
  }

  const normalized = normalizeFilesLayout(layout);
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .update({ files_layout: normalized })
    .eq("id", membership.user.id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    console.error("[files] failed to save layout:", error.message);
    return { success: false, error: "Could not save Files card layout." };
  }

  revalidatePath("/files");
  return { success: true };
}
