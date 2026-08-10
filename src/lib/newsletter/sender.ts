import "server-only";

import { resolveFromAddress } from "@/lib/email/send";
import { isValidEmailFormat, normalizeEmail } from "@/lib/newsletter/normalize-email";
import type {
  NewsletterSenderProfile,
  NewsletterSenderProfileRow,
} from "@/lib/newsletter/types";
import { createClient } from "@/lib/supabase/server";

export function mapSenderProfileRow(
  row: NewsletterSenderProfileRow,
): NewsletterSenderProfile {
  return {
    organizationId: row.organization_id,
    fromDisplayName: row.from_display_name,
    fromEmail: row.from_email,
    replyToEmail: row.reply_to_email,
    physicalAddressOverride: row.physical_address_override,
    resendDomainVerified: row.resend_domain_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/** Extracts the bare email address from a `Name <email>` or plain string. */
function extractEmailAddress(value: string): string | null {
  const angleMatch = value.match(/<([^<>]+)>/);
  const candidate = (angleMatch?.[1] ?? value).trim();
  return isValidEmailFormat(candidate) ? normalizeEmail(candidate) : null;
}

/** The org-wide default From address configured for Resend (env-controlled). */
export function resolveDefaultNewsletterFromEmail(): string | null {
  const raw =
    process.env.NEWSLETTER_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    resolveFromAddress();
  return raw ? extractEmailAddress(raw) : null;
}

/** Domain allowed for newsletter From addresses (derived from Resend config). */
export function resolveAllowedNewsletterFromDomain(): string | null {
  const email = resolveDefaultNewsletterFromEmail();
  if (!email) return null;
  const domain = email.split("@")[1]?.toLowerCase();
  return domain || null;
}

export interface NewsletterFromEmailValidation {
  ok: boolean;
  error?: string;
}

/**
 * A profile's From address must be well-formed and on the Resend-authorized
 * domain — orgs cannot set an arbitrary From address (anti-spoofing).
 */
export function validateNewsletterFromEmail(
  email: string,
): NewsletterFromEmailValidation {
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, error: "A From email address is required." };
  }
  if (!isValidEmailFormat(trimmed)) {
    return { ok: false, error: "From email address is not a valid email format." };
  }
  const allowedDomain = resolveAllowedNewsletterFromDomain();
  const domain = normalizeEmail(trimmed).split("@")[1];
  if (!allowedDomain || domain !== allowedDomain) {
    return {
      ok: false,
      error: allowedDomain
        ? `From email must use the authorized @${allowedDomain} domain.`
        : "No authorized sending domain is configured.",
    };
  }
  return { ok: true };
}

function defaultSenderProfileRow(
  organizationId: string,
): Omit<NewsletterSenderProfileRow, "created_at" | "updated_at"> {
  return {
    organization_id: organizationId,
    from_display_name: "",
    from_email: resolveDefaultNewsletterFromEmail() ?? "",
    reply_to_email: "",
    physical_address_override: null,
    resend_domain_verified: false,
    updated_by: null,
  };
}

/** Reads the org's sender profile, creating a default row on first access. */
export async function getOrCreateSenderProfile(
  organizationId: string,
): Promise<NewsletterSenderProfile> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("newsletter_sender_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existing) {
    return mapSenderProfileRow(existing as NewsletterSenderProfileRow);
  }

  const { data: inserted, error } = await supabase
    .from("newsletter_sender_profiles")
    .insert(defaultSenderProfileRow(organizationId))
    .select("*")
    .maybeSingle();

  if (inserted) {
    return mapSenderProfileRow(inserted as NewsletterSenderProfileRow);
  }

  // Race with a concurrent first-access insert — re-read.
  const { data: reread } = await supabase
    .from("newsletter_sender_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (reread) {
    return mapSenderProfileRow(reread as NewsletterSenderProfileRow);
  }

  if (error) {
    console.error("Failed to create newsletter sender profile:", error.message);
  }

  const fallback = defaultSenderProfileRow(organizationId);
  const now = new Date().toISOString();
  return mapSenderProfileRow({ ...fallback, created_at: now, updated_at: now });
}

export interface UpdateSenderProfileInput {
  organizationId: string;
  fromDisplayName?: string;
  fromEmail?: string;
  replyToEmail?: string;
  physicalAddressOverride?: string | null;
  updatedBy?: string | null;
}

export type UpdateSenderProfileResult =
  | { ok: true; profile: NewsletterSenderProfile }
  | { ok: false; error: string };

/** Updates the org sender profile. Validates From email domain/format. */
export async function updateSenderProfile(
  input: UpdateSenderProfileInput,
): Promise<UpdateSenderProfileResult> {
  if (input.fromEmail !== undefined) {
    const validation = validateNewsletterFromEmail(input.fromEmail);
    if (!validation.ok) {
      return { ok: false, error: validation.error ?? "Invalid From email." };
    }
  }
  if (input.replyToEmail !== undefined && input.replyToEmail.trim()) {
    if (!isValidEmailFormat(input.replyToEmail.trim())) {
      return { ok: false, error: "Reply-to email address is not valid." };
    }
  }

  await getOrCreateSenderProfile(input.organizationId);

  const supabase = await createClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.fromDisplayName !== undefined) {
    patch.from_display_name = input.fromDisplayName.trim();
  }
  if (input.fromEmail !== undefined) {
    patch.from_email = normalizeEmail(input.fromEmail);
  }
  if (input.replyToEmail !== undefined) {
    patch.reply_to_email = input.replyToEmail.trim()
      ? normalizeEmail(input.replyToEmail)
      : "";
  }
  if (input.physicalAddressOverride !== undefined) {
    patch.physical_address_override = input.physicalAddressOverride?.trim() || null;
  }
  if (input.updatedBy !== undefined) {
    patch.updated_by = input.updatedBy;
  }

  const { data, error } = await supabase
    .from("newsletter_sender_profiles")
    .update(patch)
    .eq("organization_id", input.organizationId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Unable to update sender profile.",
    };
  }

  return { ok: true, profile: mapSenderProfileRow(data as NewsletterSenderProfileRow) };
}

/**
 * Resolves the From address to actually send with. The requested address
 * (from the newsletter draft) MUST exactly match the org's authorized
 * sender profile — never an arbitrary caller-supplied address.
 */
export function resolveAuthorizedFromAddress(
  profile: NewsletterSenderProfile,
  requestedFromEmail?: string | null,
): { ok: true; email: string } | { ok: false; error: string } {
  const authorized = profile.fromEmail.trim();
  if (!authorized || !isValidEmailFormat(authorized)) {
    return { ok: false, error: "No authorized sender email is configured for this organization." };
  }

  if (requestedFromEmail && requestedFromEmail.trim()) {
    if (normalizeEmail(requestedFromEmail) !== normalizeEmail(authorized)) {
      return {
        ok: false,
        error: "The requested From address does not match the organization's authorized sender.",
      };
    }
  }

  return { ok: true, email: authorized };
}

/** Formats the RFC-5322 `Display Name <email>` string used with Resend. */
export function formatFromHeader(profile: NewsletterSenderProfile): string {
  const name = profile.fromDisplayName.trim();
  return name ? `${name} <${profile.fromEmail.trim()}>` : profile.fromEmail.trim();
}
