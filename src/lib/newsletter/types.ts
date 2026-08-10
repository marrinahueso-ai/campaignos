import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";

/**
 * Newsletter lifecycle status.
 *
 * draft              → being edited, never submitted (or pulled back via invalidation)
 * needs_approval     → submitted, waiting on an approver
 * changes_requested  → approver asked for changes (bridges to approval_scheduling_items)
 * approved           → approver signed off on a specific version + audience
 * scheduled          → a scheduled send is queued against the approved version
 * sending            → a send is actively in flight (single-flight guard)
 * sent               → the most recent send completed
 * failed             → the most recent send failed outright
 */
export type NewsletterStatus =
  | "draft"
  | "needs_approval"
  | "changes_requested"
  | "approved"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed";

export const NEWSLETTER_STATUSES: NewsletterStatus[] = [
  "draft",
  "needs_approval",
  "changes_requested",
  "approved",
  "scheduled",
  "sending",
  "sent",
  "failed",
];

/** Contact deliverability status. Never silently reactivated once left `active`. */
export type NewsletterContactStatus =
  | "active"
  | "unsubscribed"
  | "suppressed"
  | "bounced"
  | "complained";

export const NEWSLETTER_CONTACT_STATUSES: NewsletterContactStatus[] = [
  "active",
  "unsubscribed",
  "suppressed",
  "bounced",
  "complained",
];

/** Statuses a re-import must never clear back to `active`. */
export const NEWSLETTER_CONTACT_LOCKED_STATUSES: NewsletterContactStatus[] = [
  "unsubscribed",
  "suppressed",
  "bounced",
  "complained",
];

export type NewsletterContactSource = "manual" | "csv_import" | "api";

export type NewsletterSendKind = "production" | "test";

export type NewsletterSendStatus =
  | "pending"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

export type NewsletterSendRecipientStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "skipped";

export type NewsletterDeliveryEventType =
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "opened"
  | "clicked";

/** Provider-neutral field today; Resend is the only wired provider. */
export type NewsletterSendProvider = "resend";

// ---------------------------------------------------------------------------
// Database row shapes (snake_case — mirror `newsletter_*` tables)
// ---------------------------------------------------------------------------

