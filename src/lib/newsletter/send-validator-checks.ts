import type { NewsletterStatus } from "@/lib/newsletter/types";

/**
 * Pure "final gate" checks for Send Now / Schedule, extracted from
 * `send-validator.ts` (which needs `server-only` to fetch the newsletter,
 * version, audience, and sender profile) so the fail-closed logic itself
 * can be unit tested without a database.
 *
 * Every field here must already be resolved by the caller — this function
 * makes no assumptions and does no I/O.
 */
export interface NewsletterSendCheckFacts {
  hasSendPermission: boolean;
  status: NewsletterStatus;
  currentVersionId: string | null;
  approvedVersionId: string | null;
  /** Audience the version was rendered against. */
  versionAudienceId: string | null;
  approvedAudienceId: string | null;
  subject: string;
  authorizedSender: { ok: boolean; error?: string };
  replyToEmailValid: boolean;
  hasMailingAddress: boolean;
  hasComplianceFooter: boolean;
  /** False only when something structurally blocks generating tokens (e.g. missing org/contact ids). */
  canGenerateUnsubscribeTokens: boolean;
  eligibleRecipientCount: number;
  productionSendEnabled: boolean;
  /** True when an existing send for this newsletter+version is already sending or sent. */
  hasDuplicateActiveSend: boolean;
  /**
   * When true, skip the production-gate check (used when queuing a schedule).
   * Cron / Send Now still enforce the gate at delivery time.
   */
  skipProductionGate?: boolean;
}

/** Returns an empty array when every check passes; otherwise, one message per failure. */
export function runNewsletterSendChecks(facts: NewsletterSendCheckFacts): string[] {
  const errors: string[] = [];

  if (!facts.hasSendPermission) {
    errors.push("You do not have permission to send this newsletter.");
  }

  if (facts.status !== "approved" && facts.status !== "scheduled") {
    errors.push("The newsletter must be approved before it can be sent.");
  }

  if (!facts.approvedVersionId) {
    errors.push("No approved version exists for this newsletter.");
  } else if (facts.currentVersionId !== facts.approvedVersionId) {
    errors.push(
      "The current draft no longer matches the approved version. Re-submit for approval.",
    );
  }

  if (!facts.approvedAudienceId) {
    errors.push("No approved audience exists for this newsletter.");
  } else if (facts.versionAudienceId !== facts.approvedAudienceId) {
    errors.push("The audience has changed since approval. Re-submit for approval.");
  }

  if (!facts.subject.trim()) {
    errors.push("Subject is required.");
  }

  if (!facts.authorizedSender.ok) {
    errors.push(facts.authorizedSender.error ?? "Sender address is not authorized.");
  }

  if (!facts.replyToEmailValid) {
    errors.push("Reply-to address is missing or invalid.");
  }

  if (!facts.hasMailingAddress) {
    errors.push("A physical mailing address is required before sending.");
  }

  if (!facts.hasComplianceFooter) {
    errors.push("The compliance footer could not be generated for this version.");
  }

  if (!facts.canGenerateUnsubscribeTokens) {
    errors.push("Unable to generate unsubscribe links for recipients.");
  }

  if (facts.eligibleRecipientCount <= 0) {
    errors.push("No eligible recipients in the audience.");
  }

  if (!facts.skipProductionGate && !facts.productionSendEnabled) {
    errors.push("Production sending is disabled for this environment.");
  }

  if (facts.hasDuplicateActiveSend) {
    errors.push("A send is already in progress or completed for this newsletter.");
  }

  return errors;
}
