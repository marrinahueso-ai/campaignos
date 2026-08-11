import "server-only";

import { approvalInvalidatingFieldsChanged } from "@/lib/newsletter/content-fingerprint";
import { logNewsletterAuditEvent } from "@/lib/newsletter/audit";
import type { Newsletter } from "@/lib/newsletter/types";
import { getNewsletterVersionById } from "@/lib/newsletter/versions";
import { createClient } from "@/lib/supabase/server";

export type InvalidateNewsletterApprovalResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Rolls a newsletter back to `draft`, clears the approved version/audience,
 * and cancels any still-pending scheduled send (never touches a send that
 * is already `sending` or `sent` — those are historical facts).
 */
export async function invalidateNewsletterApproval(input: {
  newsletter: Newsletter;
  reason: string;
  actorUserId?: string | null;
}): Promise<InvalidateNewsletterApprovalResult> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("newsletters")
    .update({
      status: "draft",
      approved_version_id: null,
      approved_audience_id: null,
      approved_by: null,
      approved_at: null,
      scheduled_send_at: null,
      change_request_note: null,
      updated_at: now,
    })
    .eq("id", input.newsletter.id)
    .eq("organization_id", input.newsletter.organizationId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase
    .from("newsletter_sends")
    .update({ status: "cancelled", updated_at: now })
    .eq("newsletter_id", input.newsletter.id)
    .eq("status", "scheduled");

  await logNewsletterAuditEvent({
    organizationId: input.newsletter.organizationId,
    newsletterId: input.newsletter.id,
    actorUserId: input.actorUserId,
    eventType: "approval_invalidated",
    detail: { reason: input.reason },
  });

  return { ok: true };
}

/**
 * Re-checks whether the live draft still matches the approved version.
 * Schedule-only changes never trigger this — callers pass the *current*
 * draft fields (subject/from/reply-to/audience/composerState), and this
 * compares them against the frozen approved version's snapshot.
 */
export async function checkAndInvalidateIfContentChanged(input: {
  newsletter: Newsletter;
  actorUserId?: string | null;
}): Promise<{ invalidated: boolean }> {
  const { newsletter } = input;
  if (newsletter.status !== "approved" && newsletter.status !== "scheduled") {
    return { invalidated: false };
  }
  if (!newsletter.approvedVersionId) {
    return { invalidated: false };
  }

  const approvedVersion = await getNewsletterVersionById(
    newsletter.organizationId,
    newsletter.approvedVersionId,
  );
  if (!approvedVersion) {
    return { invalidated: false };
  }

  const changed = approvalInvalidatingFieldsChanged(
    {
      composerState: newsletter.composerState,
      subject: newsletter.subject,
      fromDisplayName: newsletter.fromDisplayName,
      fromEmail: newsletter.fromEmail,
      replyToEmail: newsletter.replyToEmail,
      audienceId: newsletter.proposedAudienceId,
      proposedSendAt: newsletter.proposedSendAt,
    },
    {
      composerState: approvedVersion.snapshot,
      subject: approvedVersion.subject,
      fromDisplayName: approvedVersion.fromDisplayName,
      fromEmail: approvedVersion.fromEmail,
      replyToEmail: approvedVersion.replyToEmail,
      audienceId: approvedVersion.audienceId,
      proposedSendAt: approvedVersion.proposedSendAt,
    },
  );

  if (!changed) {
    return { invalidated: false };
  }

  const result = await invalidateNewsletterApproval({
    newsletter,
    reason: "Content changed after approval.",
    actorUserId: input.actorUserId,
  });
  return { invalidated: result.ok };
}
