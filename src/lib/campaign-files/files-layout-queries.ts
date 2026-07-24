import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  defaultFilesLayout,
  normalizeFilesLayout,
  type FilesLayout,
} from "@/lib/campaign-files/files-layout";

export async function getFilesLayoutForCurrentUser(): Promise<FilesLayout> {
  const membership = await getActiveMembership();
  if (!membership) {
    return defaultFilesLayout();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select("files_layout")
    .eq("id", membership.user.id)
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || error.message.includes("files_layout")) {
      return defaultFilesLayout();
    }
    console.error("[files] failed to load layout:", error.message);
    return defaultFilesLayout();
  }

  return normalizeFilesLayout(
    (data as { files_layout?: unknown } | null)?.files_layout,
  );
}
