import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Published Meta slots with external_post_id — used for posting-time heatmap. */
export async function fetchPublishedPostTimestamps(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meta_publication_slots")
    .select("published_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .not("external_post_id", "is", null);

  if (error) {
    console.error("Failed to fetch published post history:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => row.published_at as string)
    .filter(Boolean);
}
