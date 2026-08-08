"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FileStack,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import { EventManageMenu } from "@/components/event-workspace/EventManageMenu";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHeroStatsStrip";
import {
  ew,
  ewCard,
} from "@/components/events-phase3/event-workspace-tokens";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { createWithAiHref } from "@/lib/events/event-responsibility";
import type { EventResponsibilityPerson } from "@/lib/events/event-responsibility";
import {
  formatEventDate,
  formatEventTime,
  getEventCountdown,
} from "@/lib/utils/dates";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

export type OverviewJumpTab =
  | "approvals"
  | "tasks"
  | "notes"
  | "files"
  | "volunteers"
  | "responsibilities"
  | "vendors"
  | "insights"
  | "activity"
  | "create-with-ai";

type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  tab: OverviewJumpTab;
};

type Props = {
  event: Event;
  artwork: HeroArtworkSelection | null;
  stats: EventDetailHeroStats;
  responsibilities: EventResponsibilityPerson[];
  onSelectTab: (tab: OverviewJumpTab) => void;
};

function statusLabel(status: Event["status"]): string {
  if (status === "draft") return "Needs setup";
  if (status === "scheduled") return "Ready";
  if (status === "published") return "Published";
  return "Archived";
}

function buildAttentionItems(stats: EventDetailHeroStats): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (stats.pendingApprovals > 0) {
    items.push({
      id: "approvals",
      title: `${stats.pendingApprovals} post${
        stats.pendingApprovals === 1 ? "" : "s"
      } awaiting approval`,
      detail: "Review content before it goes out.",
      tab: "approvals",
    });
  }
  if (stats.tasks > 0) {
    items.push({
      id: "tasks",
      title: `${stats.tasks} open task${stats.tasks === 1 ? "" : "s"}`,
      detail: "Jump into Planning to clear the list.",
      tab: "tasks",
    });
  }
  // Filled spots alone don't imply open spots — still nudge when no fills yet.
  if (stats.filledSpots === 0) {
    items.push({
      id: "volunteers-empty",
      title: "Volunteer staffing needs attention",
      detail: "Connect a signup or review open roles.",
      tab: "volunteers",
    });
  }
  return items;
}

