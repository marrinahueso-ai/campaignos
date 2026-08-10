"use server";

import { revalidatePath } from "next/cache";

import { hasPermission, requirePermission } from "@/lib/access-templates/effective-access";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";
import {
  addNewsletterAudienceMembers,
  createNewsletterAudience,
  removeNewsletterAudienceMembers,
} from "@/lib/newsletter/audiences";
import { logNewsletterAuditEvent } from "@/lib/newsletter/audit";
import {
  addNewsletterContact,
  importNewsletterContactsCsvRows,
  type AddNewsletterContactResult,
} from "@/lib/newsletter/contacts";
import {
  checkAndInvalidateIfContentChanged,
  invalidateNewsletterApproval,
} from "@/lib/newsletter/invalidate";
import { getNewsletterById } from "@/lib/newsletter/queries";
import {
  cancelNewsletterSchedule,
  rescheduleNewsletterSend,
  scheduleNewsletterSend,
} from "@/lib/newsletter/schedule";
import { sendNewsletterForApproval } from "@/lib/newsletter/send-for-approval";
import { sendNewsletterNow } from "@/lib/newsletter/send-now";
import { validateNewsletterForSend } from "@/lib/newsletter/send-validator";
import { sendNewsletterTestEmail } from "@/lib/newsletter/test-send";
import type {
  Newsletter,
  NewsletterImportContactRow,
  NewsletterImportResult,
  NewsletterSendValidationResult,
} from "@/lib/newsletter/types";
import { createClient } from "@/lib/supabase/server";

function revalidateNewsletter(newsletterId?: string | null) {
  revalidatePath("/newsletter-composer");
  if (newsletterId) {
    revalidatePath(`/newsletter-composer?newsletterId=${newsletterId}`);
  }
}

async function requireNewsletterContext(): Promise<
  | { ok: true; organizationId: string; actorUserId: string | null }
  | { ok: false; error: string }
> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { ok: false, error: "Sign in and set up your organization first." };
  }
  const membership = await getActiveMembership();
  return { ok: true, organizationId: organization.id, actorUserId: membership?.user.id ?? null };
}

export interface NewsletterDraftFieldsInput {
  title?: string;
  subject?: string;
  preheader?: string | null;
  composerState?: NewsletterComposerState;
  fromDisplayName?: string;
  fromEmail?: string;
  replyToEmail?: string;
  proposedAudienceId?: string | null;
  proposedSendAt?: string | null;
}

function draftFieldsToPatch(fields: NewsletterDraftFieldsInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (fields.title !== undefined) patch.title = fields.title;
  if (fields.subject !== undefined) patch.subject = fields.subject;
  if (fields.preheader !== undefined) patch.preheader = fields.preheader;
  if (fields.composerState !== undefined) patch.composer_state = fields.composerState;
  if (fields.fromDisplayName !== undefined) patch.from_display_name = fields.fromDisplayName;
  if (fields.fromEmail !== undefined) patch.from_email = fields.fromEmail;
  if (fields.replyToEmail !== undefined) patch.reply_to_email = fields.replyToEmail;
  if (fields.proposedAudienceId !== undefined) patch.proposed_audience_id = fields.proposedAudienceId;
  if (fields.proposedSendAt !== undefined) patch.proposed_send_at = fields.proposedSendAt;
  return patch;
}

export type SaveNewsletterDraftResult =
  | { ok: true; newsletterId: string }
  | { ok: false; error: string };

