import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AiCreditLedgerEntry = {
  id: string;
  entryType: string;
  amount: number;
  bucket: string | null;
  periodYm: string;
  note: string | null;
  createdAt: string;
};

/**
 * Recent AI credit ledger activity for the signed-in member's org.
 * Uses the normal (non-admin) Supabase client so RLS applies —
 * organization_ai_credit_ledger is member-readable via
 * private.is_active_org_member(organization_id).
 */
export async function getOrgAiCreditLedgerRecent(
  orgId: string,
  limit = 20,
): Promise<AiCreditLedgerEntry[]> {
  const trimmed = orgId?.trim();
  if (!trimmed) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_ai_credit_ledger")
    .select("id, entry_type, amount, bucket, period_ym, note, created_at")
    .eq("organization_id", trimmed)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code !== "42P01") {
      console.error("[ai-credit-ledger] recent read failed:", error.message);
    }
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    entryType: row.entry_type as string,
    amount: Number(row.amount) || 0,
    bucket: (row.bucket as string | null) ?? null,
    periodYm: (row.period_ym as string | null) ?? "",
    note: (row.note as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}
