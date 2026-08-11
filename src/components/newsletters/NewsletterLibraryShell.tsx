"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Plus, Users } from "lucide-react";

import { NewsletterLibraryCardPreview } from "@/components/newsletters/NewsletterLibraryCardPreview";
import { NewsletterStatusBadge } from "@/components/newsletters/NewsletterStatusBadge";
import {
  NEWSLETTER_LIBRARY_FILTERS,
  newsletterLibraryHref,
  newsletterMatchesLibraryFilter,
  type NewsletterLibraryFilter,
} from "@/lib/newsletter/library-filters";
import type { Newsletter, NewsletterStatus } from "@/lib/newsletter/types";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

export type NewsletterLibraryCard = {
  newsletter: Newsletter;
  audienceName: string | null;
  audienceCount: number | null;
};

type Props = {
  cards: NewsletterLibraryCard[];
  filter: NewsletterLibraryFilter;
  canManageContacts: boolean;
  recentActivityLabel?: string | null;
};

function cardCta(status: NewsletterStatus): string {
  switch (status) {
    case "changes_requested":
      return "Review";
    case "needs_approval":
      return "View status";
    case "scheduled":
    case "approved":
      return "View schedule";
    case "sent":
      return "Open";
    default:
      return "Continue";
  }
}

function audienceSummary(
  audienceName: string | null,
  audienceCount: number | null,
): string {
  if (!audienceName) return "No audience yet";
  if (audienceCount == null) return audienceName;
  return `${audienceName} · ${audienceCount}`;
}

function scheduleOrSentLabel(newsletter: Newsletter): string {
  if (newsletter.sentAt) return `Sent ${formatDateTime(newsletter.sentAt)}`;
  if (newsletter.scheduledSendAt) {
    return `Scheduled ${formatDateTime(newsletter.scheduledSendAt)}`;
  }
  if (newsletter.proposedSendAt) {
    return `Proposed ${formatDateTime(newsletter.proposedSendAt)}`;
  }
  return `Updated ${formatDateTime(newsletter.updatedAt)}`;
}

