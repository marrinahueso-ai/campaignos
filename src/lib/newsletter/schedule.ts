import "server-only";

import { computeEligibilityFromContacts, type EligibilityContactInput } from "@/lib/newsletter/audience-eligibility";
import { extractJoinedContact, mapAudienceRow } from "@/lib/newsletter/audiences";
import { logNewsletterAuditEvent } from "@/lib/newsletter/audit";
import { isNewsletterProductionSendEnabled } from "@/lib/newsletter/production-gate";
import { mapNewsletterRow, mapSendRow } from "@/lib/newsletter/queries";
import { mapSenderProfileRow } from "@/lib/newsletter/sender";
import { deliverNewsletterSend } from "@/lib/newsletter/send-delivery";
import { validateNewsletterForSend } from "@/lib/newsletter/send-validator";
import type {
  NewsletterAudienceRow,
  NewsletterRow,
  NewsletterSend,
  NewsletterSendRow,
  NewsletterSenderProfileRow,
  NewsletterVersionRow,
} from "@/lib/newsletter/types";
import { mapVersionRow } from "@/lib/newsletter/versions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function defaultScheduleIdempotencyKey(newsletterId: string, versionId: string): string {
  return `schedule:${newsletterId}:${versionId}`;
}

export interface ScheduleNewsletterSendInput {
  organizationId: string;
  newsletterId: string;
  scheduledFor: string;
  actorUserId?: string | null;
  hasSendPermission?: boolean;
}

export type ScheduleNewsletterSendResult =
  | { ok: true; send: NewsletterSend }
  | { ok: false; error: string; errors?: string[] };

/** Schedules a send. Only allowed against an already-approved newsletter. */
export async function scheduleNewsletterSend(
  input: ScheduleNewsletterSendInput,
): Promise<ScheduleNewsletterSendResult> {
  const scheduledFor = new Date(input.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) {
    return { ok: false, error: "Choose a future date and time to schedule this send." };
  }

  const validation = await validateNewsletterForSend({
    organizationId: input.organizationId,
    newsletterId: input.newsletterId,
    hasSendPermission: input.hasSendPermission,
  });
  if (!validation.ok) {
    return { ok: false, error: validation.errors[0] ?? "Unable to schedule.", errors: validation.errors };
  }

  const { newsletter, version, audience, eligibility } = validation.context;
  const idempotencyKey = defaultScheduleIdempotencyKey(newsletter.id, version.id);
  const now = new Date().toISOString();
  const scheduledForIso = scheduledFor.toISOString();

  const supabase = await createClient();
  const { data: sendRow, error } = await supabase
    .from("newsletter_sends")
    .upsert(
      {
        organization_id: input.organizationId,
        newsletter_id: newsletter.id,
        version_id: version.id,
        audience_id: audience.id,
        send_kind: "production" as const,
        status: "scheduled" as const,
        idempotency_key: idempotencyKey,
        scheduled_for: scheduledForIso,
        selected_count: eligibility.selected,
        excluded_count: eligibility.excluded,
        eligible_count: eligibility.eligible,
        from_display_name: newsletter.fromDisplayName,
        from_email: newsletter.fromEmail,
        reply_to_email: newsletter.replyToEmail,
        subject: newsletter.subject,
        rendered_html: version.renderedHtml,
        provider: "resend" as const,
        created_by: input.actorUserId ?? null,
        updated_at: now,
      },
      { onConflict: "organization_id,idempotency_key" },
    )
    .select("*")
    .maybeSingle();

  if (error || !sendRow) {
    return { ok: false, error: error?.message ?? "Unable to schedule send." };
  }

  await supabase
    .from("newsletters")
    .update({ status: "scheduled", scheduled_send_at: scheduledForIso, updated_at: now })
    .eq("id", newsletter.id);

  await logNewsletterAuditEvent({
    organizationId: input.organizationId,
    newsletterId: newsletter.id,
    actorUserId: input.actorUserId,
    eventType: "scheduled",
    detail: { scheduledFor: scheduledForIso, sendId: sendRow.id },
  });

  return { ok: true, send: mapSendRow(sendRow as NewsletterSendRow) };
}

export type CancelScheduleResult = { ok: true } | { ok: false; error: string };

