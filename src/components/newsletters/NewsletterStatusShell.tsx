"use client";

import Link from "next/link";
import { Calendar, CheckCircle2, MessageSquareWarning, Send } from "lucide-react";

import { EmailPreviewDesktop } from "@/components/newsletter-composer/EmailPreviewPhone";
import { NewsletterStatusBadge } from "@/components/newsletters/NewsletterStatusBadge";
import { Button } from "@/components/ui/Button";
import { newsletterComposerHref } from "@/lib/newsletter/approval";
import type { Newsletter, NewsletterAudience } from "@/lib/newsletter/types";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";
import { formatDateTime } from "@/lib/utils/dates";

type Props = {
  newsletter: Newsletter;
  previewState: NewsletterComposerState;
  audience: NewsletterAudience | null;
  audienceCount: number | null;
  creatorName: string | null;
  submittedByName: string | null;
  approvedByName: string | null;
  sentByName: string | null;
  approverName: string | null;
  canEditDraft: boolean;
};

export function NewsletterStatusShell({
  newsletter,
  previewState,
  audience,
  audienceCount,
  creatorName,
  submittedByName,
  approvedByName,
  sentByName,
  approverName,
  canEditDraft,
}: Props) {
  const status = newsletter.status;
  const isChanges = status === "changes_requested";
  const isWaiting = status === "needs_approval";
  const isScheduled =
    status === "scheduled" || status === "approved" || status === "sending";
  const isSent = status === "sent";
  const composerHref = newsletterComposerHref(newsletter.id);
  const previewHref = `/newsletters/${newsletter.id}/preview`;

  const headline = isChanges
    ? "Changes Requested"
    : isWaiting
      ? "Waiting for Approval"
      : isSent
        ? "Sent"
        : isScheduled
          ? "Approved & Scheduled"
          : "Newsletter";

  const scheduleLabel =
    newsletter.scheduledSendAt || newsletter.proposedSendAt
      ? formatDateTime(newsletter.scheduledSendAt ?? newsletter.proposedSendAt!)
      : "—";

  return (
    <div className="studio-page space-y-6 pb-16">
      <div>
        <Link
          href="/newsletters"
          className="text-sm font-semibold text-cos-muted transition hover:text-cos-text"
        >
          ← Newsletters
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold tracking-[-0.02em] text-cos-text">
              {newsletter.title || "Untitled newsletter"}
            </h1>
            <NewsletterStatusBadge status={status} />
          </div>
          <p className="text-sm text-cos-muted">{headline}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isChanges && canEditDraft ? (
            <Link
              href={composerHref}
              className="inline-flex h-10 items-center justify-center rounded-full bg-cos-primary px-5 text-sm font-bold text-[#f6f2eb] transition hover:bg-cos-primary-hover"
            >
              Edit Newsletter
            </Link>
          ) : null}
          {(status === "draft" || status === "failed") && canEditDraft ? (
            <>
              <Link href={composerHref}>
                <Button type="button" variant="secondary">
                  Edit
                </Button>
              </Link>
              <Link href={previewHref}>
                <Button type="button">Preview &amp; Send Details</Button>
              </Link>
            </>
          ) : null}
          {isChanges && canEditDraft ? (
            <Link href={previewHref}>
              <Button type="button" variant="secondary">
                Preview &amp; Resubmit
              </Button>
            </Link>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <aside className="space-y-4">
          {isChanges && newsletter.changeRequestNote ? (
            <div className="rounded-[22px] border border-amber-100 bg-amber-50 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-amber-700 uppercase">
                <MessageSquareWarning className="h-4 w-4" />
                Feedback
              </div>
              <p className="text-sm leading-relaxed text-amber-900 italic">
                “{newsletter.changeRequestNote}”
              </p>
              {approverName ? (
                <p className="text-[10px] font-bold tracking-widest text-amber-700 uppercase">
                  From {approverName}
                  {newsletter.updatedAt ? ` · ${formatDateTime(newsletter.updatedAt)}` : ""}
                </p>
              ) : null}
            </div>
          ) : null}

          {isWaiting ? (
            <div className="rounded-[22px] border border-cos-border bg-cos-card p-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
              <p className="text-sm text-cos-muted">
                Submitted
                {submittedByName || creatorName
                  ? ` by ${submittedByName ?? creatorName}`
                  : ""}
                {newsletter.submittedAt
                  ? ` · ${formatDateTime(newsletter.submittedAt)}`
                  : ""}
                . Waiting on{" "}
                <span className="font-semibold text-cos-text">
                  {approverName ?? "an approver"}
                </span>
                .
              </p>
            </div>
          ) : null}

          {isScheduled ? (
            <div className="rounded-[22px] border border-[#e6f3ee] bg-[#e6f3ee]/70 p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-[#0d7e5e] uppercase">
                <CheckCircle2 className="h-4 w-4" />
                Approved &amp; Scheduled
              </div>
              <p className="text-sm text-cos-text">
                Set to send{" "}
                <span className="font-semibold">{scheduleLabel}</span>
                {approvedByName ? ` · approved by ${approvedByName}` : ""}
                {newsletter.approvedAt
                  ? ` · ${formatDateTime(newsletter.approvedAt)}`
                  : ""}
                .
              </p>
            </div>
          ) : null}

          {isSent ? (
            <div className="rounded-[22px] border border-cos-border bg-cos-card p-5 space-y-2 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
              <div className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-cos-muted uppercase">
                <Send className="h-4 w-4" />
                Sent
              </div>
              <p className="text-sm text-cos-text">
                {newsletter.sentAt ? formatDateTime(newsletter.sentAt) : "—"}
                {sentByName ? ` · ${sentByName}` : ""}
              </p>
            </div>
          ) : null}

          <div className="rounded-[22px] border border-cos-border bg-cos-card p-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
            <p className="mb-4 text-[10px] font-extrabold tracking-[0.12em] text-cos-muted uppercase">
              Details
            </p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-cos-muted">Recipients</dt>
                <dd className="text-right font-semibold text-cos-text">
                  {audience ? (
                    <Link
                      href={`/newsletter-contacts?tab=audiences&audienceId=${encodeURIComponent(audience.id)}&returnTo=${encodeURIComponent(`/newsletters/${newsletter.id}`)}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {audience.name}
                      {audienceCount != null ? ` (${audienceCount})` : ""}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-cos-muted">
                  <Calendar className="h-3.5 w-3.5" />
                  Schedule
                </dt>
                <dd className="text-right font-semibold text-cos-text">{scheduleLabel}</dd>
              </div>
              {approverName ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-cos-muted">Approver</dt>
                  <dd className="text-right font-semibold text-cos-text">{approverName}</dd>
                </div>
              ) : null}
              {newsletter.approvedAt ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-cos-muted">Approved</dt>
                  <dd className="text-right font-semibold text-cos-text">
                    {formatDateTime(newsletter.approvedAt)}
                  </dd>
                </div>
              ) : null}
              {newsletter.sentAt ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-cos-muted">Sent</dt>
                  <dd className="text-right font-semibold text-cos-text">
                    {formatDateTime(newsletter.sentAt)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </aside>

        <div className="rounded-[22px] border border-cos-border bg-[#f5f2eb] p-4 shadow-[0_8px_28px_rgba(28,36,48,0.06)] sm:p-6">
          <EmailPreviewDesktop state={previewState} showMailChrome={false} />
        </div>
      </div>
    </div>
  );
}
