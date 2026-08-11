"use client";

import { useMemo } from "react";

import { EmailPreviewDesktop } from "@/components/newsletter-composer/EmailPreviewPhone";
import { tryExportNewsletterPreviewFragment } from "@/lib/newsletter-composer/export-html";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";
import { cn } from "@/lib/utils/cn";

function canRenderSnapshot(snapshot: unknown): snapshot is NewsletterComposerState {
  return Boolean(tryExportNewsletterPreviewFragment(snapshot));
}

/**
 * Compact scaled HTML preview for Approvals hub cards.
 * Prefer composer snapshot when available; fall back to rendered HTML iframe.
 * Never throws — a bad newsletter snapshot must not blank Approvals.
 */
export function NewsletterApprovalCardPreview({
  subject,
  html,
  snapshot,
  className,
}: {
  subject?: string | null;
  html?: string | null;
  snapshot?: NewsletterComposerState | null;
  className?: string;
}) {
  const snapshotOk = canRenderSnapshot(snapshot);

  if (snapshotOk) {
    return (
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-[14px] bg-[#f4f1ea]",
          className,
        )}
      >
        <span className="absolute top-3 left-3 z-10 rounded-full bg-[rgba(255,252,247,0.92)] px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] text-cos-text uppercase">
          Newsletter
        </span>
        <div className="pointer-events-none origin-top-left scale-[0.42] p-2 sm:scale-[0.48]">
          <div className="w-[560px]">
            <EmailPreviewDesktop state={snapshot} showMailChrome={false} />
          </div>
        </div>
      </div>
    );
  }

  if (html?.trim()) {
    return (
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-[14px] bg-[#f4f1ea]",
          className,
        )}
      >
        <span className="absolute top-3 left-3 z-10 rounded-full bg-[rgba(255,252,247,0.92)] px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] text-cos-text uppercase">
          Newsletter
        </span>
        <iframe
          title={subject?.trim() || "Newsletter preview"}
          srcDoc={html}
          sandbox=""
          className="pointer-events-none h-full min-h-[220px] w-full border-0 bg-[#f4f1ea]"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex min-h-[180px] items-center justify-center overflow-hidden rounded-[14px] bg-cos-bg px-4 text-center",
        className,
      )}
    >
      <span className="absolute top-3 left-3 rounded-full bg-[rgba(255,252,247,0.92)] px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] text-cos-text uppercase">
        Newsletter
      </span>
      <p className="max-w-[28ch] text-sm text-cos-muted">
        {subject?.trim() || "Newsletter draft"} — open review to read the full email.
      </p>
    </div>
  );
}

/** Full review-drawer preview: scrollable desktop email frame. */
export function NewsletterApprovalReviewPreview({
  subject,
  html,
  snapshot,
}: {
  subject?: string | null;
  html?: string | null;
  snapshot?: NewsletterComposerState | null;
}) {
  const srcDoc = useMemo(() => {
    if (!html?.trim()) return null;
    return html;
  }, [html]);

  if (canRenderSnapshot(snapshot)) {
    return (
      <div className="mb-6 overflow-hidden rounded-[16px] border border-cos-border bg-[#f4f1ea] p-3 shadow-[0_8px_24px_rgba(28,36,48,0.06)]">
        <EmailPreviewDesktop state={snapshot} showMailChrome={false} />
      </div>
    );
  }

  if (srcDoc) {
    return (
      <div className="mb-6 overflow-hidden rounded-[16px] border border-cos-border bg-white shadow-[0_8px_24px_rgba(28,36,48,0.06)]">
        <iframe
          title={subject?.trim() || "Newsletter preview"}
          srcDoc={srcDoc}
          sandbox=""
          className="h-[min(62vh,640px)] w-full border-0 bg-[#f4f1ea]"
        />
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-[14px] border border-cos-border bg-white/70 px-4 py-3.5 text-sm text-cos-muted">
      Preview unavailable — open the newsletter detail page to review the draft.
    </div>
  );
}
