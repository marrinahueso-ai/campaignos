import "server-only";

import {
  sendCampaignManualUploadEmail,
} from "@/lib/campaign-builder-v2/approval-notifications";
import { isEmailConfigured } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils/dates";
import type { ApprovalSchedulingItemRow } from "@/lib/approvals-scheduling/types";

export interface ManualUploadEmailCronResult {
  scanned: number;
  sent: number;
  skippedNotConfigured: number;
  skippedNoRecipient: number;
  errors: string[];
}

const CATCHUP_HOURS = 48;

function isDueForSend(scheduleAt: string | null, now: Date): boolean {
  if (!scheduleAt) {
    return true;
  }

  const scheduled = new Date(scheduleAt);
  if (Number.isNaN(scheduled.getTime())) {
    return true;
  }

  const msUntil = scheduled.getTime() - now.getTime();
  if (msUntil > 0) {
    return false;
  }

  const hoursLate = Math.abs(msUntil) / 3_600_000;
  return hoursLate <= CATCHUP_HOURS;
}

async function resolveRecipient(
  row: ApprovalSchedulingItemRow,
): Promise<string | null> {
  if (row.manual_email_to?.trim()) {
    return row.manual_email_to.trim();
  }

  if (!row.requested_by_user_id) {
    return null;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organization_users")
    .select("email")
    .eq("id", row.requested_by_user_id)
    .maybeSingle();

  return data?.email?.trim() || null;
}

/**
 * Sends due Create with AI "Email me for manual upload" kits via Resend.
 * Items must already be approved (workflow_status = scheduled).
 */
export async function sendDueManualUploadEmails(): Promise<ManualUploadEmailCronResult> {
  const result: ManualUploadEmailCronResult = {
    scanned: 0,
    sent: 0,
    skippedNotConfigured: 0,
    skippedNoRecipient: 0,
    errors: [],
  };

  if (!isEmailConfigured()) {
    result.skippedNotConfigured = 1;
    result.errors.push("RESEND_API_KEY is not configured.");
    return result;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("approval_scheduling_items")
    .select("*")
    .eq("delivery_method", "manual-email")
    .eq("workflow_status", "scheduled")
    .is("manual_upload_email_sent_at", null);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  const rows = (data ?? []) as ApprovalSchedulingItemRow[];
  result.scanned = rows.length;
  const now = new Date();

  for (const row of rows) {
    if (!isDueForSend(row.schedule_at, now)) {
      continue;
    }

    const recipient = await resolveRecipient(row);
    if (!recipient) {
      result.skippedNoRecipient += 1;
      continue;
    }

    const sendResult = await sendCampaignManualUploadEmail({
      eventId: row.event_id,
      campaignName: row.campaign_name ?? "Campaign",
      milestoneName: row.milestone_name,
      recipientEmail: recipient,
      scheduleLabel: row.schedule_at
        ? formatDateTime(row.schedule_at)
        : "Manual upload",
      schedulingItemId: row.id,
      storyArtworkUrl: row.story_artwork_url,
      storyCaption: row.story_caption,
      feedCaption: row.caption_text,
      uploadLink: row.manual_upload_link,
    });

    if (!sendResult.success) {
      result.errors.push(
        `${row.milestone_name} (${row.id}): ${sendResult.message}`,
      );
      continue;
    }

    const sentAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("approval_scheduling_items")
      .update({
        manual_upload_email_sent_at: sentAt,
        updated_at: sentAt,
      })
      .eq("id", row.id);

    if (updateError) {
      result.errors.push(
        `${row.milestone_name} (${row.id}): sent but failed to mark sent_at — ${updateError.message}`,
      );
    }

    result.sent += 1;
  }

  return result;
}
