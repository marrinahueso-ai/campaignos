import "server-only";

import {
  computeEligibilityFromContacts,
  type EligibilityContactInput,
} from "@/lib/newsletter/audience-eligibility";
import type {
  NewsletterAudience,
  NewsletterAudienceEligibility,
  NewsletterAudienceRow,
  NewsletterContactRow,
} from "@/lib/newsletter/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase's inferred type for an embedded relation varies (single object vs.
 * array) depending on whether FK cardinality was detected from generated
 * types, which this project doesn't have for the newsletter tables yet.
 * Normalize defensively rather than trusting either shape.
 */
export function extractJoinedContact(row: unknown): NewsletterContactRow | null {
  const joined = (row as { newsletter_contacts?: unknown } | null)?.newsletter_contacts;
  if (!joined) return null;
  if (Array.isArray(joined)) {
    return (joined[0] as NewsletterContactRow | undefined) ?? null;
  }
  return joined as NewsletterContactRow;
}

export function mapAudienceRow(row: NewsletterAudienceRow): NewsletterAudience {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listNewsletterAudiences(
  organizationId: string,
): Promise<NewsletterAudience[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("newsletter_audiences")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to list newsletter audiences:", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapAudienceRow(row as NewsletterAudienceRow));
}

export async function getNewsletterAudienceById(
  organizationId: string,
  audienceId: string,
): Promise<NewsletterAudience | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsletter_audiences")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", audienceId)
    .maybeSingle();
  return data ? mapAudienceRow(data as NewsletterAudienceRow) : null;
}

export type CreateNewsletterAudienceResult =
  | { ok: true; audience: NewsletterAudience }
  | { ok: false; error: string };

export async function createNewsletterAudience(input: {
  organizationId: string;
  name: string;
  description?: string | null;
  createdBy?: string | null;
}): Promise<CreateNewsletterAudienceResult> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Audience name is required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("newsletter_audiences")
    .insert({
      organization_id: input.organizationId,
      name,
      description: input.description?.trim() || null,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .maybeSingle();

  if (error?.code === "23505") {
    return { ok: false, error: `An audience named "${name}" already exists.` };
  }
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Unable to create audience." };
  }

  return { ok: true, audience: mapAudienceRow(data as NewsletterAudienceRow) };
}

export async function addNewsletterAudienceMembers(input: {
  organizationId: string;
  audienceId: string;
  contactIds: string[];
}): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const contactIds = Array.from(new Set(input.contactIds)).filter(Boolean);
  if (contactIds.length === 0) {
    return { ok: true, added: 0 };
  }

  const supabase = await createClient();
  const rows = contactIds.map((contactId) => ({
    audience_id: input.audienceId,
    contact_id: contactId,
    organization_id: input.organizationId,
  }));

  const { error, count } = await supabase
    .from("newsletter_audience_members")
    .upsert(rows, { onConflict: "audience_id,contact_id", ignoreDuplicates: true, count: "exact" });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, added: count ?? contactIds.length };
}

export async function removeNewsletterAudienceMembers(input: {
  organizationId: string;
  audienceId: string;
  contactIds: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.contactIds.length === 0) {
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletter_audience_members")
    .delete()
    .eq("organization_id", input.organizationId)
    .eq("audience_id", input.audienceId)
    .in("contact_id", input.contactIds);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function listNewsletterAudienceMemberIds(
  organizationId: string,
  audienceId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("newsletter_audience_members")
    .select("contact_id")
    .eq("organization_id", organizationId)
    .eq("audience_id", audienceId);

  if (error) {
    console.error("Failed to list newsletter audience members:", error.message);
    return [];
  }
  return (data ?? []).map((row) => (row as { contact_id: string }).contact_id);
}

/**
 * Server-side eligibility snapshot for an audience: total selected, how
 * many are excluded for deliverability reasons, and the deliverable
 * (active, deduped) contact list. Always recomputed fresh — never cached
 * on the newsletter — so a Send Now / scheduled send always uses current
 * suppression state.
 */
export async function computeAudienceEligibility(
  organizationId: string,
  audienceId: string,
): Promise<NewsletterAudienceEligibility> {
  const supabase = await createClient();
  const { data: memberRows, error } = await supabase
    .from("newsletter_audience_members")
    .select("contact_id, newsletter_contacts(*)")
    .eq("organization_id", organizationId)
    .eq("audience_id", audienceId);

  if (error) {
    console.error("Failed to compute newsletter audience eligibility:", error.message);
    return { audienceId, selected: 0, excluded: 0, eligible: 0, contacts: [] };
  }

  const members: EligibilityContactInput[] = (memberRows ?? [])
    .map((row) => {
      const contact = extractJoinedContact(row);
      if (!contact) return null;
      const input: EligibilityContactInput = {
        contactId: contact.id,
        email: contact.email,
        emailNormalized: contact.email_normalized,
        firstName: contact.first_name,
        lastName: contact.last_name,
        status: contact.status,
      };
      return input;
    })
    .filter((value): value is EligibilityContactInput => value !== null);

  const computation = computeEligibilityFromContacts(members);
  return { audienceId, ...computation };
}
