"use client";

import Link from "next/link";
import { useState } from "react";
import {
  buildIntegrationSettingsPath,
  buildMetaOAuthStartPath,
} from "@/lib/integrations/oauth";

const PURPOSE_CARDS = [
  {
    title: "Why we connect",
    body: "So volunteers can answer parents who already messaged the school Page / Instagram — in one calm place.",
  },
  {
    title: "What AI does",
    body: "Suggests a draft reply from your event FAQ and notes. You edit, approve, and send. Never auto-sent.",
  },
  {
    title: "What we don’t do",
    body: "No spam tools, no “unlimited reach” claims, no impersonating parents, no silent replies.",
  },
  {
    title: "Privacy",
    body: "Messages stay in your Meta business messaging context. Access is limited to your PTA team in Hey Ralli.",
  },
] as const;

interface ConnectMetaEmptyProps {
  organizationName?: string | null;
  /** Post-OAuth / settings return path (canonical hub is `/communications`). */
  returnTo?: string;
  oauthError?: string | null;
}

export function ConnectMetaEmpty({
  organizationName,
  returnTo = "/communications",
  oauthError = null,
}: ConnectMetaEmptyProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const orgLabel = organizationName?.trim() || "your organization";
  const connectHref = buildMetaOAuthStartPath({ returnTo });
  const metaSettingsHref = buildIntegrationSettingsPath("meta", returnTo);

  return (
    <section className="w-full" aria-label="Connect Meta">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-cos-text">
            Connect Meta
          </h1>
          <p className="mt-1.5 max-w-[58ch] text-sm leading-relaxed text-cos-muted">
            Link your Facebook Page and Instagram once. Parent messages appear here
            automatically — the same connection powers publishing and Insights.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(196,146,46,0.3)] bg-[rgba(196,146,46,0.14)] px-3 py-1.5 text-xs font-semibold text-[#7a5a12]">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[#c4922e]"
            aria-hidden
          />
          Meta not connected
        </span>
      </div>

      <div className="mx-auto mt-6 flex max-w-[36rem] flex-col items-center rounded-[22px] border border-cos-border bg-cos-card px-8 py-10 text-center shadow-[0_20px_48px_rgba(42,38,34,0.12)]">
        <div
          className="mb-[18px] grid h-16 w-16 place-items-center rounded-[18px] bg-[rgba(47,74,60,0.1)] text-[#2f4a3c]"
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[30px] w-[30px] stroke-current"
            fill="none"
            strokeWidth={1.7}
          >
            <path d="M4 6h16v12H7l-3 3V6z" />
            <path d="M8 10h8M8 14h5" />
          </svg>
        </div>

        <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-cos-text">
          Connect Meta to get started
        </h2>
        <p className="mx-auto mt-2.5 max-w-[42ch] text-sm leading-relaxed text-cos-muted">
          Communications Hub shows organic conversations from your{" "}
          <strong className="font-semibold text-cos-text">Facebook Page Inbox</strong>{" "}
          and{" "}
          <strong className="font-semibold text-cos-text">Instagram DMs</strong>,
          plus comments on your posts — for {orgLabel}. No ads inbox. No
          Messenger marketing blasts. No cold outreach.
        </p>

        <div className="mt-5 mb-2 grid w-full grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
          {PURPOSE_CARDS.map((card) => (
            <article
              key={card.title}
              className="rounded-[14px] border border-cos-border bg-[rgba(246,242,235,0.55)] p-3"
            >
              <h3 className="text-[13px] font-extrabold text-cos-text">
                {card.title}
              </h3>
              <p className="mt-1 text-xs leading-snug text-cos-muted">{card.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            href={connectHref}
            className="inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform hover:-translate-y-px"
          >
            Connect with Facebook
          </Link>
          <Link
            href={metaSettingsHref}
            className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition-transform hover:-translate-y-px"
          >
            Meta settings
          </Link>
        </div>

        <p className="mt-3.5 text-xs leading-snug text-[#7a7166]">
          You’ll return here after connecting ·{" "}
          <button
            type="button"
            onClick={() => setWhyOpen((open) => !open)}
            className="font-bold text-[#2f4a3c] hover:underline"
            aria-expanded={whyOpen}
          >
            Why we ask for Page messaging permissions
          </button>
        </p>
        {whyOpen ? (
          <p className="mt-3 max-w-[40ch] text-xs leading-relaxed text-cos-muted">
            Needed to read &amp; reply in Page Inbox / Instagram DMs your community
            already started.
          </p>
        ) : null}

        {oauthError ? (
          <p className="mt-4 max-w-md text-sm text-red-600" role="alert">
            {oauthError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