/** Cancels a pending scheduled send. The approval itself is untouched. */
export async function cancelNewsletterSchedule(input: {
  organizationId: string;
  newsletterId: string;
  actorUserId?: string | null;
}): Promise<CancelScheduleResult> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: scheduledRow } = await supabase
    .from("newsletter_sends")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("newsletter_id", input.newsletterId)
    .eq("status", "scheduled")
    .maybeSingle();

  if (!scheduledRow) {
    return { ok: false, error: "No scheduled send to cancel." };
  }

  const { error } = await supabase
    .from("newsletter_sends")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", scheduledRow.id)
    .eq("status", "scheduled");

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase
    .from("newsletters")
    .update({ status: "approved", scheduled_send_at: null, updated_at: now })
    .eq("id", input.newsletterId)
    .eq("organization_id", input.organizationId);

  await logNewsletterAuditEvent({
    organizationId: input.organizationId,
    newsletterId: input.newsletterId,
    actorUserId: input.actorUserId,
    eventType: "schedule_cancelled",
    detail: { sendId: scheduledRow.id },
  });

  return { ok: true };
}

export type RescheduleResult = { ok: true } | { ok: false; error: string };

/** Moves the scheduled send time. Schedule-only changes never invalidate approval. */
export async function rescheduleNewsletterSend(input: {
  organizationId: string;
  newsletterId: string;
  scheduledFor: string;
  actorUserId?: string | null;
}): Promise<RescheduleResult> {
  const scheduledFor = new Date(input.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) {
    return { ok: false, error: "Choose a future date and time to reschedule this send." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const scheduledForIso = scheduledFor.toISOString();

  const { data: scheduledRow } = await supabase
    .from("newsletter_sends")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("newsletter_id", input.newsletterId)
    .eq("status", "scheduled")
    .maybeSingle();

  if (!scheduledRow) {
    return { ok: false, error: "No scheduled send to reschedule." };
  }

  const { error } = await supabase
    .from("newsletter_sends")
    .update({ scheduled_for: scheduledForIso, updated_at: now })
    .eq("id", scheduledRow.id)
    .eq("status", "scheduled");

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase
    .from("newsletters")
    .update({ scheduled_send_at: scheduledForIso, updated_at: now })
    .eq("id", input.newsletterId)
    .eq("organization_id", input.organizationId);

  await logNewsletterAuditEvent({
    organizationId: input.organizationId,
    newsletterId: input.newsletterId,
    actorUserId: input.actorUserId,
    eventType: "schedule_rescheduled",
    detail: { sendId: scheduledRow.id, scheduledFor: scheduledForIso },
  });

  return { ok: true };
}

/**
 * All send ids currently due (`scheduled`, `scheduled_for` in the past),
 * across every organization — the cron entrypoint claims and executes each
 * one individually via `executeScheduledSend`. Admin client: no user session.
 */
export async function listDueNewsletterScheduledSendIds(limit = 50): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("newsletter_sends")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to list due newsletter scheduled sends:", error.message);
    return [];
  }
  return (data ?? []).map((row) => (row as { id: string }).id);
}

export type ExecuteScheduledSendResult =
  | { ok: true; send: NewsletterSend }
  | { ok: false; error: string };

/**
 * Cron / scheduler entrypoint — no user session, so this uses the admin
 * client end to end. Single-flight via `claim_newsletter_scheduled_send`
 * (atomic `scheduled` → `sending` flip). Re-verifies approval, version, and
 * audience are unchanged since scheduling, recomputes suppression fresh,
 * and fails closed on any mismatch or if the production gate is off.
 */
