"use client";

import Link from "next/link";
import { createWithAiHref } from "@/lib/events/event-responsibility";
import { cn } from "@/lib/utils/cn";

interface EventDetailCreateWithAiPanelProps {
  eventId: string;
  eventTitle: string;
}

const TILES = [
  {
    id: "social",
    title: "Social",
    body: "Posts, artwork, captions, approval for this event.",
    href: (eventId: string) => createWithAiHref(eventId),
    hardNavigate: true,
    art: "from-[#c4922e] via-[#e0b65a] to-[#f5e6c2]",
  },
  {
    id: "homepage",
    title: "Homepage",
    body: "Add this event to your Homepage.",
    href: () => "/homepage-composer",
    hardNavigate: false,
    art: "from-[#2f4a3c] via-[#6b8171] to-[#b8c9bc]",
  },
  {
    id: "newsletter",
    title: "Newsletter",
    body: "Feature it in your community newsletter.",
    href: () => "/newsletter-composer",
    hardNavigate: false,
    art: "from-[#0b2f5b] via-[#2f9fb3] to-[#7fd0df]",
  },
] as const;

export function EventDetailCreateWithAiPanel({
  eventId,
  eventTitle,
}: EventDetailCreateWithAiPanelProps) {
  const socialHref = createWithAiHref(eventId);

  return (
    <section className="relative overflow-hidden rounded-[22px] border border-cos-border bg-cos-card p-6 shadow-[0_8px_28px_rgba(28,36,48,0.06)] before:pointer-events-none before:absolute before:top-0 before:left-0 before:h-full before:w-1/2 before:bg-[radial-gradient(ellipse_at_left,rgba(47,74,60,0.1),transparent_60%)] before:content-[''] after:pointer-events-none after:absolute after:top-0 after:right-0 after:h-full after:w-1/2 after:bg-[radial-gradient(ellipse_at_right,rgba(196,146,46,0.12),transparent_55%)] after:content-['']">
      <div className="relative">
        <h2 className="font-display text-[22px] tracking-[-0.02em] text-cos-text">
          Create with AI for this event
        </h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-cos-muted">
          Same studio suite — Social, Homepage, Newsletter — pointed at{" "}
          <span className="font-semibold text-cos-text">{eventTitle}</span>.
          Pick a surface to start.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {TILES.map((tile) => {
            const href = tile.href(eventId);
            return (
              <Link
                key={tile.id}
                href={href}
                prefetch={false}
                onClick={(event) => {
                  if (tile.hardNavigate) {
                    event.preventDefault();
                    window.location.assign(href);
                  }
                }}
                className="overflow-hidden rounded-[18px] border border-cos-border bg-cos-bg transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
              >
                <div
                  className={cn("h-[88px] bg-gradient-to-br", tile.art)}
                  aria-hidden
                />
                <div className="px-3.5 py-3.5">
                  <strong className="block text-sm font-bold text-cos-text">
                    {tile.title}
                  </strong>
                  <span className="mt-1 block text-xs leading-snug text-cos-muted">
                    {tile.body}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-5">
          <Link
            href={socialHref}
            prefetch={false}
            onClick={(event) => {
              event.preventDefault();
              window.location.assign(socialHref);
            }}
            className="inline-flex items-center rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card transition hover:-translate-y-px hover:bg-[#1a1714]"
          >
            Open Social composer →
          </Link>
        </div>
      </div>
    </section>
  );
}
