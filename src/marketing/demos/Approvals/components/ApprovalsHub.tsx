"use client";

import Image from "next/image";
import {
  BadgeChange,
  Drawer,
  Highlight,
  useTimeline,
} from "@/marketing/engine";
import { APPROVALS_DEMO } from "../demoData";

export function ApprovalsHub() {
  useTimeline();
  const { summary, row, review, secondaryRows } = APPROVALS_DEMO;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {summary.map((card) => (
            <div
              key={card.id}
              className={
                card.active
                  ? "rounded-xl bg-[var(--cos-text)] px-2.5 py-2 text-[var(--cos-card)]"
                  : "rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)] px-2.5 py-2"
              }
            >
              <p
                className={
                  card.active
                    ? "text-[10px] tracking-wide text-[var(--cos-card)]/70 uppercase"
                    : "text-[10px] tracking-wide text-[var(--cos-muted)] uppercase"
                }
              >
                {card.label}
              </p>
              <p className="mt-1 font-serif text-2xl leading-none">{card.count}</p>
              <p
                className={
                  card.active
                    ? "mt-1 text-[10px] text-[var(--cos-card)]/70"
                    : "mt-1 text-[10px] text-[var(--cos-muted)]"
                }
              >
                {card.hint}
              </p>
            </div>
          ))}
        </div>

        <Highlight
          cue="focus"
          untilCue="review"
          className="rounded-xl border border-[var(--cos-border)] bg-[var(--cos-card)]"
        >
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg-alt)]">
              <Image
                src={review.feedImage}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--cos-text)]">
                {row.event}
              </p>
              <p className="text-xs text-[var(--cos-muted)]">
                {row.milestone} · {row.type}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[color-mix(in_srgb,var(--cos-accent)_45%,var(--cos-border))] bg-[var(--cos-accent-soft)] px-2 py-0.5 text-[10px] font-medium tracking-wide text-[var(--cos-warning-text)] uppercase">
                  {row.status}
                </span>
                <span className="text-[10px] text-[var(--cos-muted)]">{row.due}</span>
              </div>
            </div>
            <div className="hidden min-w-0 sm:block sm:w-36">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--cos-bg-alt)] text-[10px] font-medium text-[var(--cos-text)]">
                  {row.assigneeInitials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs text-[var(--cos-text)]">
                    {row.assigneeName}
                  </p>
                  <p className="truncate text-[10px] text-[var(--cos-muted)]">
                    {row.assigneeRole}
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden md:block md:w-36">
              <p className="text-xs text-[var(--cos-text)]">{row.nextAction}</p>
              <p className="text-[10px] text-[var(--cos-muted)]">{row.submitted}</p>
            </div>
            <div className="hidden lg:block lg:w-28">
              <p className="text-xs text-[var(--cos-muted)]">{row.delivery}</p>
              <p className="text-[10px] text-[var(--cos-muted)]">{row.schedule}</p>
            </div>
            <span
              data-view-cta
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-[var(--cos-text)] px-3 py-1.5 text-sm text-[var(--cos-card)]"
            >
              View
            </span>
          </div>
        </Highlight>

        <ul className="space-y-2">
          {secondaryRows.map((item) => (
            <li
              key={item.milestone}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--cos-border)] bg-[var(--cos-card)]/70 px-3 py-2 text-sm"
            >
              <span className="text-[var(--cos-text)]">
                {item.milestone}
                <span className="text-[var(--cos-muted)]"> · {item.event}</span>
              </span>
              <span className="text-xs text-[var(--cos-muted)]">{item.status}</span>
            </li>
          ))}
        </ul>
      </div>

      <Drawer
        cue="review"
        placement="right"
        size="78%"
        showOverlay
        panelClassName="absolute top-0 right-0 bottom-0 flex w-[min(100%,22rem)] flex-col overflow-hidden border-l border-[var(--cos-border)] bg-[var(--cos-card)] shadow-md sm:w-[78%]"
      >
        <ReviewPanel />
      </Drawer>
    </div>
  );
}

function ReviewPanel() {
  const { review } = APPROVALS_DEMO;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-[var(--cos-border)] px-3 py-3 sm:px-4">
        <p className="text-[10px] font-medium tracking-[0.14em] text-[var(--cos-muted)] uppercase">
          {APPROVALS_DEMO.labels.review}
        </p>
        <p className="mt-1 font-serif text-xl text-[var(--cos-text)]">
          {review.title}
        </p>
        <p className="text-sm text-[var(--cos-muted)]">{review.subtitle}</p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2">
          <figure className="space-y-1">
            <figcaption className="text-[10px] tracking-wide text-[var(--cos-muted)] uppercase">
              Feed 1:1
            </figcaption>
            <div className="relative aspect-square overflow-hidden rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg-alt)]">
              <Image
                src={review.feedImage}
                alt="Feed artwork preview"
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          </figure>
          <figure className="space-y-1">
            <figcaption className="text-[10px] tracking-wide text-[var(--cos-muted)] uppercase">
              Story 9:16
            </figcaption>
            <div className="relative mx-auto aspect-[9/16] max-h-40 w-full max-w-[5.5rem] overflow-hidden rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg-alt)]">
              <Image
                src={review.storyImage}
                alt="Story artwork preview"
                fill
                sizes="88px"
                className="object-cover"
              />
            </div>
          </figure>
        </div>

        <div>
          <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--cos-muted)] uppercase">
            Shared caption
          </p>
          <p className="mt-1 rounded-lg border border-[var(--cos-border)] bg-[var(--cos-bg)] px-3 py-2 text-sm leading-relaxed text-[var(--cos-text)]">
            {review.caption}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-[10px] tracking-wide text-[var(--cos-muted)] uppercase">
              Platforms
            </dt>
            <dd className="text-[var(--cos-text)]">{review.platforms}</dd>
          </div>
          <div>
            <dt className="text-[10px] tracking-wide text-[var(--cos-muted)] uppercase">
              Delivery
            </dt>
            <dd className="text-[var(--cos-text)]">{review.delivery}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[10px] tracking-wide text-[var(--cos-muted)] uppercase">
              Schedule
            </dt>
            <dd className="text-[var(--cos-text)]">{review.schedule}</dd>
          </div>
        </dl>

        <div className="pt-1">
          <BadgeChange
            cue="done"
            fromLabel="Assigned to Me"
            toLabel="Approved"
            duration={0.45}
            fromClassName="absolute inset-0 flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--cos-accent)_45%,var(--cos-border))] bg-[var(--cos-accent-soft)] px-2.5 text-xs font-medium text-[var(--cos-warning-text)]"
            toClassName="absolute inset-0 flex items-center justify-center rounded-full border border-[var(--cos-brand-sage)]/40 bg-[var(--cos-brand-sage-soft)] px-2.5 text-xs font-medium text-[var(--cos-brand-sage)]"
            className="relative inline-flex min-w-[8.5rem] items-center justify-center overflow-hidden rounded-full"
          />
        </div>
      </div>

      <footer className="flex gap-2 border-t border-[var(--cos-border)] p-3 sm:p-4">
        <span
          data-approve-cta
          className="inline-flex flex-1 items-center justify-center rounded-md bg-[var(--cos-text)] px-3 py-2 text-sm text-[var(--cos-card)]"
        >
          Approve
        </span>
        <span className="inline-flex flex-1 items-center justify-center rounded-md border border-[var(--cos-border)] px-3 py-2 text-sm text-[var(--cos-muted)]">
          Request changes
        </span>
      </footer>
    </div>
  );
}
