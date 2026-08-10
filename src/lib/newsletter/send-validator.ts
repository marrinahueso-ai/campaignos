import "server-only";

import { hasPermission } from "@/lib/access-templates/effective-access";
import {
  hasRequiredMailingAddress,
} from "@/lib/newsletter/compliance-footer";
import { isValidEmailFormat } from "@/lib/newsletter/normalize-email";
import { isNewsletterProductionSendEnabled } from "@/lib/newsletter/production-gate";
import { getNewsletterAudienceById, computeAudienceEligibility } from "@/lib/newsletter/audiences";
import { getNewsletterById } from "@/lib/newsletter/queries";
import { resolveAuthorizedFromAddress, getOrCreateSenderProfile } from "@/lib/newsletter/sender";
import {
  runNewsletterSendChecks,
  type NewsletterSendCheckFacts,
} from "@/lib/newsletter/send-validator-checks";
import type { NewsletterSendValidationResult } from "@/lib/newsletter/types";
import { getNewsletterVersionById } from "@/lib/newsletter/versions";
import { getOrganizationById } from "@/lib/organizations/fetch-organization";
import { createClient } from "@/lib/supabase/server";

export interface ValidateNewsletterForSendInput {
  organizationId: string;
  newsletterId: string;
  /** Pass a pre-resolved permission check (e.g. from a server action) to avoid a second lookup. */
  hasSendPermission?: boolean;
}

/**
 * Final, fail-closed validator run immediately before Send Now / Schedule.
 * Every check must pass — any single failure blocks the send.
 */
export async function validateNewsletterForSend(
  input: ValidateNewsletterForSendInput,
): Promise<NewsletterSendValidationResult> {
  const newsletter = await getNewsletterById(input.organizationId, input.newsletterId);
  if (!newsletter) {
    return { ok: false, errors: ["Newsletter not found."] };
  }

  const hasSendPermission =
    input.hasSendPermission ?? (await hasPermission("send_newsletter"));

  const [version, organization, senderProfile] = await Promise.all([
    newsletter.currentVersionId
      ? getNewsletterVersionById(input.organizationId, newsletter.currentVersionId)
      : Promise.resolve(null),
    getOrganizationById(input.organizationId),
    getOrCreateSenderProfile(input.organizationId),
  ]);

  if (!version) {
    return { ok: false, errors: ["No current version exists for this newsletter."] };
  }

  const audience = newsletter.approvedAudienceId
    ? await getNewsletterAudienceById(input.organizationId, newsletter.approvedAudienceId)
    : null;
  const eligibility = newsletter.approvedAudienceId
    ? await computeAudienceEligibility(input.organizationId, newsletter.approvedAudienceId)
    : { audienceId: "", selected: 0, excluded: 0, eligible: 0, contacts: [] };

  const authorizedSender = resolveAuthorizedFromAddress(senderProfile, newsletter.fromEmail);

  const hasMailingAddress =
    Boolean(version.complianceFooter?.physicalAddress?.trim()) &&
    Boolean(
      organization &&
        hasRequiredMailingAddress({
          addressLine1: organization.addressLine1,
          addressLine2: organization.addressLine2,
          city: organization.city,
          state: organization.state,
          postalCode: organization.postalCode,
          country: organization.country,
          override: senderProfile.physicalAddressOverride,
        }),
    );

  const supabase = await createClient();
  const { data: activeSends } = await supabase
    .from("newsletter_sends")
    .select("id, status")
    .eq("newsletter_id", newsletter.id)
    .in("status", ["sending", "sent"]);

  const hasDuplicateActiveSend = Boolean(
    activeSends?.some(
      (row) => (row as { status: string }).status === "sending",
    ) ||
      (newsletter.status === "sent" &&
        activeSends?.some((row) => (row as { status: string }).status === "sent")),
  );

  const facts: NewsletterSendCheckFacts = {
    hasSendPermission,
    status: newsletter.status,
    currentVersionId: newsletter.currentVersionId,
    approvedVersionId: newsletter.approvedVersionId,
    versionAudienceId: version.audienceId,
    approvedAudienceId: newsletter.approvedAudienceId,
    subject: newsletter.subject,
    authorizedSender,
    replyToEmailValid: isValidEmailFormat(newsletter.replyToEmail || ""),
    hasMailingAddress,
    hasComplianceFooter: Boolean(version.complianceFooter),
    canGenerateUnsubscribeTokens: true,
    eligibleRecipientCount: eligibility.eligible,
    productionSendEnabled: isNewsletterProductionSendEnabled(),
    hasDuplicateActiveSend,
  };

  const errors = runNewsletterSendChecks(facts);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (!audience) {
    return { ok: false, errors: ["Approved audience could not be loaded."] };
  }

  return {
    ok: true,
    context: { newsletter, version, audience, eligibility, senderProfile },
  };
}
