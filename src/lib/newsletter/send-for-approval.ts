import "server-only";

import { hasPermission } from "@/lib/access-templates/effective-access";
import {
  buildApprovalTransactionalEmail,
} from "@/lib/email/approval-content-preview";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { getActiveMembership, getOrganizationUsers } from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import {
  NEWSLETTER_CAMPAIGN_NAME,
  buildNewsletterMilestoneId,
  newsletterDetailHref,
} from "@/lib/newsletter/approval";
import { logNewsletterAuditEvent } from "@/lib/newsletter/audit";
import { getNewsletterById } from "@/lib/newsletter/queries";
import { createVersionFromNewsletter } from "@/lib/newsletter/versions";
import { resolveApprovalAssignee } from "@/lib/organization-workspace/resolve-approval-assignee";
import { createClient } from "@/lib/supabase/server";
import { escapeHtml } from "@/lib/utils/html";

export interface SendNewsletterForApprovalInput {
  organizationId: string;
  newsletterId: string;
}

export interface SendNewsletterForApprovalResult {
  success: boolean;
  message: string;
  schedulingItemId: string | null;
  campaignMilestoneId: string | null;
}

function emailForUserId(
  orgUsers: Awaited<ReturnType<typeof getOrganizationUsers>>,
  userId: string | null | undefined,
): string | null {
  if (!userId) return null;
  return orgUsers.find((member) => member.id === userId)?.email ?? null;
}

async function dispatchNewsletterApprovalEmail(input: {
  recipientEmail: string;
  milestoneName: string;
  newsletterId: string;
  resubmit: boolean;
}): Promise<{ wired: boolean; message: string }> {
  if (!isEmailConfigured()) {
    return {
      wired: false,
      message: "Email isn’t set up yet — your team was notified in the app only.",
    };
  }

  const href = newsletterDetailHref(input.newsletterId, { absolute: true });
  const headline = input.resubmit ? "Ready for another look" : "Approval assigned to you";
  const bodyText = input.resubmit
    ? `${input.milestoneName} was updated and sent back for review.`
    : `${input.milestoneName} is waiting for your review.`;

  const mail = buildApprovalTransactionalEmail({
    categoryLabel: "APPROVAL",
    headline,
    bodyHtml: `<strong style="color:#14241c;">${escapeHtml(bodyText)}</strong>`,
    bodyText,
    previewHeading: "Newsletter",
    artworkSummary: input.milestoneName,
    artworkPreviewHtml: "",
    artworkPreviewText: "",
    ctaLabel: "Review newsletter",
    actionUrl: href,
    footer: "You're receiving this because approvals need your attention.",
  });

  const result = await sendEmail({
    to: [input.recipientEmail],
    subject: `${input.resubmit ? "Resubmitted for approval" : "Approval needed"}: ${input.milestoneName}`,
    html: mail.html,
    text: mail.text,
  });

  return result.success
    ? { wired: true, message: `Approver notified at ${input.recipientEmail}.` }
    : { wired: false, message: `Approver email skipped: ${result.error}` };
}

/** Notifies the newsletter's creator once the Approvals hub approves it (not sent — draft ready). */
export async function notifyNewsletterApproved(input: {
  recipientEmail: string;
  milestoneName: string;
  newsletterId: string;
}): Promise<{ wired: boolean; message: string }> {
  if (!isEmailConfigured()) {
    return {
      wired: false,
      message: "Email isn’t set up yet — your team was notified in the app only.",
    };
  }

  const href = newsletterDetailHref(input.newsletterId, { absolute: true });
  const bodyText = `${input.milestoneName} is approved and ready to send.`;

  const mail = buildApprovalTransactionalEmail({
    categoryLabel: "APPROVAL",
    headline: "Newsletter approved",
    bodyHtml: `<strong style="color:#14241c;">${escapeHtml(bodyText)}</strong>`,
    bodyText,
    previewHeading: "Newsletter",
    artworkSummary: input.milestoneName,
    artworkPreviewHtml: "",
    artworkPreviewText: "",
    ctaLabel: "View newsletter",
    actionUrl: href,
    footer: "Sent by Hey Ralli",
  });

  const result = await sendEmail({
    to: [input.recipientEmail],
    subject: `Approved: ${input.milestoneName}`,
    html: mail.html,
    text: mail.text,
  });

  return result.success
    ? { wired: true, message: `Creator notified at ${input.recipientEmail}.` }
    : { wired: false, message: `Notification skipped: ${result.error}` };
}

/** Notifies the newsletter's creator when the Approvals hub sends it back for changes. */
export async function notifyNewsletterChangesRequested(input: {
  recipientEmail: string;
  milestoneName: string;
  newsletterId: string;
  comment: string;
}): Promise<{ wired: boolean; message: string }> {
  if (!isEmailConfigured()) {
    return {
      wired: false,
      message: "Email isn’t set up yet — your team was notified in the app only.",
    };
  }

  const href = newsletterDetailHref(input.newsletterId, { absolute: true });
  const bodyText = `A teammate asked for changes to ${input.milestoneName}.`;

  const mail = buildApprovalTransactionalEmail({
    categoryLabel: "APPROVAL",
    headline: "Changes requested",
    bodyHtml: escapeHtml(bodyText),
    bodyText,
    previewHeading: "Newsletter",
    artworkSummary: input.milestoneName,
    artworkPreviewHtml: "",
    artworkPreviewText: "",
    ctaLabel: "Edit newsletter",
    actionUrl: href,
    detailHeading: "What to fix",
    detailBody: input.comment,
    footer: "Sent by Hey Ralli",
  });

  const result = await sendEmail({
    to: [input.recipientEmail],
    subject: `Changes requested: ${input.milestoneName}`,
    html: mail.html,
    text: mail.text,
  });

  return result.success
    ? { wired: true, message: `Creator notified at ${input.recipientEmail}.` }
    : { wired: false, message: `Notification skipped: ${result.error}` };
}

