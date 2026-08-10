import "server-only";

import { exportNewsletterHtml } from "@/lib/newsletter-composer/export-html";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";
import {
  buildComplianceFooterHtml,
  buildPhysicalAddress,
  injectComplianceFooter,
  UNSUBSCRIBE_URL_PLACEHOLDER,
} from "@/lib/newsletter/compliance-footer";
import { computeNewsletterContentFingerprint } from "@/lib/newsletter/content-fingerprint";
import { getOrCreateSenderProfile } from "@/lib/newsletter/sender";
import type {
  Newsletter,
  NewsletterComplianceFooterData,
  NewsletterVersion,
  NewsletterVersionRow,
} from "@/lib/newsletter/types";
import { getOrganizationById } from "@/lib/organizations/fetch-organization";
import { createClient } from "@/lib/supabase/server";

export function mapVersionRow(row: NewsletterVersionRow): NewsletterVersion {
  return {
    id: row.id,
    newsletterId: row.newsletter_id,
    organizationId: row.organization_id,
    versionNumber: row.version_number,
    contentFingerprint: row.content_fingerprint,
    snapshot: row.snapshot as NewsletterComposerState,
    renderedHtml: row.rendered_html,
    subject: row.subject,
    preheader: row.preheader,
    fromDisplayName: row.from_display_name,
    fromEmail: row.from_email,
    replyToEmail: row.reply_to_email,
    audienceId: row.audience_id,
    proposedSendAt: row.proposed_send_at,
    complianceFooter: (row.compliance_footer as NewsletterComplianceFooterData) ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

const DEFAULT_WHY_RECEIVING =
  "You're receiving this email because you're a subscriber to this organization's newsletter.";

export type CreateVersionResult =
  | { ok: true; version: NewsletterVersion }
  | { ok: false; error: string };

/**
 * Freezes an immutable snapshot of the current draft: rendered HTML
 * (composer state + server-controlled compliance footer), subject,
 * from/reply-to, audience, and a content fingerprint used later to detect
 * whether an approval is still valid.
 */
export async function createVersionFromNewsletter(input: {
  newsletter: Newsletter;
  createdBy?: string | null;
}): Promise<CreateVersionResult> {
  const { newsletter } = input;

  const organization = await getOrganizationById(newsletter.organizationId);
  if (!organization) {
    return { ok: false, error: "Organization not found." };
  }

  const senderProfile = await getOrCreateSenderProfile(newsletter.organizationId);
  const physicalAddress = buildPhysicalAddress({
    addressLine1: organization.addressLine1,
    addressLine2: organization.addressLine2,
    city: organization.city,
    state: organization.state,
    postalCode: organization.postalCode,
    country: organization.country,
    override: senderProfile.physicalAddressOverride,
  });

  const complianceFooter: NewsletterComplianceFooterData = {
    organizationName: organization.name,
    physicalAddress,
    whyReceiving: DEFAULT_WHY_RECEIVING,
    unsubscribeUrlPlaceholder: UNSUBSCRIBE_URL_PLACEHOLDER,
  };

  const footerHtml = buildComplianceFooterHtml({
    organizationName: complianceFooter.organizationName,
    physicalAddress: complianceFooter.physicalAddress,
    whyReceiving: complianceFooter.whyReceiving,
  });

  const bodyHtml = exportNewsletterHtml(newsletter.composerState);
  const renderedHtml = injectComplianceFooter(bodyHtml, footerHtml);

  const fingerprint = computeNewsletterContentFingerprint({
    composerState: newsletter.composerState,
    subject: newsletter.subject,
    fromDisplayName: newsletter.fromDisplayName,
    fromEmail: newsletter.fromEmail,
    replyToEmail: newsletter.replyToEmail,
    audienceId: newsletter.proposedAudienceId,
  });

  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("newsletter_versions")
    .select("version_number")
    .eq("newsletter_id", newsletter.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersionNumber = (latest?.version_number ?? 0) + 1;

  const { data, error } = await supabase
    .from("newsletter_versions")
    .insert({
      newsletter_id: newsletter.id,
      organization_id: newsletter.organizationId,
      version_number: nextVersionNumber,
      content_fingerprint: fingerprint,
      snapshot: newsletter.composerState,
      rendered_html: renderedHtml,
      subject: newsletter.subject,
      preheader: newsletter.preheader,
      from_display_name: newsletter.fromDisplayName,
      from_email: newsletter.fromEmail,
      reply_to_email: newsletter.replyToEmail,
      audience_id: newsletter.proposedAudienceId,
      proposed_send_at: newsletter.proposedSendAt,
      compliance_footer: complianceFooter,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Unable to save newsletter version." };
  }

  const version = mapVersionRow(data as NewsletterVersionRow);

  await supabase
    .from("newsletters")
    .update({ current_version_id: version.id, updated_at: new Date().toISOString() })
    .eq("id", newsletter.id);

  return { ok: true, version };
}

export async function getNewsletterVersionById(
  organizationId: string,
  versionId: string,
): Promise<NewsletterVersion | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsletter_versions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", versionId)
    .maybeSingle();
  return data ? mapVersionRow(data as NewsletterVersionRow) : null;
}

export async function listNewsletterVersions(
  organizationId: string,
  newsletterId: string,
): Promise<NewsletterVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("newsletter_versions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("newsletter_id", newsletterId)
    .order("version_number", { ascending: false });

  if (error) {
    console.error("Failed to list newsletter versions:", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapVersionRow(row as NewsletterVersionRow));
}
