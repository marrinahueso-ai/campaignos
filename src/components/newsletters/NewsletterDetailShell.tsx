"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { EmailPreviewDesktop } from "@/components/newsletter-composer/EmailPreviewPhone";
import { SettingsBox } from "@/components/homepage-composer/SettingsBox";
import { NewsletterStatusBadge } from "@/components/newsletters/NewsletterStatusBadge";
import { TeamAccessModal } from "@/components/settings-v2/team-access/TeamAccessModal";
import { Button } from "@/components/ui/Button";
import { newsletterComposerHref } from "@/lib/newsletter/approval";
import {
  beginEditRequiringReapproval,
  submitForApproval,
} from "@/lib/newsletter/actions";
import type {
  Newsletter,
  NewsletterAudience,
  NewsletterSenderProfile,
  NewsletterVersion,
} from "@/lib/newsletter/types";
import { formatDateTime } from "@/lib/utils/dates";

interface AuditEventView {
  id: string;
  eventType: string;
  detail: unknown;
  createdAt: string;
  actorName: string | null;
}

interface NewsletterDetailShellProps {
  newsletter: Newsletter;
  currentVersion: NewsletterVersion | null;
  approvedVersion: NewsletterVersion | null;
  proposedAudience: NewsletterAudience | null;
  approvedAudience: NewsletterAudience | null;
  audiences: NewsletterAudience[];
  senderProfile: NewsletterSenderProfile;
  auditEvents: AuditEventView[];
  creatorName: string | null;
  submittedByName: string | null;
  approvedByName: string | null;
  sentByName: string | null;
  canSendNewsletter: boolean;
  canEditDraft: boolean;
  openPrepareApprovalOnLoad: boolean;
}

const AUDIT_EVENT_LABELS: Record<string, string> = {
  draft_saved: "Draft saved",
  submitted_for_approval: "Submitted for approval",
  changes_requested: "Changes requested",
  approved: "Approved",
  approval_invalidated: "Approval invalidated — content changed",
  audience_changed: "Audience changed",
  test_send: "Test email sent",
  send_started: "Send started",
  send_completed: "Send completed",
  send_failed: "Send failed",
  scheduled: "Send scheduled",
  schedule_cancelled: "Scheduled send cancelled",
  schedule_rescheduled: "Send rescheduled",
};

function auditEventLabel(eventType: string): string {
  return AUDIT_EVENT_LABELS[eventType] ?? eventType.replace(/_/g, " ");
}

function isoToDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalValueToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function PrepareForApprovalModal({
  open,
  onClose,
  newsletter,
  senderProfile,
  audiences,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  newsletter: Newsletter;
  senderProfile: NewsletterSenderProfile;
  audiences: NewsletterAudience[];
  onSubmitted: () => void;
}) {
  const [fromDisplayName, setFromDisplayName] = useState(
    newsletter.fromDisplayName || senderProfile.fromDisplayName,
  );
  const [fromEmail, setFromEmail] = useState(newsletter.fromEmail || senderProfile.fromEmail);
  const [replyToEmail, setReplyToEmail] = useState(
    newsletter.replyToEmail || senderProfile.replyToEmail,
  );
  const [audienceId, setAudienceId] = useState(newsletter.proposedAudienceId ?? "");
  const [proposedSendAt, setProposedSendAt] = useState(
    isoToDatetimeLocalValue(newsletter.proposedSendAt),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!newsletter.subject.trim()) {
      setError("Add a subject in the composer before sending for approval.");
      return;
    }
    if (!audienceId) {
      setError("Choose a proposed audience.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitForApproval({
        newsletterId: newsletter.id,
        fields: {
          fromDisplayName,
          fromEmail,
          replyToEmail,
          proposedAudienceId: audienceId,
          proposedSendAt: datetimeLocalValueToIso(proposedSendAt),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSubmitted();
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TeamAccessModal
      open={open}
      onClose={onClose}
      title="Prepare for approval"
      subtitle="Set who this is from and who it's proposed to go to. An approver reviews these before the newsletter can be sent."
      footer={
        <div className="flex items-center justify-between gap-3">
          {error ? <p className="text-sm text-cos-error" role="alert">{error}</p> : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit for approval"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-cos-text">From name</span>
            <input
              className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
              value={fromDisplayName}
              onChange={(e) => setFromDisplayName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-cos-text">From email</span>
            <input
              className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-cos-text">Reply-to</span>
          <input
            className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
            value={replyToEmail}
            onChange={(e) => setReplyToEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-cos-text">Proposed audience</span>
          <select
            className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
            value={audienceId}
            onChange={(e) => setAudienceId(e.target.value)}
          >
            <option value="">Choose an audience…</option>
            {audiences.map((audience) => (
              <option key={audience.id} value={audience.id}>
                {audience.name}
              </option>
            ))}
          </select>
          {audiences.length === 0 ? (
            <span className="mt-1 block text-xs text-cos-muted">
              No audiences yet —{" "}
              <Link
                href={`/newsletter-contacts?tab=audiences&returnTo=${encodeURIComponent(`/newsletters/${newsletter.id}?prepare=approval`)}`}
                className="font-semibold underline-offset-2 hover:underline"
              >
                create one in Newsletter Contacts
              </Link>
              .
            </span>
          ) : (
            <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cos-muted">
              <Link
                href={`/newsletter-contacts?tab=audiences${audienceId ? `&audienceId=${encodeURIComponent(audienceId)}` : ""}&returnTo=${encodeURIComponent(`/newsletters/${newsletter.id}?prepare=approval`)}`}
                className="font-semibold text-cos-text underline-offset-2 hover:underline"
              >
                {audienceId ? "View / edit audience members" : "Manage audiences & members"}
              </Link>
              <span aria-hidden>·</span>
              <Link
                href={`/newsletter-contacts?tab=contacts&returnTo=${encodeURIComponent(`/newsletters/${newsletter.id}?prepare=approval`)}`}
                className="underline-offset-2 hover:underline"
              >
                Add contacts
              </Link>
            </span>
          )}
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-cos-text">
            Proposed send time <span className="font-normal text-cos-muted">(optional)</span>
          </span>
          <input
            type="datetime-local"
            className="h-10 w-full rounded-lg border border-cos-border bg-cos-card px-3 text-sm text-cos-text outline-none focus:border-cos-brand-sage"
            value={proposedSendAt}
            onChange={(e) => setProposedSendAt(e.target.value)}
          />
          <span className="mt-1 block text-xs text-cos-muted">
            This is a proposal only — it does not schedule anything. Timing is set on the Send
            page after approval.
          </span>
        </label>
      </div>
    </TeamAccessModal>
  );
}

export function NewsletterDetailShell({
  newsletter,
  currentVersion,
  approvedVersion,
  proposedAudience,
  approvedAudience,
  audiences,
  senderProfile,
  auditEvents,
  creatorName,
  submittedByName,
  approvedByName,
  sentByName,
  canSendNewsletter,
  canEditDraft,
  openPrepareApprovalOnLoad,
}: NewsletterDetailShellProps) {
  const router = useRouter();
  const [prepareOpen, setPrepareOpen] = useState(openPrepareApprovalOnLoad);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [reapprovalOpen, setReapprovalOpen] = useState(false);
  const [reapprovalBusy, setReapprovalBusy] = useState(false);
  const [reapprovalError, setReapprovalError] = useState<string | null>(null);

  const composerHref = newsletterComposerHref(newsletter.id);
  const isTerminalSentState =
    newsletter.status === "sending" || newsletter.status === "sent";

  function handleEditContent() {
    if (newsletter.status === "approved" || newsletter.status === "scheduled") {
      setReapprovalError(null);
      setReapprovalOpen(true);
      return;
    }
    router.push(composerHref);
  }

  async function confirmEditRequireReapproval() {
    setReapprovalBusy(true);
    setReapprovalError(null);
    try {
      const result = await beginEditRequiringReapproval({
        newsletterId: newsletter.id,
      });
      if (!result.ok) {
        setReapprovalError(result.error);
        return;
      }
      setReapprovalOpen(false);
      router.push(composerHref);
      router.refresh();
    } catch {
      setReapprovalError("Could not clear approval. Try again.");
    } finally {
      setReapprovalBusy(false);
    }
  }

  const previewState =
    newsletter.status === "approved" ||
    newsletter.status === "scheduled" ||
    isTerminalSentState ||
    newsletter.status === "failed"
      ? approvedVersion?.snapshot ?? newsletter.composerState
      : currentVersion?.snapshot ?? newsletter.composerState;

  return (
    <div className="studio-page space-y-6">
      <div>
        <Link
          href="/newsletters"
          className="text-sm font-semibold text-cos-muted transition hover:text-cos-text"
        >
          ← Newsletters
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3.5">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold tracking-[-0.02em] text-cos-text">
              {newsletter.title || "Untitled newsletter"}
            </h1>
            <NewsletterStatusBadge status={newsletter.status} />
          </div>
          {newsletter.subject ? (
            <p className="text-sm text-cos-muted">Subject: {newsletter.subject}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(newsletter.status === "draft" || newsletter.status === "changes_requested") &&
          canEditDraft ? (
            <>
              <Button type="button" variant="secondary" onClick={handleEditContent}>
                Edit content
              </Button>
              <Button type="button" onClick={() => setPrepareOpen(true)}>
                Send for approval
              </Button>
            </>
          ) : null}

          {newsletter.status === "approved" ? (
            <>
              {canEditDraft ? (
                <Button type="button" variant="secondary" onClick={handleEditContent}>
                  Edit content
                </Button>
              ) : null}
              {canSendNewsletter ? (
                <Link
                  href={`/newsletters/${newsletter.id}/send`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-cos-primary px-4 text-sm font-bold text-[#f6f2eb] transition hover:bg-cos-primary-hover"
                >
                  Continue to send
                </Link>
              ) : null}
            </>
          ) : null}

          {newsletter.status === "scheduled" && canSendNewsletter ? (
            <Link
              href={`/newsletters/${newsletter.id}/send`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-cos-primary px-4 text-sm font-bold text-[#f6f2eb] transition hover:bg-cos-primary-hover"
            >
              Manage schedule
            </Link>
          ) : null}
        </div>
      </header>

      {justSubmitted ? (
        <div className="rounded-2xl border border-cos-brand-sage/30 bg-cos-brand-sage-soft px-4 py-3 text-sm font-semibold text-cos-brand-sage">
          Sent for approval — an approver has been notified.
        </div>
      ) : null}

      {newsletter.status === "needs_approval" ? (
        <div className="rounded-2xl border border-cos-border bg-cos-card px-4 py-3.5 text-sm text-cos-muted shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
          Submitted for approval — waiting on an approver. You&apos;ll see the status update here
          once it&apos;s reviewed.
        </div>
      ) : null}

      {newsletter.status === "changes_requested" && newsletter.changeRequestNote ? (
        <div className="rounded-2xl border border-cos-brand-terracotta/30 bg-cos-brand-terracotta-soft px-4 py-3.5 text-sm text-cos-brand-terracotta">
          <p className="font-semibold">Changes requested</p>
          <p className="mt-1">{newsletter.changeRequestNote}</p>
        </div>
      ) : null}

      {newsletter.status === "approved" && !canSendNewsletter ? (
        <div className="rounded-2xl border border-cos-brand-sage/30 bg-cos-brand-sage-soft px-4 py-3.5 text-sm font-semibold text-cos-brand-sage">
          Approved. A teammate with send access has been notified to continue this newsletter.
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <SettingsBox
            title="Details"
            description="Who this is from and who it's going to."
            compact
          >
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-cos-muted">From</dt>
              <dd className="text-cos-text">
                {newsletter.fromDisplayName || "—"}
                {newsletter.fromEmail ? (
                  <span className="text-cos-muted"> ({newsletter.fromEmail})</span>
                ) : null}
              </dd>
              <dt className="text-cos-muted">Reply-to</dt>
              <dd className="text-cos-text">{newsletter.replyToEmail || "—"}</dd>
              <dt className="text-cos-muted">Created by</dt>
              <dd className="text-cos-text">
                {creatorName ?? "—"}
                <span className="text-cos-muted">
                  {" "}
                  · {formatDateTime(newsletter.createdAt)}
                </span>
              </dd>
              <dt className="text-cos-muted">Submitted by</dt>
              <dd className="text-cos-text">
                {submittedByName || newsletter.submittedAt ? (
                  <>
                    {submittedByName ?? "—"}
                    {newsletter.submittedAt ? (
                      <span className="text-cos-muted">
                        {" "}
                        · {formatDateTime(newsletter.submittedAt)}
                      </span>
                    ) : null}
                  </>
                ) : (
                  "—"
                )}
              </dd>
              {approvedByName || newsletter.approvedAt ? (
                <>
                  <dt className="text-cos-muted">Approved by</dt>
                  <dd className="text-cos-text">
                    {approvedByName ?? "—"}
                    {newsletter.approvedAt ? (
                      <span className="text-cos-muted">
                        {" "}
                        · {formatDateTime(newsletter.approvedAt)}
                      </span>
                    ) : null}
                  </dd>
                </>
              ) : null}
              {sentByName || newsletter.sentAt ? (
                <>
                  <dt className="text-cos-muted">Sent by</dt>
                  <dd className="text-cos-text">
                    {sentByName ?? "—"}
                    {newsletter.sentAt ? (
                      <span className="text-cos-muted">
                        {" "}
                        · {formatDateTime(newsletter.sentAt)}
                      </span>
                    ) : null}
                  </dd>
                </>
              ) : null}
              <dt className="text-cos-muted">Proposed audience</dt>
              <dd className="text-cos-text">
                {proposedAudience ? (
                  <Link
                    href={`/newsletter-contacts?tab=audiences&audienceId=${encodeURIComponent(proposedAudience.id)}&returnTo=${encodeURIComponent(`/newsletters/${newsletter.id}`)}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {proposedAudience.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="text-cos-muted">Approved audience</dt>
              <dd className="text-cos-text">
                {approvedAudience ? (
                  <Link
                    href={`/newsletter-contacts?tab=audiences&audienceId=${encodeURIComponent(approvedAudience.id)}&returnTo=${encodeURIComponent(`/newsletters/${newsletter.id}`)}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {approvedAudience.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="text-cos-muted">Proposed send time</dt>
              <dd className="text-cos-text">
                {newsletter.proposedSendAt ? formatDateTime(newsletter.proposedSendAt) : "—"}
              </dd>
              <dt className="text-cos-muted">Scheduled send time</dt>
              <dd className="text-cos-text">
                {newsletter.scheduledSendAt ? formatDateTime(newsletter.scheduledSendAt) : "—"}
              </dd>
              {newsletter.lastFailureReason ? (
                <>
                  <dt className="text-cos-muted">Last failure</dt>
                  <dd className="text-cos-error">{newsletter.lastFailureReason}</dd>
                </>
              ) : null}
            </dl>
          </SettingsBox>

          <SettingsBox title="Workflow history" description="Newest first." compact>
            {auditEvents.length === 0 ? (
              <p className="text-sm text-cos-muted">No activity yet.</p>
            ) : (
              <ul className="max-h-[22rem] space-y-2.5 overflow-y-auto pr-1">
                {auditEvents.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-cos-text">{auditEventLabel(event.eventType)}</p>
                      {event.actorName ? (
                        <p className="text-xs text-cos-muted">{event.actorName}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs text-cos-muted">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SettingsBox>
        </div>

        <SettingsBox
          title="Preview"
          description={
            newsletter.status === "draft" || newsletter.status === "needs_approval" || newsletter.status === "changes_requested"
              ? "Live draft content."
              : "The approved version."
          }
        >
          <EmailPreviewDesktop state={previewState} showMailChrome={false} />
        </SettingsBox>
      </div>

      <PrepareForApprovalModal
        open={prepareOpen}
        onClose={() => setPrepareOpen(false)}
        newsletter={newsletter}
        senderProfile={senderProfile}
        audiences={audiences}
        onSubmitted={() => {
          setPrepareOpen(false);
          setJustSubmitted(true);
          router.refresh();
        }}
      />

      <TeamAccessModal
        open={reapprovalOpen}
        onClose={() => {
          if (!reapprovalBusy) setReapprovalOpen(false);
        }}
        title="Edit content?"
        subtitle="Editing this newsletter will remove its approval. You will need to submit it for approval again before sending."
        footer={
          <div className="flex items-center justify-between gap-3">
            {reapprovalError ? (
              <p className="text-sm text-cos-error" role="alert">
                {reapprovalError}
              </p>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReapprovalOpen(false)}
                disabled={reapprovalBusy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmEditRequireReapproval}
                disabled={reapprovalBusy}
              >
                {reapprovalBusy ? "Working…" : "Edit & Require Reapproval"}
              </Button>
            </div>
          </div>
        }
      >
        <p className="text-sm text-cos-muted">
          Production send stays blocked until this newsletter is approved again.
        </p>
      </TeamAccessModal>
    </div>
  );
}