export interface NewsletterRow {
  id: string;
  organization_id: string;
  title: string;
  status: NewsletterStatus;
  current_version_id: string | null;
  approved_version_id: string | null;
  composer_state: unknown;
  proposed_audience_id: string | null;
  approved_audience_id: string | null;
  proposed_send_at: string | null;
  scheduled_send_at: string | null;
  sent_at: string | null;
  from_display_name: string;
  from_email: string;
  reply_to_email: string;
  subject: string;
  preheader: string | null;
  approval_scheduling_item_id: string | null;
  change_request_note: string | null;
  created_by: string | null;
  updated_by: string | null;
  submitted_by: string | null;
  approved_by: string | null;
  sent_by: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  last_failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Newsletter {
  id: string;
  organizationId: string;
  title: string;
  status: NewsletterStatus;
  currentVersionId: string | null;
  approvedVersionId: string | null;
  composerState: NewsletterComposerState;
  proposedAudienceId: string | null;
  approvedAudienceId: string | null;
  proposedSendAt: string | null;
  scheduledSendAt: string | null;
  sentAt: string | null;
  fromDisplayName: string;
  fromEmail: string;
  replyToEmail: string;
  subject: string;
  preheader: string | null;
  approvalSchedulingItemId: string | null;
  changeRequestNote: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  submittedBy: string | null;
  approvedBy: string | null;
  sentBy: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  lastFailureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Server-controlled compliance footer data frozen onto a version + send. */
export interface NewsletterComplianceFooterData {
  organizationName: string;
  physicalAddress: string;
  whyReceiving: string;
  /** Literal placeholder token — replaced per-recipient at send time. */
  unsubscribeUrlPlaceholder: string;
}

export interface NewsletterVersionRow {
  id: string;
  newsletter_id: string;
  organization_id: string;
  version_number: number;
  content_fingerprint: string;
  snapshot: unknown;
  rendered_html: string;
  subject: string;
  preheader: string | null;
  from_display_name: string;
  from_email: string;
  reply_to_email: string;
  audience_id: string | null;
  proposed_send_at: string | null;
  compliance_footer: unknown;
  created_by: string | null;
  created_at: string;
}

export interface NewsletterVersion {
  id: string;
  newsletterId: string;
  organizationId: string;
  versionNumber: number;
  contentFingerprint: string;
  snapshot: NewsletterComposerState;
  renderedHtml: string;
  subject: string;
  preheader: string | null;
  fromDisplayName: string;
  fromEmail: string;
  replyToEmail: string;
  audienceId: string | null;
  proposedSendAt: string | null;
  complianceFooter: NewsletterComplianceFooterData | null;
  createdBy: string | null;
  createdAt: string;
}

export interface NewsletterContactRow {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  email_normalized: string;
  status: NewsletterContactStatus;
  source: NewsletterContactSource;
  consent_attested_at: string | null;
  consent_attested_by: string | null;
  consent_note: string | null;
  import_batch_id: string | null;
  unsubscribed_at: string | null;
  suppressed_at: string | null;
  suppression_reason: string | null;
  added_at: string;
  created_at: string;
  updated_at: string;
}

export interface NewsletterContact {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  emailNormalized: string;
  status: NewsletterContactStatus;
  source: NewsletterContactSource;
  consentAttestedAt: string | null;
  consentAttestedBy: string | null;
  consentNote: string | null;
  importBatchId: string | null;
  unsubscribedAt: string | null;
  suppressedAt: string | null;
  suppressionReason: string | null;
  addedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterAudienceRow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterAudience {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterAudienceMemberRow {
  audience_id: string;
  contact_id: string;
  organization_id: string;
  added_at: string;
}

export interface NewsletterImportBatchRow {
  id: string;
  organization_id: string;
  filename: string | null;
  imported_by: string | null;
  row_count: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  suppressed_skipped_count: number;
  authorization_attested: boolean;
  authorization_attested_at: string | null;
  created_at: string;
}

export interface NewsletterSenderProfileRow {
  organization_id: string;
  from_display_name: string;
  from_email: string;
  reply_to_email: string;
  physical_address_override: string | null;
  resend_domain_verified: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface NewsletterSenderProfile {
  organizationId: string;
  fromDisplayName: string;
  fromEmail: string;
  replyToEmail: string;
  physicalAddressOverride: string | null;
  resendDomainVerified: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface NewsletterSendRow {
  id: string;
  organization_id: string;
  newsletter_id: string;
  version_id: string;
  audience_id: string | null;
  send_kind: NewsletterSendKind;
  status: NewsletterSendStatus;
  idempotency_key: string;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  selected_count: number;
  excluded_count: number;
  eligible_count: number;
  delivered_count: number;
  failed_count: number;
  from_display_name: string;
  from_email: string;
  reply_to_email: string;
  subject: string;
  rendered_html: string;
  provider: NewsletterSendProvider;
  provider_batch_ids: unknown;
  failure_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSend {
  id: string;
  organizationId: string;
  newsletterId: string;
  versionId: string;
  audienceId: string | null;
  sendKind: NewsletterSendKind;
  status: NewsletterSendStatus;
  idempotencyKey: string;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  selectedCount: number;
  excludedCount: number;
  eligibleCount: number;
  deliveredCount: number;
  failedCount: number;
  fromDisplayName: string;
  fromEmail: string;
  replyToEmail: string;
  subject: string;
  renderedHtml: string;
  provider: NewsletterSendProvider;
  providerBatchIds: string[];
  failureReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterSendRecipientRow {
  id: string;
  organization_id: string;
  send_id: string;
  contact_id: string | null;
  email: string;
  email_normalized: string;
  status: NewsletterSendRecipientStatus;
  provider_message_id: string | null;
  unsubscribe_token_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface NewsletterSendRecipient {
  id: string;
  organizationId: string;
  sendId: string;
  contactId: string | null;
  email: string;
  emailNormalized: string;
  status: NewsletterSendRecipientStatus;
  providerMessageId: string | null;
  unsubscribeTokenId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface NewsletterDeliveryEventRow {
  id: string;
  organization_id: string | null;
  send_id: string | null;
  recipient_id: string | null;
  provider: NewsletterSendProvider;
  provider_event_id: string | null;
  event_type: string;
  payload: unknown;
  created_at: string;
}

export interface NewsletterAuditEventRow {
  id: string;
  organization_id: string;
  newsletter_id: string | null;
  actor_user_id: string | null;
  event_type: string;
  detail: unknown;
  created_at: string;
}

export interface NewsletterUnsubscribeTokenRow {
  id: string;
  organization_id: string;
  contact_id: string;
  token_hash: string;
  send_id: string | null;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Audience eligibility
// ---------------------------------------------------------------------------

export interface NewsletterAudienceEligibleContact {
  contactId: string;
  email: string;
  emailNormalized: string;
  firstName: string;
  lastName: string;
}

export interface NewsletterAudienceEligibility {
  audienceId: string;
  /** Total members assigned to the audience. */
  selected: number;
  /** Members excluded for deliverability reasons (not active). */
  excluded: number;
  /** Deliverable (active, deduped) contacts. */
  eligible: number;
  contacts: NewsletterAudienceEligibleContact[];
}

// ---------------------------------------------------------------------------
// Send validation
// ---------------------------------------------------------------------------

export interface NewsletterSendValidationContext {
  newsletter: Newsletter;
  version: NewsletterVersion;
  audience: NewsletterAudience;
  eligibility: NewsletterAudienceEligibility;
  senderProfile: NewsletterSenderProfile;
}

export type NewsletterSendValidationResult =
  | { ok: true; context: NewsletterSendValidationContext }
  | { ok: false; errors: string[] };

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export interface NewsletterImportContactRow {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface NewsletterImportResult {
  batchId: string | null;
  rowCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  suppressedSkippedCount: number;
  errors: string[];
}
