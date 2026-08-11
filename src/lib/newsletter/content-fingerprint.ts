import { createHash } from "node:crypto";

import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";

/**
 * Fields that determine whether an already-approved newsletter needs
 * re-approval. Content + recipients + proposed send datetime are all part of
 * the approval package (Approve & Schedule).
 *
 * Explicitly EXCLUDED (must never appear here):
 *  - scheduledSendAt as a separate field — the creator's proposed send time is
 *    the approved package; cron-owned scheduled_send_at mirrors it after approve.
 *  - anything related to test sends — test sends never touch this input.
 */
export interface NewsletterFingerprintInput {
  composerState: NewsletterComposerState;
  subject: string;
  fromDisplayName: string;
  fromEmail: string;
  replyToEmail: string;
  audienceId: string | null;
  /** ISO timestamp; part of the approval package. */
  proposedSendAt: string | null;
}

/** Recursively sort object keys so JSON.stringify output is order-independent. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const out: Record<string, unknown> = {};
    for (const [key, entryValue] of entries) {
      out[key] = canonicalize(entryValue);
    }
    return out;
  }
  return value;
}

/** Only the invalidating slice of a fingerprint input — strips anything else. */
function invalidatingSlice(
  input: NewsletterFingerprintInput,
): Record<string, unknown> {
  const {
    composerState,
    subject,
    fromDisplayName,
    fromEmail,
    replyToEmail,
    audienceId,
    proposedSendAt,
  } = input;
  return {
    composerState,
    subject: subject.trim(),
    fromDisplayName: fromDisplayName.trim(),
    fromEmail: fromEmail.trim().toLowerCase(),
    replyToEmail: replyToEmail.trim().toLowerCase(),
    audienceId: audienceId ?? null,
    proposedSendAt: proposedSendAt ?? null,
  };
}

/**
 * Stable content fingerprint — same logical content always produces the
 * same hash, regardless of object key order. Used to detect whether the
 * approved version still matches the current draft.
 */
export function computeNewsletterContentFingerprint(
  input: NewsletterFingerprintInput,
): string {
  const canonical = canonicalize(invalidatingSlice(input));
  const json = JSON.stringify(canonical);
  return createHash("sha256").update(json).digest("hex");
}

/**
 * True when any approval-invalidating field differs between two snapshots
 * (e.g. the current draft vs. the last approved version). Test sends are
 * never part of this comparison. Changing proposed send datetime DOES
 * invalidate (approval covers content + recipients + send time).
 */
export function approvalInvalidatingFieldsChanged(
  a: NewsletterFingerprintInput,
  b: NewsletterFingerprintInput,
): boolean {
  return (
    computeNewsletterContentFingerprint(a) !==
    computeNewsletterContentFingerprint(b)
  );
}

/** Convenience: compare a live input against an already-stored fingerprint. */
export function contentFingerprintMatches(
  input: NewsletterFingerprintInput,
  storedFingerprint: string,
): boolean {
  return computeNewsletterContentFingerprint(input) === storedFingerprint;
}