export function NewsletterLibraryShell({
  cards,
  filter,
  canManageContacts,
  recentActivityLabel,
}: Props) {
  const router = useRouter();

  const visible =
    filter === "templates"
      ? []
      : cards.filter((card) =>
          newsletterMatchesLibraryFilter(card.newsletter.status, filter),
        );

  function setFilter(next: NewsletterLibraryFilter) {
    const params = new URLSearchParams();
    if (next !== "all") params.set("filter", next);
    const qs = params.toString();
    router.replace(qs ? `/newsletters?${qs}` : "/newsletters");
  }

  return (
    <div className="studio-page space-y-10 pb-16">
      <header className="grid gap-10 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-7 space-y-5 pt-2">
          <p className="studio-eyebrow">Your Library</p>
          <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-cos-text">
            Newsletters
          </h1>
          <p className="max-w-[36ch] text-lg leading-relaxed text-cos-muted">
            Create, review, send, and revisit your school newsletters — all in one place.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/newsletters/new"
              className="inline-flex items-center gap-2 rounded-full bg-cos-primary px-6 py-3 text-sm font-bold text-[#f6f2eb] transition hover:bg-cos-primary-hover"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              New Newsletter
            </Link>
            {canManageContacts ? (
              <Link
                href="/newsletter-contacts"
                className="inline-flex items-center gap-2 rounded-full border border-cos-border bg-cos-card px-5 py-3 text-sm font-semibold text-cos-text transition hover:border-cos-brand-sage"
              >
                <Users className="h-4 w-4" strokeWidth={1.75} />
                Contacts
              </Link>
            ) : null}
          </div>
        </div>
        <div className="relative lg:col-span-5">
          <div className="aspect-[4/5] overflow-hidden rounded-[28px] border border-cos-border bg-gradient-to-br from-[#e8eee9] via-[#f4f1ea] to-[#dfe8e3] shadow-[0_18px_40px_rgba(28,36,48,0.12)]">
            <div className="flex h-full flex-col justify-end p-8">
              <Mail className="mb-4 h-10 w-10 text-[#2f4a3c]" strokeWidth={1.5} />
              <p className="font-display text-2xl font-semibold text-cos-text">
                Your events. Your way.
              </p>
              <p className="mt-2 text-sm text-cos-muted">
                Build from real Hey Ralli events, then approve &amp; schedule in one flow.
              </p>
            </div>
          </div>
          {recentActivityLabel ? (
            <div className="absolute -bottom-4 -left-3 max-w-xs rounded-2xl border border-cos-border bg-cos-card p-4 shadow-[0_10px_30px_rgba(28,36,48,0.1)]">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#0d7e5e]" />
                <span className="text-[10px] font-extrabold tracking-[0.14em] text-cos-muted uppercase">
                  Live updates
                </span>
              </div>
              <p className="text-sm font-medium text-cos-text">{recentActivityLabel}</p>
            </div>
          ) : null}
        </div>
      </header>

      <div className="overflow-x-auto">
        <div className="inline-flex rounded-full border border-cos-border bg-cos-bg-alt p-1.5">
          {NEWSLETTER_LIBRARY_FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition",
                filter === tab.id
                  ? "bg-cos-card text-cos-text shadow-sm"
                  : "text-cos-muted hover:text-cos-text",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filter === "templates" ? (
        <div className="rounded-[22px] border border-cos-border bg-cos-card px-6 py-12 text-center shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
          <h2 className="font-display text-2xl font-semibold text-cos-text">
            Start from a template
          </h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-sm text-cos-muted">
            Templates are starting block arrangements — not separate editors.
          </p>
          <Link
            href="/newsletters/new"
            className="mt-6 inline-flex rounded-full bg-cos-primary px-6 py-3 text-sm font-bold text-[#f6f2eb] transition hover:bg-cos-primary-hover"
          >
            Choose template
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[22px] border border-cos-border bg-cos-card px-6 py-12 text-center text-sm text-cos-muted shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
          {cards.length === 0 ? (
            <>
              No newsletters yet.{" "}
              <Link
                href="/newsletters/new"
                className="font-semibold text-cos-text underline-offset-2 hover:underline"
              >
                Create your first one
              </Link>
              .
            </>
          ) : (
            "Nothing in this filter yet."
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ newsletter, audienceName, audienceCount }) => {
            const href = newsletterLibraryHref(newsletter);
            const whenLabel = scheduleOrSentLabel(newsletter);
            const previewState = newsletter.composerState;

            return (
              <Link key={newsletter.id} href={href} className="group block">
                <article className="flex h-[400px] flex-col overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition group-hover:border-[#6b8171] group-hover:shadow-[0_12px_32px_rgba(28,36,48,0.1)]">
                  <div className="relative h-[220px] shrink-0 overflow-hidden border-b border-cos-border">
                    <NewsletterLibraryCardPreview
                      state={previewState}
                      className="h-full w-full transition duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(28,36,48,0.72)] via-[rgba(28,36,48,0.2)] to-transparent px-3.5 pb-3 pt-10 opacity-0 transition group-hover:opacity-100">
                      <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-bold text-cos-text">
                        {cardCta(newsletter.status)}
                      </span>
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-3.5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 min-w-0 font-display text-lg font-semibold leading-snug text-cos-text">
                        {newsletter.title ||
                          previewState.issueName?.trim() ||
                          "Untitled newsletter"}
                      </h3>
                      <NewsletterStatusBadge status={newsletter.status} />
                    </div>
                    <p className="truncate text-sm text-cos-muted">
                      {audienceSummary(audienceName, audienceCount)}
                    </p>
                    <p className="mt-auto truncate text-xs font-semibold text-cos-muted">
                      {whenLabel}
                    </p>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
