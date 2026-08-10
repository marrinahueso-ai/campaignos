import "server-only";

import {
  resolveContactReimportAction,
  type ExistingContactSnapshot,
} from "@/lib/newsletter/contact-reimport";
import { isValidEmailFormat, normalizeEmail } from "@/lib/newsletter/normalize-email";
import type {
  NewsletterContact,
  NewsletterContactRow,
  NewsletterContactStatus,
  NewsletterImportContactRow,
  NewsletterImportResult,
} from "@/lib/newsletter/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function mapContactRow(row: NewsletterContactRow): NewsletterContact {
  return {
    id: row.id,
    organizationId: row.organization_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    emailNormalized: row.email_normalized,
    status: row.status,
    source: row.source,
    consentAttestedAt: row.consent_attested_at,
    consentAttestedBy: row.consent_attested_by,
    consentNote: row.consent_note,
    importBatchId: row.import_batch_id,
    unsubscribedAt: row.unsubscribed_at,
    suppressedAt: row.suppressed_at,
    suppressionReason: row.suppression_reason,
    addedAt: row.added_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ListNewsletterContactsOptions {
  status?: NewsletterContactStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listNewsletterContacts(
  organizationId: string,
  options: ListNewsletterContactsOptions = {},
): Promise<NewsletterContact[]> {
  const supabase = await createClient();
  let query = supabase
    .from("newsletter_contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("added_at", { ascending: false });

  if (options.status) {
    query = query.eq("status", options.status);
  }
  const search = options.search?.trim();
  if (search) {
    query = query.or(
      `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`,
    );
  }
  if (typeof options.limit === "number") {
    const from = options.offset ?? 0;
    query = query.range(from, from + options.limit - 1);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to list newsletter contacts:", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapContactRow(row as NewsletterContactRow));
}

export async function getNewsletterContactByEmail(
  organizationId: string,
  email: string,
): Promise<NewsletterContact | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsletter_contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("email_normalized", normalizeEmail(email))
    .maybeSingle();
  return data ? mapContactRow(data as NewsletterContactRow) : null;
}

export type AddNewsletterContactResult =
  | { ok: true; contact: NewsletterContact; created: boolean }
  | { ok: false; error: string };

export interface AddNewsletterContactInput {
  organizationId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  consentNote?: string | null;
  actorUserId?: string | null;
}

/** Manual "add contact" — never reactivates a locked (unsubscribed/etc.) contact. */
export async function addNewsletterContact(
  input: AddNewsletterContactInput,
): Promise<AddNewsletterContactResult> {
  const trimmedEmail = input.email.trim();
  if (!isValidEmailFormat(trimmedEmail)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const emailNormalized = normalizeEmail(trimmedEmail);
  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";

  const supabase = await createClient();
  const { data: existingRow } = await supabase
    .from("newsletter_contacts")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("email_normalized", emailNormalized)
    .maybeSingle();

  const existing = existingRow
    ? mapContactRow(existingRow as NewsletterContactRow)
    : null;
  const existingSnapshot: ExistingContactSnapshot | null = existing
    ? { status: existing.status, firstName: existing.firstName, lastName: existing.lastName }
    : null;

  const action = resolveContactReimportAction(existingSnapshot, {
    firstName,
    lastName,
  });

  if (action.kind === "create") {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("newsletter_contacts")
      .insert({
        organization_id: input.organizationId,
        first_name: firstName,
        last_name: lastName,
        email: trimmedEmail,
        email_normalized: emailNormalized,
        status: "active",
        source: "manual",
        consent_attested_at: now,
        consent_attested_by: input.actorUserId ?? null,
        consent_note: input.consentNote?.trim() || null,
        added_at: now,
      })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Unable to add contact." };
    }
    return { ok: true, contact: mapContactRow(data as NewsletterContactRow), created: true };
  }

  if (!existing) {
    return { ok: false, error: "Unable to resolve existing contact." };
  }

  if (action.kind === "noop") {
    return { ok: true, contact: existing, created: false };
  }

  // "update_active" or "keep_locked" both only touch name fields — status
  // is either already active or intentionally left alone.
  const { data, error } = await supabase
    .from("newsletter_contacts")
    .update({
      first_name: action.firstName,
      last_name: action.lastName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Unable to update contact." };
  }
  return { ok: true, contact: mapContactRow(data as NewsletterContactRow), created: false };
}

export interface ImportNewsletterContactsCsvInput {
  organizationId: string;
  rows: NewsletterImportContactRow[];
  filename?: string | null;
  importedBy?: string | null;
  /** Required: the importer attests they have authorization to email these contacts. */
  attested: boolean;
}

/**
 * CSV import with attestation. Locked-status contacts (unsubscribed,
 * suppressed, bounced, complained) are NEVER reactivated — only their name
 * fields may be refreshed.
 */
export async function importNewsletterContactsCsvRows(
  input: ImportNewsletterContactsCsvInput,
): Promise<NewsletterImportResult> {
  if (!input.attested) {
    return {
      batchId: null,
      rowCount: input.rows.length,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: input.rows.length,
      suppressedSkippedCount: 0,
      errors: ["You must attest you're authorized to email these contacts before importing."],
    };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: batch, error: batchError } = await supabase
    .from("newsletter_import_batches")
    .insert({
      organization_id: input.organizationId,
      filename: input.filename?.trim() || null,
      imported_by: input.importedBy ?? null,
      row_count: input.rows.length,
      authorization_attested: true,
      authorization_attested_at: now,
    })
    .select("id")
    .maybeSingle();

  if (batchError || !batch?.id) {
    return {
      batchId: null,
      rowCount: input.rows.length,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: input.rows.length,
      suppressedSkippedCount: 0,
      errors: [batchError?.message ?? "Unable to start import batch."],
    };
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let suppressedSkippedCount = 0;
  const errors: string[] = [];
  const seenInBatch = new Set<string>();

  for (const row of input.rows) {
    const trimmedEmail = row.email?.trim() ?? "";
    if (!isValidEmailFormat(trimmedEmail)) {
      skippedCount += 1;
      errors.push(`Skipped invalid email: "${trimmedEmail || "(blank)"}"`);
      continue;
    }
    const emailNormalized = normalizeEmail(trimmedEmail);
    if (seenInBatch.has(emailNormalized)) {
      skippedCount += 1;
      continue;
    }
    seenInBatch.add(emailNormalized);

    const firstName = row.firstName?.trim() ?? "";
    const lastName = row.lastName?.trim() ?? "";

    const { data: existingRow } = await supabase
      .from("newsletter_contacts")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("email_normalized", emailNormalized)
      .maybeSingle();

    const existing = existingRow
      ? mapContactRow(existingRow as NewsletterContactRow)
      : null;
    const action = resolveContactReimportAction(
      existing
        ? { status: existing.status, firstName: existing.firstName, lastName: existing.lastName }
        : null,
      { firstName, lastName },
    );

    if (action.kind === "create") {
      const { error } = await supabase.from("newsletter_contacts").insert({
        organization_id: input.organizationId,
        first_name: firstName,
        last_name: lastName,
        email: trimmedEmail,
        email_normalized: emailNormalized,
        status: "active",
        source: "csv_import",
        consent_attested_at: now,
        consent_attested_by: input.importedBy ?? null,
        import_batch_id: batch.id,
        added_at: now,
      });
      if (error) {
        skippedCount += 1;
        errors.push(`Failed to import ${trimmedEmail}: ${error.message}`);
      } else {
        createdCount += 1;
      }
      continue;
    }

    if (!existing) {
      skippedCount += 1;
      continue;
    }

    if (action.kind === "keep_locked") {
      suppressedSkippedCount += 1;
      // Status is never touched — only refresh name fields if they changed.
      if (action.firstName !== existing.firstName || action.lastName !== existing.lastName) {
        await supabase
          .from("newsletter_contacts")
          .update({
            first_name: action.firstName,
            last_name: action.lastName,
            updated_at: now,
          })
          .eq("id", existing.id);
      }
      continue;
    }

    if (action.kind === "update_active") {
      const { error } = await supabase
        .from("newsletter_contacts")
        .update({
          first_name: action.firstName,
          last_name: action.lastName,
          updated_at: now,
        })
        .eq("id", existing.id);
      if (error) {
        skippedCount += 1;
        errors.push(`Failed to update ${trimmedEmail}: ${error.message}`);
      } else {
        updatedCount += 1;
      }
    }
    // "noop" — nothing to do.
  }

  await supabase
    .from("newsletter_import_batches")
    .update({
      created_count: createdCount,
      updated_count: updatedCount,
      skipped_count: skippedCount,
      suppressed_skipped_count: suppressedSkippedCount,
    })
    .eq("id", batch.id);

  return {
    batchId: batch.id,
    rowCount: input.rows.length,
    createdCount,
    updatedCount,
    skippedCount,
    suppressedSkippedCount,
    errors,
  };
}

/**
 * Marks a contact suppressed/bounced/complained/unsubscribed. Used by the
 * Resend webhook (service role — no signed-in user) and by unsubscribe
 * redemption. Never reverses a more restrictive existing status.
 */
export async function suppressNewsletterContact(input: {
  organizationId: string;
  contactId: string;
  status: Extract<
    NewsletterContactStatus,
    "unsubscribed" | "suppressed" | "bounced" | "complained"
  >;
  reason?: string | null;
  useAdminClient?: boolean;
}): Promise<void> {
  const supabase = input.useAdminClient ? createAdminClient() : await createClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: now,
  };
  if (input.status === "unsubscribed") {
    patch.unsubscribed_at = now;
  } else {
    patch.suppressed_at = now;
    patch.suppression_reason = input.reason?.trim() || input.status;
  }

  const { error } = await supabase
    .from("newsletter_contacts")
    .update(patch)
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId);

  if (error) {
    console.error("Failed to suppress newsletter contact:", error.message);
  }
}
