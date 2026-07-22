import "server-only";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { SEED_DEVELOPER_AGREEMENTS } from "@/lib/developer-agreements/seed-content";

/**
 * Idempotent: inserts NDA + IP templates when the documents table is empty.
 * Requires service role (run from owner manage page or first agreements load).
 */
export async function ensureDeveloperAgreementsSeeded(): Promise<{
  ok: boolean;
  seeded: boolean;
  message?: string;
}> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      seeded: false,
      message: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
    };
  }

  const admin = createAdminClient();
  const { count, error: countError } = await admin
    .from("developer_agreement_documents")
    .select("id", { count: "exact", head: true });

  if (countError) {
    return {
      ok: false,
      seeded: false,
      message: countError.message,
    };
  }

  if ((count ?? 0) > 0) {
    return { ok: true, seeded: false };
  }

  for (const seed of SEED_DEVELOPER_AGREEMENTS) {
    const { data: document, error: docError } = await admin
      .from("developer_agreement_documents")
      .insert({
        slug: seed.slug,
        title: seed.title,
        description: seed.description,
        document_number: seed.documentNumber,
        sort_order: seed.sortOrder,
        required_for_roles: ["developer"],
        is_active: true,
      })
      .select("id")
      .single();

    if (docError || !document) {
      return {
        ok: false,
        seeded: false,
        message: docError?.message ?? "Failed to insert agreement document.",
      };
    }

    const { data: version, error: versionError } = await admin
      .from("developer_agreement_versions")
      .insert({
        document_id: document.id,
        version_label: seed.versionLabel,
        body_html: seed.bodyHtml,
        source_filename: `${seed.slug}-v1.docx`,
        is_published: true,
        effective_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (versionError || !version) {
      return {
        ok: false,
        seeded: false,
        message: versionError?.message ?? "Failed to insert agreement version.",
      };
    }

    const { error: linkError } = await admin
      .from("developer_agreement_documents")
      .update({
        current_version_id: version.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id);

    if (linkError) {
      return {
        ok: false,
        seeded: false,
        message: linkError.message,
      };
    }
  }

  return { ok: true, seeded: true };
}
