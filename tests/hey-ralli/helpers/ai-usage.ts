import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AiUsageCount = {
  total: number;
  artwork: number;
};

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for AI usage smoke (load via .env.local).",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasAiUsageAdminCredentials(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

/** Count durable AI warehouse rows (optionally since an ISO timestamp). */
export async function countAiUsageLog(sinceIso?: string): Promise<AiUsageCount> {
  const admin = adminClient();

  let totalQuery = admin
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true });
  let artworkQuery = admin
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .or(
      "action_type.eq.generate_artwork,action_type.eq.orchestrate_artwork,feature.ilike.artwork%",
    );

  if (sinceIso) {
    totalQuery = totalQuery.gte("created_at", sinceIso);
    artworkQuery = artworkQuery.gte("created_at", sinceIso);
  }

  const [totalRes, artworkRes] = await Promise.all([totalQuery, artworkQuery]);

  if (totalRes.error) {
    throw new Error(`ai_usage_log total count failed: ${totalRes.error.message}`);
  }
  if (artworkRes.error) {
    throw new Error(
      `ai_usage_log artwork count failed: ${artworkRes.error.message}`,
    );
  }

  return {
    total: totalRes.count ?? 0,
    artwork: artworkRes.count ?? 0,
  };
}

/** Poll until all-time warehouse counts exceed baseline. */
export async function waitForAiUsageIncrease(input: {
  baseline: AiUsageCount;
  timeoutMs?: number;
  pollMs?: number;
}): Promise<AiUsageCount> {
  const timeoutMs = input.timeoutMs ?? 12 * 60 * 1000;
  const pollMs = input.pollMs ?? 5_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const current = await countAiUsageLog();
    if (
      current.artwork > input.baseline.artwork ||
      current.total > input.baseline.total
    ) {
      return current;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  const finalCount = await countAiUsageLog();
  throw new Error(
    `AI usage did not increase within ${timeoutMs}ms. baseline=${JSON.stringify(input.baseline)} final=${JSON.stringify(finalCount)}`,
  );
}
