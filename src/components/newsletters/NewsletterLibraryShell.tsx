"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Plus, Trash2, Users } from "lucide-react";
import { useState, useTransition } from "react";

import { NewsletterLibraryCardPreview } from "@/components/newsletters/NewsletterLibraryCardPreview";
import { NewsletterStatusBadge } from "@/components/newsletters/NewsletterStatusBadge";
import { deleteNewsletter } from "@/lib/newsletter/actions";
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

const DELETABLE_STATUSES = new Set<NewsletterStatus>([
  "draft",
  "changes_requested",
  "needs_approval",
  "approved",
  "failed",
]);

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

function canDeleteNewsletter(status: NewsletterStatus): boolean {
  return DELETABLE_STATUSES.has(status);
}

export function NewsletterLibraryShell({
  cards,
  filter,
  canManageContacts,
  recentActivityLabel,
}: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  function handleDelete(newsletter: Newsletter) {
    const label = newsletter.title?.trim() || "this newsletter";
    if (
      !window.confirm(
        `Delete “${label}”? This permanently removes the draft and can’t be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    setPendingId(newsletter.id);
    startTransition(async () => {
      const result = await deleteNewsletter({ newsletterId: newsletter.id });
      setPendingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="studio-page space-y-7 pb-16">
      <header className="grid gap-6 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7 space-y-4 pt-1">
          <p className="studio-eyebrow">Your Library</p>
          <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-cos-text">
            Newsletters
          </h1>
          <p className="max-w-[40ch] text-base leading-relaxed text-cos-muted">
            Create, review, send, and revisit your school newsletters — all in one place.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/newsletters/new"
              className="inline-flex items-center gap-2 rounded-full bg-cos-primary px-5 py-2.5 text-sm font-bold text-[#f6f2eb] transition hover:bg-cos-primary-hover"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              New Newsletter
            </Link>
            {canManageContacts ? (
              <Link
                href="/newsletter-contacts"
                className="inline-flex items-center gap-2 rounded-full border border-cos-border bg-cos-card px-4 py-2.5 text-sm font-semibold text-cos-text transition hover:border-cos-brand-sage"
              >
                <Users className="h-4 w-4" strokeWidth={1.75} />
                Contacts
              </Link>
            ) : null}
          </div>
        </div>
        <div className="relative lg:col-span-5">
          <div className="flex min-h-[140px] items-end overflow-hidden rounded-[20px] border border-cos-border bg-gradient-to-br from-[#e8eee9] via-[#f4f1ea] to-[#dfe8e3] px-6 py-5 shadow-[0_12px_28px_rgba(28,36,48,0.08)] sm:min-h-[160px]">
            <div>
              <Mail className="mb-2.5 h-7 w-7 text-[#2f4a3c]" strokeWidth={1.5} />
              <p className="font-display text-xl font-semibold text-cos-text">
                Your events. Your way.
              </p>
              <p className="mt-1 max-w-[32ch] text-sm text-cos-muted">
                Build from real Hey Ralli events, then approve &amp; schedule in one flow.
              </p>
            </div>
          </div>
          {recentActivityLabel ? (
            <div className="absolute -bottom-3 -left-2 max-w-xs rounded-xl border border-cos-border bg-cos-card px-3 py-2.5 shadow-[0_8px_22px_rgba(28,36,48,0.08)]">
              <div className="mb-0.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0d7e5e]" />
                <span className="text-[9px] font-extrabold tracking-[0.14em] text-cos-muted uppercase">
                  Live updates
                </span>
              </div>
              <p className="text-xs font-medium text-cos-text">{recentActivityLabel}</p>
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

      {error ? (
        <p className="rounded-xl border border-cos-error/30 bg-cos-error/5 px-4 py-3 text-sm text-cos-error">
          {error}
        </p>
      ) : null}

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map(({ newsletter, audienceName, audienceCount }) => {
            const href = newsletterLibraryHref(newsletter);
            const whenLabel = scheduleOrSentLabel(newsletter);
            const previewState = newsletter.composerState;
            const deletable = canDeleteNewsletter(newsletter.status);
            const deleting = isPending && pendingId === newsletter.id;

            return (
              <div key={newsletter.id} className="group relative">
                <Link href={href} className="block">
                  <article className="flex h-[300px] flex-col overflow-hidden rounded-[18px] border border-cos-border bg-cos-card shadow-[0_6px_20px_rgba(28,36,48,0.05)] transition group-hover:border-[#6b8171] group-hover:shadow-[0_10px_26px_rgba(28,36,48,0.09)]">
                    <div className="relative h-[160px] shrink-0 overflow-hidden border-b border-cos-border">
                      <NewsletterLibraryCardPreview
                        state={previewState}
                        className="h-full w-full transition duration-500 group-hover:scale-[1.02]"
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(28,36,48,0.72)] via-[rgba(28,36,48,0.2)] to-transparent px-3 pb-2.5 pt-8 opacity-0 transition group-hover:opacity-100">
                        <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-cos-text">
                          {cardCta(newsletter.status)}
                        </span>
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-1 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 min-w-0 pr-6 font-display text-base font-semibold leading-snug text-cos-text">
                          {newsletter.title ||
                            previewState.issueName?.trim() ||
                            "Untitled newsletter"}
                        </h3>
                        <NewsletterStatusBadge status={newsletter.status} />
                      </div>
                      <p className="truncate text-xs text-cos-muted">
                        {audienceSummary(audienceName, audienceCount)}
                      </p>
                      <p className="mt-auto truncate text-[11px] font-semibold text-cos-muted">
                        {whenLabel}
                      </p>
                    </div>
                  </article>
                </Link>

                {deletable ? (
                  <button
                    type="button"
                    disabled={deleting}
                    aria-label={`Delete ${newsletter.title || "newsletter"}`}
                    title="Delete newsletter"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(newsletter);
                    }}
                    className={cn(
                      "absolute top-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-cos-border bg-white/95 text-cos-muted shadow-sm transition hover:border-cos-error hover:text-cos-error",
                      "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                      deleting && "opacity-60",
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.85} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