export async function executeScheduledSend(sendId: string): Promise<ExecuteScheduledSendResult> {
  const admin = createAdminClient();

  const { data: claimed, error: claimError } = await admin.rpc(
    "claim_newsletter_scheduled_send",
    { p_send_id: sendId },
  );
  if (claimError) {
    return { ok: false, error: claimError.message };
  }
  if (!claimed) {
    return { ok: false, error: "Send is not claimable (not scheduled/due, or already claimed)." };
  }

  const { data: sendRowData, error: sendReadError } = await admin
    .from("newsletter_sends")
    .select("*")
    .eq("id", sendId)
    .maybeSingle();
  if (sendReadError || !sendRowData) {
    return { ok: false, error: sendReadError?.message ?? "Send record not found after claim." };
  }
  const sendRow = sendRowData as NewsletterSendRow;

  const { data: newsletterRowData } = await admin
    .from("newsletters")
    .select("*")
    .eq("id", sendRow.newsletter_id)
    .maybeSingle();
  if (!newsletterRowData) {
    await failClaimedSend(admin, sendId, "Newsletter no longer exists.");
    return { ok: false, error: "Newsletter no longer exists." };
  }
  const newsletter = mapNewsletterRow(newsletterRowData as NewsletterRow);

  const approvalStillValid =
    newsletter.status === "scheduled" &&
    newsletter.approvedVersionId === sendRow.version_id &&
    newsletter.approvedAudienceId === sendRow.audience_id;

  if (!approvalStillValid) {
    await failClaimedSend(admin, sendId, "Approval, version, or audience changed before the scheduled time.");
    return { ok: false, error: "Approval is no longer valid for this scheduled send." };
  }

  if (!isNewsletterProductionSendEnabled()) {
    await failClaimedSend(admin, sendId, "Production sending was disabled before the scheduled time.");
    return { ok: false, error: "Newsletter production sending is disabled for this environment." };
  }

  const { data: versionRowData } = await admin
    .from("newsletter_versions")
    .select("*")
    .eq("id", sendRow.version_id)
    .maybeSingle();
  if (!versionRowData) {
    await failClaimedSend(admin, sendId, "Version no longer exists.");
    return { ok: false, error: "Version no longer exists." };
  }
  const version = mapVersionRow(versionRowData as NewsletterVersionRow);

  const { data: senderRowData } = await admin
    .from("newsletter_sender_profiles")
    .select("*")
    .eq("organization_id", newsletter.organizationId)
    .maybeSingle();
  const senderProfile = senderRowData
    ? mapSenderProfileRow(senderRowData as NewsletterSenderProfileRow)
    : null;
  if (!senderProfile) {
    await failClaimedSend(admin, sendId, "Sender profile no longer exists.");
    return { ok: false, error: "Sender profile no longer exists." };
  }

  if (!sendRow.audience_id) {
    await failClaimedSend(admin, sendId, "Audience no longer exists.");
    return { ok: false, error: "Audience no longer exists." };
  }

  const { data: audienceRowData } = await admin
    .from("newsletter_audiences")
    .select("*")
    .eq("id", sendRow.audience_id)
    .maybeSingle();
  if (!audienceRowData) {
    await failClaimedSend(admin, sendId, "Audience no longer exists.");
    return { ok: false, error: "Audience no longer exists." };
  }
  mapAudienceRow(audienceRowData as NewsletterAudienceRow);

  // Recompute suppression fresh — never trust the counts captured at schedule time.
  const { data: memberRows } = await admin
    .from("newsletter_audience_members")
    .select("contact_id, newsletter_contacts(*)")
    .eq("organization_id", newsletter.organizationId)
    .eq("audience_id", sendRow.audience_id);

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

  const eligibility = computeEligibilityFromContacts(members);
  if (eligibility.eligible <= 0) {
    await failClaimedSend(admin, sendId, "No eligible recipients remain in the audience.");
    return { ok: false, error: "No eligible recipients remain in the audience." };
  }

  await admin
    .from("newsletter_sends")
    .update({
      selected_count: eligibility.selected,
      excluded_count: eligibility.excluded,
      eligible_count: eligibility.eligible,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sendId);

  await logNewsletterAuditEvent({
    organizationId: newsletter.organizationId,
    newsletterId: newsletter.id,
    eventType: "send_started",
    detail: { sendId, eligibleCount: eligibility.eligible, scheduled: true },
  });

  const finalSend = await deliverNewsletterSend({
    supabase: admin,
    sendId,
    newsletter: { ...newsletter, status: "sending" },
    version,
    senderProfile,
    contacts: eligibility.contacts,
    actorUserId: null,
  });

  return { ok: true, send: finalSend };
}

async function failClaimedSend(
  admin: ReturnType<typeof createAdminClient>,
  sendId: string,
  reason: string,
): Promise<void> {
  await admin
    .from("newsletter_sends")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      failure_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sendId);
}
