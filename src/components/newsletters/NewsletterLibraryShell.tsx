"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Plus, Users } from "lucide-react";

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
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map(({ newsletter, audienceName, audienceCount }) => {
            const href = newsletterLibraryHref(newsletter);
            const when =
              newsletter.sentAt ||
              newsletter.scheduledSendAt ||
              newsletter.proposedSendAt ||
              newsletter.updatedAt;
            const whenLabel = newsletter.sentAt
              ? `Sent ${formatDateTime(newsletter.sentAt)}`
              : newsletter.scheduledSendAt
                ? `Scheduled ${formatDateTime(newsletter.scheduledSendAt)}`
                : newsletter.proposedSendAt
                  ? `Proposed ${formatDateTime(newsletter.proposedSendAt)}`
                  : `Updated ${formatDateTime(newsletter.updatedAt)}`;

            return (
              <Link key={newsletter.id} href={href} className="group block">
                <article className="overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition group-hover:border-[#6b8171]">
                  <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-[#f4f1ea] to-[#e8eee9]">
                    {newsletter.composerState.headerImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={newsletter.composerState.headerImageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full flex-col justify-end p-5">
                        <p className="font-display text-2xl font-semibold text-cos-text">
                          {newsletter.title || "Untitled newsletter"}
                        </p>
                        {newsletter.subject ? (
                          <p className="mt-1 line-clamp-2 text-sm text-cos-muted">
                            {newsletter.subject}
                          </p>
                        ) : null}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(28,36,48,0.75)] via-[rgba(28,36,48,0.25)] to-transparent p-5 text-white opacity-0 transition group-hover:opacity-100">
                      <p className="font-display text-2xl font-bold">
                        {newsletter.title || "Untitled newsletter"}
                      </p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div className="text-sm">
                          <p className="text-white/70">Audience</p>
                          <p className="font-medium">
                            {audienceName
                              ? `${audienceName}${
                                  audienceCount != null ? ` · ${audienceCount}` : ""
                                }`
                              : "No audience yet"}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-cos-text">
                          {cardCta(newsletter.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-xl font-semibold text-cos-text">
                        {newsletter.title || "Untitled newsletter"}
                      </h3>
                      <NewsletterStatusBadge status={newsletter.status} />
                    </div>
                    {newsletter.status === "changes_requested" &&
                    newsletter.changeRequestNote ? (
                      <p className="line-clamp-2 text-sm text-cos-muted italic">
                        “{newsletter.changeRequestNote}”
                      </p>
                    ) : newsletter.subject ? (
                      <p className="line-clamp-2 text-sm text-cos-muted">
                        {newsletter.subject}
                      </p>
                    ) : null}
                    <p className="text-xs font-semibold text-cos-muted" title={when}>
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
