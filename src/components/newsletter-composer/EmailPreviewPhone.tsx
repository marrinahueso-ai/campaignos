"use client";

import {
  tryExportNewsletterPreviewFragment,
} from "@/lib/newsletter-composer/export-html";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";
import { cn } from "@/lib/utils/cn";

type EmailPreviewPhoneProps = {
  state: NewsletterComposerState;
  className?: string;
  maxHeightClass?: string;
  showInboxBar?: boolean;
  /** Scroll to bottom for footer-focused live panes */
  scrollToEnd?: boolean;
};

export function EmailPreviewPhone({
  state,
  className,
  maxHeightClass = "max-h-[420px]",
  showInboxBar = true,
  scrollToEnd = false,
}: EmailPreviewPhoneProps) {
  const fragment = tryExportNewsletterPreviewFragment(state) ?? "";

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[272px] rounded-[36px] bg-[#1c2430] px-3 pb-4 pt-3.5 shadow-[0_24px_50px_rgba(28,36,48,0.22)]",
        className,
      )}
    >
      <div className="mx-auto mb-2.5 h-[22px] w-24 rounded-b-[14px] bg-[#111]" />
      <div
        className={cn(
          "overflow-y-auto rounded-[22px] bg-[#f4f1ea]",
          maxHeightClass,
        )}
        ref={(el) => {
          if (el && scrollToEnd) {
            requestAnimationFrame(() => {
              el.scrollTop = el.scrollHeight;
            });
          }
        }}
      >
        {showInboxBar ? (
          <div className="sticky top-0 z-[1] border-b border-black/5 bg-white px-3.5 py-3">
            <p className="mb-1 text-[11px] text-cos-muted">
              {state.fromName || "Hey Ralli"}
            </p>
            <p className="font-display text-base font-semibold leading-snug text-cos-text">
              {state.subject || "Newsletter"}
            </p>
          </div>
        ) : null}
        <div
          className="bg-white p-3 text-left [&_a]:pointer-events-none"
          dangerouslySetInnerHTML={{ __html: fragment }}
        />
      </div>
    </div>
  );
}

type EmailPreviewDesktopProps = {
  state: NewsletterComposerState;
  /**
   * Fake mail-client frame (window bar + Inbox / Starred / Sent rail).
   * Keep on in the composer; turn off for Approvals / detail so reviewers
   * only see the newsletter itself.
   */
  showMailChrome?: boolean;
};

export function EmailPreviewDesktop({
  state,
  showMailChrome = true,
}: EmailPreviewDesktopProps) {
  const fragment = tryExportNewsletterPreviewFragment(state) ?? "";
  const fromName = state.fromName?.trim() || "Hey Ralli";
  const subject = state.subject?.trim() || "Newsletter";

  if (!showMailChrome) {
    return (
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_40px_rgba(28,36,48,0.14)]">
        <div className="border-b border-black/5 bg-white px-5 py-4">
          <p className="mb-1 text-xs text-cos-muted">
            From {fromName} · to your list
          </p>
          <p className="font-display text-xl font-semibold leading-snug text-cos-text sm:text-2xl">
            {subject}
          </p>
        </div>
        <div
          className="mx-auto max-h-[min(62vh,640px)] max-w-[560px] overflow-y-auto bg-white px-5 py-5 [&_a]:pointer-events-none"
          dangerouslySetInnerHTML={{ __html: fragment }}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#e8e4dc] shadow-[0_18px_40px_rgba(28,36,48,0.14)]">
      <div className="flex items-center gap-2.5 border-b border-black/5 bg-[#f3f0ea] px-3.5 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <i className="block h-2.5 w-2.5 rounded-full bg-[#e07a6a]" />
          <i className="block h-2.5 w-2.5 rounded-full bg-[#e0c06a]" />
          <i className="block h-2.5 w-2.5 rounded-full bg-[#7bbf8a]" />
        </div>
        <div className="flex-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-cos-muted">
          mail · Inbox · Newsletter
        </div>
      </div>
      <div className="grid min-h-[420px] bg-white md:grid-cols-[160px_1fr]">
        <aside className="hidden border-r border-black/5 bg-[#f7f4ee] p-3 text-xs md:block">
          <div className="mb-1 rounded-[10px] bg-[rgba(47,74,60,0.12)] px-2.5 py-2 font-semibold text-[#2f4a3c]">
            Inbox
          </div>
          <div className="mb-1 rounded-[10px] px-2.5 py-2 font-semibold text-cos-muted">
            Starred
          </div>
          <div className="rounded-[10px] px-2.5 py-2 font-semibold text-cos-muted">
            Sent
          </div>
        </aside>
        <div className="min-w-0">
          <div className="sticky top-0 z-[1] border-b border-black/5 bg-white px-5 py-4">
            <p className="mb-1 text-xs text-cos-muted">
              From {fromName} · to your list
            </p>
            <p className="font-display text-xl font-semibold leading-snug text-cos-text sm:text-2xl">
              {subject}
            </p>
          </div>
          <div
            className="mx-auto max-h-[480px] max-w-[560px] overflow-y-auto bg-white px-5 py-5 [&_a]:pointer-events-none"
            dangerouslySetInnerHTML={{ __html: fragment }}
          />
        </div>
      </div>
    </div>
  );
}