/**
 * Submits the current newsletter draft for approval. Mirrors
 * `sendFlyerComposerForApproval`, but is org-scoped instead of event-scoped:
 * bridges into `approval_scheduling_items` with `event_id = null` and
 * `organization_id` set, `campaign_milestone_id = newsletter:{id}`.
 */
export async function sendNewsletterForApproval(
  input: SendNewsletterForApprovalInput,
): Promise<SendNewsletterForApprovalResult> {
  if (!(await hasPermission("submit_approval"))) {
    return {
      success: false,
      message: "You do not have permission to send drafts for approval.",
      schedulingItemId: null,
      campaignMilestoneId: null,
    };
  }

  const organization = await getCurrentOrganization();
  const membership = await getActiveMembership();
  if (!organization || organization.id !== input.organizationId) {
    return {
      success: false,
      message: "Organization not found.",
      schedulingItemId: null,
      campaignMilestoneId: null,
    };
  }

  const newsletter = await getNewsletterById(input.organizationId, input.newsletterId);
  if (!newsletter) {
    return {
      success: false,
      message: "Newsletter not found.",
      schedulingItemId: null,
      campaignMilestoneId: null,
    };
  }

  if (!newsletter.subject.trim()) {
    return {
      success: false,
      message: "Add a subject before sending for approval.",
      schedulingItemId: null,
      campaignMilestoneId: null,
    };
  }

  const versionResult = await createVersionFromNewsletter({
    newsletter,
    createdBy: membership?.user.userId ?? null,
  });
  if (!versionResult.ok) {
    return {
      success: false,
      message: versionResult.error,
      schedulingItemId: null,
      campaignMilestoneId: null,
    };
  }

  const campaignMilestoneId = buildNewsletterMilestoneId(newsletter.id);
  const milestoneName = newsletter.title.trim() || newsletter.subject.trim() || "Newsletter";
  const isResubmitAfterChanges = newsletter.status === "changes_requested";

  const assignee = await resolveApprovalAssignee(organization.id, null);

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("approval_scheduling_items")
    .select("id, assigned_user_id")
    .eq("organization_id", organization.id)
    .eq("campaign_milestone_id", campaignMilestoneId)
    .maybeSingle();

  const workflowStatus = assignee.assignedUserId ? "assigned_to_me" : "in_queue";

  const rowPayload = {
    event_id: null,
    organization_id: organization.id,
    source: "campaign_builder" as const,
    campaign_milestone_id: campaignMilestoneId,
    campaign_name: NEWSLETTER_CAMPAIGN_NAME,
    milestone_name: milestoneName,
    workflow_status: workflowStatus,
    assigned_organization_role_id: assignee.organizationRoleId,
    assigned_user_id: assignee.assignedUserId,
    // approval_scheduling_items.requested_by_user_id → organization_users.id
    requested_by_user_id: membership?.user.id ?? null,
    delivery_method: "draft-only",
    platforms: [] as string[],
    schedule_at: null,
    caption_text: newsletter.subject,
    story_caption: null,
    feed_artwork_url: null,
    story_artwork_url: null,
    manual_upload_link: null,
    manual_email_to: null,
    manual_email_send_at: null,
    notes: null,
    resolved_at: null,
    requested_at: now,
    updated_at: now,
  };

  const { data: upserted, error } = existing?.id
    ? await supabase
        .from("approval_scheduling_items")
        .update(rowPayload)
        .eq("id", existing.id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("approval_scheduling_items")
        .insert(rowPayload)
        .select("id")
        .maybeSingle();

  if (error || !upserted?.id) {
    console.error("Failed to upsert newsletter approval item:", error?.message);
    return {
      success: false,
      message: "Unable to create approval queue item.",
      schedulingItemId: null,
      campaignMilestoneId,
    };
  }

  const schedulingItemId = upserted.id;

  const { error: updateError } = await supabase
    .from("newsletters")
    .update({
      status: "needs_approval",
      current_version_id: versionResult.version.id,
      approval_scheduling_item_id: schedulingItemId,
      submitted_by: membership?.user.userId ?? null,
      submitted_at: now,
      change_request_note: null,
      updated_at: now,
    })
    .eq("id", newsletter.id);

  if (updateError) {
    return {
      success: false,
      message: "Approval item created, but the newsletter status could not be updated.",
      schedulingItemId,
      campaignMilestoneId,
    };
  }

  await logNewsletterAuditEvent({
    organizationId: organization.id,
    newsletterId: newsletter.id,
    actorUserId: membership?.user.userId ?? null,
    eventType: "submitted_for_approval",
    detail: { schedulingItemId, versionId: versionResult.version.id },
  });

  const orgUsers = await getOrganizationUsers(organization.id);
  const recipientEmail =
    emailForUserId(orgUsers, assignee.assignedUserId) ??
    emailForUserId(orgUsers, existing?.assigned_user_id);

  let emailNote = "";
  if (!recipientEmail) {
    emailNote = " Approver email skipped: no approver email — assign an approver in Team Access.";
  } else {
    const notifyResult = await dispatchNewsletterApprovalEmail({
      recipientEmail,
      milestoneName,
      newsletterId: newsletter.id,
      resubmit: isResubmitAfterChanges,
    });
    emailNote = notifyResult.wired ? ` ${notifyResult.message}` : ` ${notifyResult.message}`;
  }

  return {
    success: true,
    message: `${isResubmitAfterChanges ? "Newsletter resent for approval." : "Newsletter sent for approval."}${emailNote}`,
    schedulingItemId,
    campaignMilestoneId,
  };
}
