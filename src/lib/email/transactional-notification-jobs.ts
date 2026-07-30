import "server-only";

import {
  isApprovalReminderDue,
  isTrialEndingNoticeDue,
  trialDaysRemaining,
  trialNoticeEntityKey,
} from "@/lib/email/transactional-notification-policy";
import {
  sendApprovalReminderEmail,
  sendMetaDisconnectedEmail,
  sendPaymentFailedEmail,
  sendTrialEndingEmail,
} from "@/lib/email/transactional-notifications";
import { isEmailConfigured, type SendEmailResult } from "@/lib/email/send";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

type NotificationType =
  | "approval-reminder"
  | "trial-ending"
  | "payment-failed"
  | "meta-disconnected";

type JobResult = {
  scanned: number;
  sent: number;
  skipped: number;
  errors: string[];
};

function emptyResult(): JobResult {
  return { scanned: 0, sent: 0, skipped: 0, errors: [] };
}

async function claimDelivery(
  notificationType: NotificationType,
  entityKey: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("transactional_notification_deliveries")
    .insert({ notification_type: notificationType, entity_key: entityKey })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return false;
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

async function releaseDelivery(
  notificationType: NotificationType,
  entityKey: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("transactional_notification_deliveries")
    .delete()
    .eq("notification_type", notificationType)
    .eq("entity_key", entityKey)
    .is("sent_at", null);
}

async function markDeliverySent(
  notificationType: NotificationType,
  entityKey: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("transactional_notification_deliveries")
    .update({ sent_at: new Date().toISOString() })
    .eq("notification_type", notificationType)
    .eq("entity_key", entityKey);
  if (error) throw new Error(error.message);
}

async function sendOnce(input: {
  notificationType: NotificationType;
  entityKey: string;
  send: () => Promise<SendEmailResult>;
}): Promise<"sent" | "duplicate" | "failed"> {
  const claimed = await claimDelivery(input.notificationType, input.entityKey);
  if (!claimed) return "duplicate";

  try {
    const result = await input.send();
    if (!result.success) {
      await releaseDelivery(input.notificationType, input.entityKey);
      return "failed";
    }
    await markDeliverySent(input.notificationType, input.entityKey);
    return "sent";
  } catch (error) {
    await releaseDelivery(input.notificationType, input.entityKey);
    throw error;
  }
}

async function organizationBillingEmails(organizationId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_users")
    .select("email")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .in("campaign_role", ["admin", "president"]);
  if (error) throw new Error(error.message);

  return [
    ...new Set(
      (data ?? [])
        .map((row) => String(row.email ?? "").trim())
        .filter(Boolean),
    ),
  ];
}

function canRun(): boolean {
  return isSupabaseAdminConfigured() && isEmailConfigured();
}

/** Daily soft-launch follow-up: one reminder after an assigned approval waits 24h. */
export async function sendPendingApprovalReminders(): Promise<JobResult> {
  const result = emptyResult();
  if (!canRun()) {
    result.errors.push("Email or Supabase admin is not configured.");
    return result;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("approval_requests")
    .select(
      "id, requested_at, assigned_user:organization_users!approval_requests_assigned_user_id_fkey(email), events(title)",
    )
    .eq("status", "pending")
    .not("assigned_user_id", "is", null);
  if (error) {
    result.errors.push(error.message);
    return result;
  }

  for (const row of data ?? []) {
    result.scanned += 1;
    if (!isApprovalReminderDue(row.requested_at as string | null)) {
      result.skipped += 1;
      continue;
    }

    const email = String(
      (row.assigned_user as { email?: string | null } | null)?.email ?? "",
    ).trim();
    if (!email) {
      result.skipped += 1;
      continue;
    }

    const status = await sendOnce({
      notificationType: "approval-reminder",
      entityKey: String(row.id),
      send: () =>
        sendApprovalReminderEmail({
          toEmail: email,
          contentName: `${String((row.events as { title?: string | null } | null)?.title ?? "Content")} awaiting your review`,
          actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://heyralli.com"}/approvals`,
          idempotencyKey: `approval-reminder/${String(row.id)}`,
        }),
    });
    if (status === "sent") result.sent += 1;
    else if (status === "duplicate") result.skipped += 1;
    else result.errors.push(`Approval ${String(row.id)} email failed.`);
  }
  return result;
}

/** Daily trial scan: one notice per organization and trial end timestamp. */
export async function sendTrialEndingNotices(): Promise<JobResult> {
  const result = emptyResult();
  if (!canRun()) {
    result.errors.push("Email or Supabase admin is not configured.");
    return result;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("id, subscription_status, trial_ends_at")
    .eq("subscription_status", "trialing")
    .not("trial_ends_at", "is", null);
  if (error) {
    result.errors.push(error.message);
    return result;
  }

  for (const organization of data ?? []) {
    result.scanned += 1;
    if (
      !isTrialEndingNoticeDue({
        subscriptionStatus: organization.subscription_status as string | null,
        trialEndsAt: organization.trial_ends_at as string | null,
      })
    ) {
      result.skipped += 1;
      continue;
    }
    const emails = await organizationBillingEmails(String(organization.id));
    const trialEndsAt = String(organization.trial_ends_at);
    if (!emails.length) {
      result.skipped += 1;
      continue;
    }
    const status = await sendOnce({
      notificationType: "trial-ending",
      entityKey: trialNoticeEntityKey(String(organization.id), trialEndsAt),
      send: () =>
        sendTrialEndingEmail({
          toEmail: emails,
          daysRemaining: trialDaysRemaining(trialEndsAt) ?? 0,
          idempotencyKey: `trial-ending/${String(organization.id)}/${trialEndsAt}`,
        }),
    });
    if (status === "sent") result.sent += 1;
    else if (status === "duplicate") result.skipped += 1;
    else result.errors.push(`Trial ending email failed for ${String(organization.id)}.`);
  }
  return result;
}

export async function sendPaymentFailedNotice(input: {
  invoiceId: string;
  customerId: string | null;
  subscriptionId: string | null;
}): Promise<void> {
  if (!canRun()) return;

  const admin = createAdminClient();
  let query = admin.from("organizations").select("id");
  query = input.customerId
    ? query.eq("stripe_customer_id", input.customerId)
    : query.eq("stripe_subscription_id", input.subscriptionId ?? "");
  const { data: organization, error } = await query.maybeSingle();
  if (error || !organization) return;

  const emails = await organizationBillingEmails(String(organization.id));
  if (!emails.length) return;
  await sendOnce({
    notificationType: "payment-failed",
    entityKey: input.invoiceId,
    send: () =>
      sendPaymentFailedEmail({
        toEmail: emails,
        idempotencyKey: `payment-failed/${input.invoiceId}`,
      }),
  });
}

export async function sendMetaDisconnectedNotice(
  organizationId: string,
  connectionId: string,
): Promise<void> {
  if (!canRun()) return;

  const emails = await organizationBillingEmails(organizationId);
  if (!emails.length) return;
  await sendOnce({
    notificationType: "meta-disconnected",
    entityKey: connectionId,
    send: () =>
      sendMetaDisconnectedEmail({
        toEmail: emails,
        idempotencyKey: `meta-disconnected/${connectionId}`,
      }),
  });
}
