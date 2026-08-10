import {
  NEWSLETTER_CONTACT_LOCKED_STATUSES,
  type NewsletterContactStatus,
} from "@/lib/newsletter/types";

/**
 * Pure re-import / re-add decision logic, shared by manual "add contact" and
 * CSV import. Extracted from `contacts.ts` (which needs `server-only`) so it
 * can be unit tested without a database.
 */

export interface ExistingContactSnapshot {
  status: NewsletterContactStatus;
  firstName: string;
  lastName: string;
}

export interface IncomingContactSnapshot {
  firstName?: string | null;
  lastName?: string | null;
}

export type ContactReimportAction =
  | { kind: "create" }
  | { kind: "update_active"; firstName: string; lastName: string }
  | {
      kind: "keep_locked";
      firstName: string;
      lastName: string;
      status: NewsletterContactStatus;
    }
  | { kind: "noop" };

export function isLockedContactStatus(status: NewsletterContactStatus): boolean {
  return (NEWSLETTER_CONTACT_LOCKED_STATUSES as string[]).includes(status);
}

/**
 * Decides what to do when a contact email already exists.
 * INVARIANT: a contact in a locked status (unsubscribed / suppressed /
 * bounced / complained) is NEVER reactivated to `active` here — name fields
 * may still be refreshed, but `status` always carries over unchanged.
 */
export function resolveContactReimportAction(
  existing: ExistingContactSnapshot | null,
  incoming: IncomingContactSnapshot,
): ContactReimportAction {
  if (!existing) {
    return { kind: "create" };
  }

  const nextFirstName = incoming.firstName?.trim() || existing.firstName;
  const nextLastName = incoming.lastName?.trim() || existing.lastName;

  if (isLockedContactStatus(existing.status)) {
    return {
      kind: "keep_locked",
      firstName: nextFirstName,
      lastName: nextLastName,
      status: existing.status,
    };
  }

  if (nextFirstName === existing.firstName && nextLastName === existing.lastName) {
    return { kind: "noop" };
  }

  return { kind: "update_active", firstName: nextFirstName, lastName: nextLastName };
}
