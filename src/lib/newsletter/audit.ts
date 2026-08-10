import "server-only";

import { createClient } from "@/lib/supabase/server";

export type NewsletterAuditEventType =
  | "draft_saved"
  | "submitted_for_approval"
  | "changes_requested"
  | "approved"
  | "approval_invalidated"
  | "audience_changed"
  | "test_send"
  | "send_started"
  | "send_completed"
  | "send_failed"
  | "scheduled"
  | "schedule_cancelled"
  | "schedule_rescheduled"
  | "contact_added"
  | "contact_imported"
  | "contact_suppressed"
  | "audience_created"
  | "sender_profile_updated";

export interface LogNewsletterAuditEventInput {
  organizationId: string;
  newsletterId?: string | null;
  actorUserId?: string | null;
  eventType: NewsletterAuditEventType | (string & {});
  detail?: Record<string, unknown>;
}

/**
 * Lightweight audit trail. A logging failure must never reverse a mutation
 * that already succeeded — errors are swallowed after being logged.
 */
export async function logNewsletterAuditEvent(
  input: LogNewsletterAuditEventInput,
): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("newsletter_audit_events").insert({
      organization_id: input.organizationId,
      newsletter_id: input.newsletterId ?? null,
      actor_user_id: input.actorUserId ?? null,
      event_type: input.eventType,
      detail: input.detail ?? {},
    });
    if (error) {
      console.error("Failed to log newsletter audit event:", error.message);
    }
  } catch (error) {
    console.error("Failed to log newsletter audit event:", error);
  }
}