export function EventWorkspaceOverviewPanel({
  event,
  artwork,
  stats,
  responsibilities,
  onSelectTab,
}: Props) {
  const imageUrl =
    hasDisplayableArtwork(artwork) && artwork?.imageUrl
      ? artwork.imageUrl
      : null;
  const countdown = getEventCountdown(event.date);
  const timeLabel = formatEventTime(event.time);
  const createHref = createWithAiHref(event.id);
  const attention = buildAttentionItems(stats);
  const lead =
    responsibilities.find((row) => row.responsibility === "Event Lead")
      ?.displayName ?? null;
  const filled = stats.filledSpots;
  const eventStatus = statusLabel(event.status);

  return (
    <div className="space-y-10">
      <section className={cn(ewCard, "relative overflow-hidden")}>
        <div className="relative min-h-[220px] sm:min-h-[260px]">
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#1c352d] via-[#5a7568] to-[#c5a880]"
            aria-hidden
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-85"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(28,53,45,0.92)] via-[rgba(28,53,45,0.55)] to-transparent" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between gap-6 px-6 py-7 sm:px-10 sm:py-9">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-white/75 uppercase">
                  Event Workspace
                </p>
                <h1 className="mt-2 max-w-2xl font-display text-4xl leading-tight text-white md:text-5xl">
                  {event.title}
                </h1>
                <p className="mt-3 text-sm text-white/85">
                  {formatEventDate(event.date)}
                  {timeLabel ? ` · ${timeLabel}` : null}
                  {event.location ? ` · ${event.location}` : null}
                </p>
              </div>
              <EventManageMenu
                event={event}
                size="sm"
                includeEditDetails
                iconOnly
                triggerClassName="border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
              />
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap gap-3 text-sm text-white/90">
                <span className="rounded-full border border-white/35 px-3 py-1">
                  {eventStatus}
                </span>
                {!countdown.isPast ? (
                  <span className="rounded-full border border-white/35 px-3 py-1">
                    {countdown.label}
                  </span>
                ) : null}
                <span className="rounded-full border border-white/35 px-3 py-1">
                  Staffing · {filled} filled
                </span>
              </div>
              <Link
                href={createHref}
                prefetch={false}
                onClick={(clickEvent) => {
                  clickEvent.preventDefault();
                  window.location.assign(createHref);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#1c352d] shadow-sm transition hover:bg-[#f4f0ea]"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Generate Event Plan
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className={cn("font-display text-2xl", ew.ink)}>
              What Needs Your Attention
            </h2>
            <span className={cn("text-sm", ew.inksoft)}>
              {attention.length === 0
                ? "You’re clear"
                : `${attention.length} open item${
                    attention.length === 1 ? "" : "s"
                  }`}
            </span>
          </div>

          {attention.length === 0 ? (
            <div
              className={cn(
                ewCard,
                "flex items-start gap-3 px-5 py-6",
                ew.bgIvory,
              )}
            >
              <CheckCircle2
                className={cn("mt-0.5 h-5 w-5 shrink-0", ew.sageDeep)}
              />
              <div>
                <p className={cn("font-medium", ew.ink)}>Nothing urgent</p>
                <p className={cn("mt-1 text-sm", ew.inksoft)}>
                  Approvals, tasks, and volunteer fill look calm for now.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {attention.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTab(item.tab)}
                    className={cn(
                      ewCard,
                      "flex w-full items-start gap-3 px-5 py-4 text-left transition hover:border-[#c5a880]/70",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        ew.fillGold,
                      )}
                      aria-hidden
                    />
                    <span>
                      <span className={cn("block font-medium", ew.ink)}>
                        {item.title}
                      </span>
                      <span className={cn("mt-0.5 block text-sm", ew.inksoft)}>
                        {item.detail}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className={cn(ewCard, "space-y-5 p-6")}>
          <div>
            <h3 className={cn("font-display text-lg", ew.ink)}>
              Lead Coordinator
            </h3>
            <p className={cn("mt-2 text-sm", ew.inksoft)}>
              {lead?.trim() || "Not assigned yet"}
            </p>
          </div>
          <div className="border-t border-[#e6dfd5] pt-5">
            <h3 className={cn("font-display text-lg", ew.ink)}>
              Staffing Status
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className={ew.inksoft}>Filled</dt>
                <dd className={cn("font-semibold tabular-nums", ew.ink)}>
                  {filled}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className={ew.inksoft}>Pending approvals</dt>
                <dd className={cn("font-semibold tabular-nums", ew.ink)}>
                  {stats.pendingApprovals}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className={ew.inksoft}>Open tasks</dt>
                <dd className={cn("font-semibold tabular-nums", ew.ink)}>
                  {stats.tasks}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>

      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={cn("font-display text-2xl", ew.ink)}>
              Event Workspace
            </h2>
            <p className={cn("mt-1 text-sm", ew.inksoft)}>
              Manage the core logistics and volunteer operations
            </p>
          </div>
          <div className="flex gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onSelectTab("insights")}
              className={cn(ew.inksoft, "hover:text-[#1c352d]")}
            >
              Insights
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("activity")}
              className={cn(ew.inksoft, "hover:text-[#1c352d]")}
            >
              Activity
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <WorkspaceCard
            icon={<ClipboardList className="h-5 w-5" />}
            title="Planning"
            subtitle="Tasks, Notes, & Files"
            meta={`${stats.tasks} open task${stats.tasks === 1 ? "" : "s"}`}
            onClick={() => onSelectTab("tasks")}
          />
          <WorkspaceCard
            icon={<FileStack className="h-5 w-5" />}
            title="Approvals"
            subtitle="Content requiring review"
            meta={
              stats.pendingApprovals === 0
                ? "All clear"
                : `${stats.pendingApprovals} pending review`
            }
            onClick={() => onSelectTab("approvals")}
          />
          <WorkspaceCard
            icon={<Users className="h-5 w-5" />}
            title="Volunteers"
            subtitle="Shifts & Signups"
            meta={`${filled} filled`}
            onClick={() => onSelectTab("volunteers")}
          />
          <WorkspaceCard
            icon={<UsersRound className="h-5 w-5" />}
            title="Community"
            subtitle="Team & Vendors"
            meta="People & partners"
            onClick={() => onSelectTab("responsibilities")}
          />
        </div>
      </section>

      <section className={cn(ewCard, "relative overflow-hidden p-8 sm:p-10")}>
        <CalendarCheck
          className="pointer-events-none absolute top-6 right-6 h-16 w-16 text-[#e6dfd5]"
          aria-hidden
        />
        <h2 className={cn("font-display text-2xl", ew.ink)}>What’s Next</h2>
        <ul className="mt-6 space-y-4 border-l border-[#e6dfd5] pl-6">
          {stats.pendingApprovals > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => onSelectTab("approvals")}
                className="text-left"
              >
                <p className={cn("text-xs font-semibold uppercase", ew.sageDeep)}>
                  Today
                </p>
                <p className={cn("font-medium", ew.ink)}>
                  Approve pending content
                </p>
                <p className={cn("text-sm", ew.inksoft)}>
                  {stats.pendingApprovals} item
                  {stats.pendingApprovals === 1 ? "" : "s"} waiting in Approvals.
                </p>
              </button>
            </li>
          ) : null}
          {stats.tasks > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => onSelectTab("tasks")}
                className="text-left"
              >
                <p className={cn("text-xs font-semibold uppercase", ew.sageDeep)}>
                  Up next
                </p>
                <p className={cn("font-medium", ew.ink)}>Work open tasks</p>
                <p className={cn("text-sm", ew.inksoft)}>
                  {stats.tasks} task{stats.tasks === 1 ? "" : "s"} in Planning.
                </p>
              </button>
            </li>
          ) : null}
          <li>
            <button
              type="button"
              onClick={() => onSelectTab("volunteers")}
              className="text-left"
            >
              <p className={cn("text-xs font-semibold uppercase", ew.sageDeep)}>
                Staffing
              </p>
              <p className={cn("font-medium", ew.ink)}>
                Review volunteer coverage
              </p>
              <p className={cn("text-sm", ew.inksoft)}>
                {filled > 0
                  ? `${filled} filled spots on the latest signup snapshot.`
                  : "Connect or refresh your signup to see fill."}
              </p>
            </button>
          </li>
        </ul>
      </section>
    </div>
  );
}

function WorkspaceCard({
  icon,
  title,
  subtitle,
  meta,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        ewCard,
        "group flex flex-col gap-5 p-7 text-left transition hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border border-[#e6dfd5] bg-[#faf8f5]",
          ew.ink,
        )}
      >
        {icon}
      </div>
      <div>
        <h3 className={cn("font-display text-lg", ew.ink)}>{title}</h3>
        <p className={cn("mt-1 text-sm", ew.inksoft)}>{subtitle}</p>
      </div>
      <p className={cn("mt-auto text-sm font-medium", ew.sageDeep)}>{meta}</p>
    </button>
  );
}
