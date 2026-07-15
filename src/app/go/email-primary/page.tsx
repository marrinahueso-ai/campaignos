import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keep Hey Ralli in Primary | Hey Ralli",
  description:
    "Add a Gmail filter so all Hey Ralli mail (approvals, reminders, Socials kits) stays in Primary instead of Promotions.",
  robots: { index: false, follow: false },
};

/** Match any sender on the Hey Ralli domain (approvals, reminders, Socials, etc.). */
const FILTER_QUERY = "from:(heyralli.com)";

const GMAIL_CREATE_FILTER = `https://mail.google.com/mail/u/0/#settings/filters?search=query&q=${encodeURIComponent(FILTER_QUERY)}`;

const GMAIL_SEARCH = `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(FILTER_QUERY)}`;

/**
 * Public helper linked from story-kit emails (and reusable elsewhere).
 * One filter covers Socials@, notifications@, and any other @heyralli.com mail.
 */
export default function EmailPrimaryHelpPage() {
  return (
    <main className="min-h-screen bg-cos-bg px-4 py-12 text-cos-text">
      <div className="mx-auto max-w-lg space-y-6">
        <p className="font-display text-3xl">Keep Hey Ralli in Primary</p>
        <p className="text-sm leading-relaxed text-cos-muted">
          Gmail sometimes files product email under Promotions. A one-time
          filter for <strong className="text-cos-text">@heyralli.com</strong>{" "}
          covers everything from Hey Ralli — approvals, reminders, and Socials
          kits.
        </p>

        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-cos-text">
          <li>Tap the button below to open Gmail (signed in on this device).</li>
          <li>
            Create a filter for mail{" "}
            <strong>from heyralli.com</strong> (all Hey Ralli addresses).
          </li>
          <li>
            Check <strong>Never send it to Spam</strong> and{" "}
            <strong>Categorize as: Primary</strong> (or Personal).
          </li>
          <li>Optionally check Also apply to matching conversations.</li>
        </ol>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <a
            href={GMAIL_CREATE_FILTER}
            className="inline-flex items-center justify-center rounded-full bg-cos-dark px-5 py-3 text-sm font-semibold text-cos-bg"
          >
            Open Gmail filter setup
          </a>
          <a
            href={GMAIL_SEARCH}
            className="inline-flex items-center justify-center rounded-full border border-cos-dark px-5 py-3 text-sm font-semibold text-cos-text"
          >
            Find Hey Ralli mail in Gmail
          </a>
        </div>

        <p className="text-xs leading-relaxed text-cos-muted">
          Covers addresses like Socials@heyralli.com and
          notifications@heyralli.com. On phone: open any Hey Ralli email → menu
          (⋮) → <strong className="text-cos-text">Filter messages like these</strong>{" "}
          → change “From” to <strong className="text-cos-text">heyralli.com</strong>{" "}
          before saving.
        </p>
      </div>
    </main>
  );
}
