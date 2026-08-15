import "server-only";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { buildLegalAcceptanceInserts } from "@/lib/legal/acceptances-pure";
import type { LegalAcceptanceSource } from "@/lib/legal/versions";

export type RecordLegalAcceptanceResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Append-only insert of current Terms + Privacy versions for the session user.
 * Uses the service role so clients cannot spoof user_id or edit history.
 * Unique (user_id, document_type, version) keeps history and ignores duplicates.
 */
export async function recordCurrentLegalAcceptance(input: {
  sessionUserId: string;
  requestedUserId?: string | null;
  source: LegalAcceptanceSource;
}): Promise<RecordLegalAcceptanceResult> {
  const rows = buildLegalAcceptanceInserts(input);
  if (!rows.length) {
    return { ok: false, error: "Missing authenticated user." };
  }

  if (!isSupabaseAdminConfigured()) {
    console.error("[legal] admin client not configured; cannot record acceptance");
    return { ok: false, error: "Could not record acceptance." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("legal_acceptances").upsert(rows, {
    onConflict: "user_id,document_type,version",
    ignoreDuplicates: true,
  });

  if (error) {
    if (error.code === "42P01") {
      console.warn("[legal] legal_acceptances table missing; apply migration");
      return { ok: false, error: "Acceptance storage is not available yet." };
    }
    console.error("[legal] record acceptance failed:", error.message);
    return { ok: false, error: "Could not record acceptance." };
  }

  return { ok: true };
}