/** Creates a new draft (no id) or updates an existing one's editable fields. */
export async function saveDraft(input: {
  newsletterId?: string | null;
  fields: NewsletterDraftFieldsInput;
}): Promise<SaveNewsletterDraftResult> {
  const access = await requirePermission("draft_edit");
  if ("error" in access) {
    return { ok: false, error: access.error };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  if (!input.newsletterId) {
    const { data, error } = await supabase
      .from("newsletters")
      .insert({
        organization_id: access.organizationId,
        created_by: access.membershipId,
        updated_by: access.membershipId,
        ...draftFieldsToPatch(input.fields),
      })
      .select("id")
      .maybeSingle();

    if (error || !data?.id) {
      return { ok: false, error: error?.message ?? "Unable to create newsletter draft." };
    }

    await logNewsletterAuditEvent({
      organizationId: access.organizationId,
      newsletterId: data.id,
      actorUserId: access.membershipId,
      eventType: "draft_saved",
      detail: { created: true },
    });
    revalidateNewsletter(data.id);
    return { ok: true, newsletterId: data.id };
  }

  const { error } = await supabase
    .from("newsletters")
    .update({
      ...draftFieldsToPatch(input.fields),
      updated_by: access.membershipId,
      updated_at: now,
    })
    .eq("id", input.newsletterId)
    .eq("organization_id", access.organizationId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await logNewsletterAuditEvent({
    organizationId: access.organizationId,
    newsletterId: input.newsletterId,
    actorUserId: access.membershipId,
    eventType: "draft_saved",
    detail: { created: false },
  });
  revalidateNewsletter(input.newsletterId);
  return { ok: true, newsletterId: input.newsletterId };
}

/**
 * Explicit "Edit & Require Reapproval" from an approved/scheduled newsletter.
 * Clears approval immediately so production send is blocked until resubmit.
 */
export async function beginEditRequiringReapproval(input: {
  newsletterId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requirePermission("draft_edit");
  if ("error" in access) {
    return { ok: false, error: access.error };
  }
  const context = await requireNewsletterContext();
  if (!context.ok) return { ok: false, error: context.error };

  const newsletter = await getNewsletterById(context.organizationId, input.newsletterId);
  if (!newsletter) {
    return { ok: false, error: "Newsletter not found." };
  }
  if (newsletter.status !== "approved" && newsletter.status !== "scheduled") {
    return { ok: true };
  }

  const result = await invalidateNewsletterApproval({
    newsletter,
    actorUserId: context.actorUserId,
    reason: "Creator chose Edit & Require Reapproval.",
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  revalidateNewsletter(input.newsletterId);
  revalidatePath(`/newsletters/${input.newsletterId}`);
  return { ok: true };
}

/**
 * Editing an already-approved/scheduled newsletter — same field update as
 * `saveDraft`, but always re-checks whether the change invalidates the
 * existing approval (schedule-only changes never do).
 */
export async function editContentRequiringReapproval(input: {
  newsletterId: string;
  fields: NewsletterDraftFieldsInput;
}): Promise<SaveNewsletterDraftResult & { invalidated?: boolean }> {
  const saveResult = await saveDraft({
    newsletterId: input.newsletterId,
    fields: input.fields,
  });
  if (!saveResult.ok) return saveResult;

  const context = await requireNewsletterContext();
  if (!context.ok) return saveResult;

  const newsletter = await getNewsletterById(context.organizationId, input.newsletterId);
  if (!newsletter) return saveResult;

  const { invalidated } = await checkAndInvalidateIfContentChanged({
    newsletter,
    actorUserId: context.actorUserId,
  });

  revalidateNewsletter(input.newsletterId);
  return { ...saveResult, invalidated };
}

/** Changing the audience always re-checks invalidation (approval requires an unchanged audience). */
export async function changeAudience(input: {
  newsletterId: string;
  audienceId: string | null;
}): Promise<SaveNewsletterDraftResult & { invalidated?: boolean }> {
  return editContentRequiringReapproval({
    newsletterId: input.newsletterId,
    fields: { proposedAudienceId: input.audienceId },
  });
}

export interface SubmitForApprovalInput {
  newsletterId: string;
  fields?: NewsletterDraftFieldsInput;
}

export async function submitForApproval(
  input: SubmitForApprovalInput,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (input.fields) {
    const saveResult = await saveDraft({ newsletterId: input.newsletterId, fields: input.fields });
    if (!saveResult.ok) return { ok: false, error: saveResult.error };
  }

  const context = await requireNewsletterContext();
  if (!context.ok) return { ok: false, error: context.error };

  const result = await sendNewsletterForApproval({
    organizationId: context.organizationId,
    newsletterId: input.newsletterId,
  });

  revalidateNewsletter(input.newsletterId);
  return result.success ? { ok: true, message: result.message } : { ok: false, error: result.message };
}

async function applyNewsletterApproval(input: {
  organizationId: string;
  newsletterId: string;
  actorUserId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const newsletter = await getNewsletterById(input.organizationId, input.newsletterId);
  if (!newsletter) {
    return { ok: false, error: "Newsletter not found." };
  }
  if (newsletter.status !== "needs_approval" && newsletter.status !== "changes_requested") {
    return { ok: false, error: "This newsletter is not waiting for approval." };
  }
  if (!newsletter.currentVersionId) {
    return { ok: false, error: "No version to approve — submit for approval first." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("newsletters")
    .update({
      status: "approved",
      approved_version_id: newsletter.currentVersionId,
      approved_audience_id: newsletter.proposedAudienceId,
      approved_by: input.actorUserId,
      approved_at: now,
      change_request_note: null,
      updated_at: now,
    })
    .eq("id", input.newsletterId)
    .eq("organization_id", input.organizationId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await logNewsletterAuditEvent({
    organizationId: input.organizationId,
    newsletterId: input.newsletterId,
    actorUserId: input.actorUserId,
    eventType: "approved",
    detail: { versionId: newsletter.currentVersionId, audienceId: newsletter.proposedAudienceId },
  });

  revalidateNewsletter(input.newsletterId);
  return { ok: true };
}

export async function approveNewsletter(
  newsletterId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requirePermission("send_newsletter");
  if ("error" in access) {
    return { ok: false, error: access.error };
  }

  return applyNewsletterApproval({
    organizationId: access.organizationId,
    newsletterId,
    actorUserId: access.membershipId,
  });
}

/**
 * Approve path used by the org Approvals hub: marks the newsletter
 * APPROVED / ready to send only — never sends or schedules it. Gated on
 * `approve_comms` (the hub's general approval permission) instead of
 * `send_newsletter`, since approvers may not hold send access.
 */
export async function approveNewsletterForApprovalsHub(
  newsletterId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await hasPermission("approve_comms"))) {
    return { ok: false, error: "You don’t have permission to approve this." };
  }

  const organization = await getCurrentOrganization();
  if (!organization) {
    return { ok: false, error: "Sign in and set up your organization first." };
  }
  const membership = await getActiveMembership();

  return applyNewsletterApproval({
    organizationId: organization.id,
    newsletterId,
    actorUserId: membership?.user.id ?? null,
  });
}

/**
 * Request-changes path used by the org Approvals hub: rolls the newsletter
 * back to `changes_requested` with a note, mirroring the classic
 * social/flyer revision flow. Gated on `approve_comms`.
 */
export async function requestNewsletterChangesForApprovalsHub(input: {
  newsletterId: string;
  note: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await hasPermission("approve_comms"))) {
    return { ok: false, error: "You don’t have permission to request changes." };
  }

  const organization = await getCurrentOrganization();
  if (!organization) {
    return { ok: false, error: "Sign in and set up your organization first." };
  }
  const membership = await getActiveMembership();

  const newsletter = await getNewsletterById(organization.id, input.newsletterId);
  if (!newsletter) {
    return { ok: false, error: "Newsletter not found." };
  }

  const note = input.note.trim();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("newsletters")
    .update({
      status: "changes_requested",
      change_request_note: note || null,
      updated_at: now,
    })
    .eq("id", input.newsletterId)
    .eq("organization_id", organization.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  await logNewsletterAuditEvent({
    organizationId: organization.id,
    newsletterId: input.newsletterId,
    actorUserId: membership?.user.id ?? null,
    eventType: "changes_requested",
    detail: { note },
  });

  revalidateNewsletter(input.newsletterId);
  return { ok: true };
}

export async function prepareSend(
  newsletterId: string,
): Promise<NewsletterSendValidationResult> {
  const context = await requireNewsletterContext();
  if (!context.ok) {
    return { ok: false, errors: [context.error] };
  }
  return validateNewsletterForSend({
    organizationId: context.organizationId,
    newsletterId,
  });
}

export async function sendNow(input: {
  newsletterId: string;
  idempotencyKey?: string;
}): Promise<{ ok: true; sendId: string } | { ok: false; errors: string[] }> {
  const access = await requirePermission("send_newsletter");
  if ("error" in access) {
    return { ok: false, errors: [access.error] };
  }

  const result = await sendNewsletterNow({
    organizationId: access.organizationId,
    newsletterId: input.newsletterId,
    actorUserId: access.membershipId,
    hasSendPermission: true,
    idempotencyKey: input.idempotencyKey,
  });

  revalidateNewsletter(input.newsletterId);
  return result.ok
    ? { ok: true, sendId: result.send.id }
    : { ok: false, errors: result.errors ?? [result.error] };
}

export async function schedule(input: {
  newsletterId: string;
  scheduledFor: string;
}): Promise<{ ok: true; sendId: string } | { ok: false; errors: string[] }> {
  const access = await requirePermission("send_newsletter");
  if ("error" in access) {
    return { ok: false, errors: [access.error] };
  }

  const result = await scheduleNewsletterSend({
    organizationId: access.organizationId,
    newsletterId: input.newsletterId,
    scheduledFor: input.scheduledFor,
    actorUserId: access.membershipId,
    hasSendPermission: true,
  });

  revalidateNewsletter(input.newsletterId);
  return result.ok
    ? { ok: true, sendId: result.send.id }
    : { ok: false, errors: result.errors ?? [result.error] };
}

export async function cancelSchedule(
  newsletterId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requirePermission("send_newsletter");
  if ("error" in access) {
    return { ok: false, error: access.error };
  }
  const result = await cancelNewsletterSchedule({
    organizationId: access.organizationId,
    newsletterId,
    actorUserId: access.membershipId,
  });
  revalidateNewsletter(newsletterId);
  return result;
}

export async function reschedule(input: {
  newsletterId: string;
  scheduledFor: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requirePermission("send_newsletter");
  if ("error" in access) {
    return { ok: false, error: access.error };
  }
  const result = await rescheduleNewsletterSend({
    organizationId: access.organizationId,
    newsletterId: input.newsletterId,
    scheduledFor: input.scheduledFor,
    actorUserId: access.membershipId,
  });
  revalidateNewsletter(input.newsletterId);
  return result;
}

export async function testSend(input: {
  newsletterId: string;
  recipientEmails: string[];
}): Promise<{ ok: true; sentTo: string[] } | { ok: false; error: string }> {
  // Test sends are allowed for editors before approval — they never hit the
  // production audience and must not require send_newsletter.
  const draftAccess = await hasPermission("draft_edit");
  const sendAccess = await hasPermission("send_newsletter");
  if (!draftAccess && !sendAccess) {
    return {
      ok: false,
      error: "You need draft or send permission to send a newsletter test.",
    };
  }
  const ctx = await requireNewsletterContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  return sendNewsletterTestEmail({
    organizationId: ctx.organizationId,
    newsletterId: input.newsletterId,
    recipientEmails: input.recipientEmails,
    actorUserId: ctx.actorUserId,
  });
}

// ---------------------------------------------------------------------------
// Contacts + audiences
// ---------------------------------------------------------------------------

export async function addContact(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  consentNote?: string;
}): Promise<AddNewsletterContactResult> {
  const access = await requirePermission("manage_newsletter_contacts");
  if ("error" in access) {
    return { ok: false, error: access.error };
  }
  const result = await addNewsletterContact({
    organizationId: access.organizationId,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    consentNote: input.consentNote,
    actorUserId: access.membershipId,
  });
  revalidatePath("/newsletter-composer");
  return result;
}

export async function importContactsCsv(input: {
  rows: NewsletterImportContactRow[];
  filename?: string;
  attested: boolean;
}): Promise<NewsletterImportResult> {
  const access = await requirePermission("manage_newsletter_contacts");
  if ("error" in access) {
    return {
      batchId: null,
      rowCount: input.rows.length,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: input.rows.length,
      suppressedSkippedCount: 0,
      errors: [access.error],
    };
  }
  const result = await importNewsletterContactsCsvRows({
    organizationId: access.organizationId,
    rows: input.rows,
    filename: input.filename,
    importedBy: access.membershipId,
    attested: input.attested,
  });
  revalidatePath("/newsletter-composer");
  return result;
}

export async function createAudience(input: {
  name: string;
  description?: string;
}): Promise<{ ok: true; audienceId: string } | { ok: false; error: string }> {
  const access = await requirePermission("manage_newsletter_contacts");
  if ("error" in access) {
    return { ok: false, error: access.error };
  }
  const result = await createNewsletterAudience({
    organizationId: access.organizationId,
    name: input.name,
    description: input.description,
    createdBy: access.membershipId,
  });
  revalidatePath("/newsletter-composer");
  return result.ok ? { ok: true, audienceId: result.audience.id } : result;
}

export async function addAudienceMembers(input: {
  audienceId: string;
  contactIds: string[];
}): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const access = await requirePermission("manage_newsletter_contacts");
  if ("error" in access) {
    return { ok: false, error: access.error };
  }
  const result = await addNewsletterAudienceMembers({
    organizationId: access.organizationId,
    audienceId: input.audienceId,
    contactIds: input.contactIds,
  });
  revalidatePath("/newsletter-composer");
  return result;
}

export async function removeAudienceMembers(input: {
  audienceId: string;
  contactIds: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requirePermission("manage_newsletter_contacts");
  if ("error" in access) {
    return { ok: false, error: access.error };
  }
  const result = await removeNewsletterAudienceMembers({
    organizationId: access.organizationId,
    audienceId: input.audienceId,
    contactIds: input.contactIds,
  });
  revalidatePath("/newsletter-composer");
  return result;
}

export async function canCurrentUserSendNewsletter(): Promise<boolean> {
  return hasPermission("send_newsletter");
}

export async function canCurrentUserManageNewsletterContacts(): Promise<boolean> {
  return hasPermission("manage_newsletter_contacts");
}

/** Persist org newsletter From / Reply-To (authorized domain only). */
export async function updateNewsletterSenderProfile(input: {
  fromDisplayName?: string;
  fromEmail?: string;
  replyToEmail?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requirePermission("manage_integrations");
  const draftAccess = await hasPermission("draft_edit");
  const sendAccess = await hasPermission("send_newsletter");
  if ("error" in access && !draftAccess && !sendAccess) {
    return {
      ok: false,
      error: "You do not have permission to update newsletter sender settings.",
    };
  }
  const context = await requireNewsletterContext();
  if (!context.ok) return { ok: false, error: context.error };

  const { updateSenderProfile } = await import("@/lib/newsletter/sender");
  const result = await updateSenderProfile({
    organizationId: context.organizationId,
    fromDisplayName: input.fromDisplayName,
    fromEmail: input.fromEmail,
    replyToEmail: input.replyToEmail,
    updatedBy: context.actorUserId,
  });
  if (!result.ok) return result;
  revalidatePath("/newsletters");
  revalidatePath("/newsletter-contacts");
  revalidatePath("/settings/organization");
  return { ok: true };
}

export type { Newsletter };
