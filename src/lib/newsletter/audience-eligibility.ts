import type {
  NewsletterAudienceEligibleContact,
  NewsletterContactStatus,
} from "@/lib/newsletter/types";

/**
 * Pure eligibility computation, extracted from `audiences.ts` (which needs
 * `server-only` to query Supabase) so it can be unit tested without a
 * database. Only `active` contacts are eligible; anything else (unsubscribed,
 * suppressed, bounced, complained) is excluded, and duplicate normalized
 * emails within the same audience are deduped.
 */

export interface EligibilityContactInput {
  contactId: string;
  email: string;
  emailNormalized: string;
  firstName: string;
  lastName: string;
  status: NewsletterContactStatus;
}

export interface EligibilityComputation {
  selected: number;
  excluded: number;
  eligible: number;
  contacts: NewsletterAudienceEligibleContact[];
}

export function computeEligibilityFromContacts(
  members: EligibilityContactInput[],
): EligibilityComputation {
  const selected = members.length;
  const seenEmails = new Set<string>();
  const eligibleContacts: NewsletterAudienceEligibleContact[] = [];

  for (const member of members) {
    if (member.status !== "active") continue;
    if (seenEmails.has(member.emailNormalized)) continue;
    seenEmails.add(member.emailNormalized);
    eligibleContacts.push({
      contactId: member.contactId,
      email: member.email,
      emailNormalized: member.emailNormalized,
      firstName: member.firstName,
      lastName: member.lastName,
    });
  }

  return {
    selected,
    eligible: eligibleContacts.length,
    excluded: selected - eligibleContacts.length,
    contacts: eligibleContacts,
  };
}
