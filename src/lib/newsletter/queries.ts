import "server-only";

import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";
import { getNewsletterAudienceById, listNewsletterAudiences } from "@/lib/newsletter/audiences";
import { getOrCreateSenderProfile } from "@/lib/newsletter/sender";
import type {
  Newsletter,
  NewsletterAudience,
  NewsletterAuditEventRow,
  NewsletterRow,
  NewsletterSend,
  NewsletterSendRow,
  NewsletterSenderProfile,
  NewsletterVersion,
} from "@/lib/newsletter/types";
import { getNewsletterVersionById, listNewsletterVersions } from "@/lib/newsletter/versions";
import { createClient } from "@/lib/supabase/server";

export function mapNewsletterRow(row: NewsletterRow): Newsletter {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    status: row.status,
    currentVersionId: row.current_version_id,
    approvedVersionId: row.approved_version_id,
    composerState: row.composer_state as NewsletterComposerState,
    proposedAudienceId: row.proposed_audience_id,
    approvedAudienceId: row.approved_audience_id,
    proposedSendAt: row.proposed_send_at,
    scheduledSendAt: row.scheduled_send_at,
    sentAt: row.sent_at,
    fromDisplayName: row.from_display_name,
    fromEmail: row.from_email,
    replyToEmail: row.reply_to_email,
    subject: row.subject,
    preheader: row.preheader,
    approvalSchedulingItemId: row.approval_scheduling_item_id,
    changeRequestNote: row.change_request_note,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    submittedBy: row.submitted_by,
    approvedBy: row.approved_by,
    sentBy: row.sent_by,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    lastFailureReason: row.last_failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSendRow(row: NewsletterSendRow): NewsletterSend {
  return {
    id: row.id,
    organizationId: row.organization_id,
    newsletterId: row.newsletter_id,
    versionId: row.version_id,
    audienceId: row.audience_id,
    sendKind: row.send_kind,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    scheduledFor: row.scheduled_for,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    selectedCount: row.selected_count,
    excludedCount: row.excluded_count,
    eligibleCount: row.eligible_count,
    deliveredCount: row.delivered_count,
    failedCount: row.failed_count,
    fromDisplayName: row.from_display_name,
    fromEmail: row.from_email,
    replyToEmail: row.reply_to_email,
    subject: row.subject,
    renderedHtml: row.rendered_html,
    provider: row.provider,
    providerBatchIds: Array.isArray(row.provider_batch_ids)
      ? (row.provider_batch_ids as string[])
      : [],
    failureReason: row.failure_reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getNewsletterById(
  organizationId: string,
  newsletterId: string,
): Promise<Newsletter | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("newsletters")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", newsletterId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return mapNewsletterRow(data as NewsletterRow);
}

export async function listNewslettersForOrg(
  organizationId: string,
): Promise<Newsletter[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("newsletters")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to list newsletters:", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapNewsletterRow(row as NewsletterRow));
}

export async function listNewsletterSends(
  organizationId: string,
  newsletterId: string,
): Promise<NewsletterSend[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("newsletter_sends")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("newsletter_id", newsletterId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list newsletter sends:", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapSendRow(row as NewsletterSendRow));
}

/** Thin, newest-first audit trail for the newsletter detail workflow-history panel. */
export async function listNewsletterAuditEvents(
  organizationId: string,
  newsletterId: string,
  limit = 50,
): Promise<NewsletterAuditEventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("newsletter_audit_events")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("newsletter_id", newsletterId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to list newsletter audit events:", error.message);
    return [];
  }
  return (data ?? []) as NewsletterAuditEventRow[];
}

export interface NewsletterDetailPayload {
  newsletter: Newsletter;
  currentVersion: NewsletterVersion | null;
  approvedVersion: NewsletterVersion | null;
  versions: NewsletterVersion[];
  proposedAudience: NewsletterAudience | null;
  approvedAudience: NewsletterAudience | null;
  audiences: NewsletterAudience[];
  senderProfile: NewsletterSenderProfile;
  sends: NewsletterSend[];
  auditEvents: NewsletterAuditEventRow[];
}

/** Everything the newsletter detail / review screen needs in one call. */
export async function getNewsletterDetailPayload(
  organizationId: string,
  newsletterId: string,
): Promise<NewsletterDetailPayload | null> {
  const newsletter = await getNewsletterById(organizationId, newsletterId);
  if (!newsletter) return null;

  const [
    currentVersion,
    approvedVersion,
    versions,
    proposedAudience,
    approvedAudience,
    audiences,
    senderProfile,
    sends,
    auditEvents,
  ] = await Promise.all([
    newsletter.currentVersionId
      ? getNewsletterVersionById(organizationId, newsletter.currentVersionId)
      : Promise.resolve(null),
    newsletter.approvedVersionId
      ? getNewsletterVersionById(organizationId, newsletter.approvedVersionId)
      : Promise.resolve(null),
    listNewsletterVersions(organizationId, newsletterId),
    newsletter.proposedAudienceId
      ? getNewsletterAudienceById(organizationId, newsletter.proposedAudienceId)
      : Promise.resolve(null),
    newsletter.approvedAudienceId
      ? getNewsletterAudienceById(organizationId, newsletter.approvedAudienceId)
      : Promise.resolve(null),
    listNewsletterAudiences(organizationId),
    getOrCreateSenderProfile(organizationId),
    listNewsletterSends(organizationId, newsletterId),
    listNewsletterAuditEvents(organizationId, newsletterId),
  ]);

  return {
    newsletter,
    currentVersion,
    approvedVersion,
    versions,
    proposedAudience,
    approvedAudience,
    audiences,
    senderProfile,
    sends,
    auditEvents,
  };
}
