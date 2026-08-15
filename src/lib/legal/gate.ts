import type { SupabaseClient } from "@supabase/supabase-js";
import { userMustAcceptCurrentTermsFromRows } from "@/lib/legal/acceptances-pure";
import { CURRENT_TERMS_VERSION, LEGAL_ACCEPTANCE_PATH } from "@/lib/legal/versions";

export { LEGAL_ACCEPTANCE_PATH, CURRENT_TERMS_VERSION };

/**
 * Whether this authenticated user must accept the current Terms before app access.
 * Lightweight for middleware. Fail-open if the table is missing (migration not applied).
 */
export async function userMustAcceptCurrentTerms(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("legal_acceptances")
    .select("version")
    .eq("user_id", userId)
    .eq("document_type", "terms");

  if (error) {
    if (error.code === "42P01") {
      return false;
    }
    console.error("legal acceptances gate query failed:", error.message);
    return false;
  }

  const versions = (data ?? []).map((row) => String(row.version ?? ""));
  return userMustAcceptCurrentTermsFromRows(versions, CURRENT_TERMS_VERSION);
}
