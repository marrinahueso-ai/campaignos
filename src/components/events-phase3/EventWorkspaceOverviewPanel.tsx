"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertOctagon,
  ArrowRight,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  FileStack,
  Sparkles,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import { EventManageMenu } from "@/components/event-workspace/EventManageMenu";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHeroStatsStrip";
import {
  ew,
  ewCard,
} from "@/components/events-phase3/event-workspace-tokens";
import { AppImage } from "@/components/images/AppImage";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { createWithAiHref } from "@/lib/events/event-responsibility";
import type { EventResponsibilityPerson } from "@/lib/events/event-responsibility";
import type { EventInviteCollaboratorPreview } from "@/lib/events-phase3/invite-event-member";
import { EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import {
  formatEventDate,
  formatEventTime,
  getEventCountdown,
  parseLocalDate,
} from "@/lib/utils/dates";
import type { Event } from "@/types";
import type { EventType } from "@/types/playbooks";
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
  tone: "gold" | "sage";
  icon: "alert" | "check" | "users";
};

type Props = {
  event: Event;
  artwork: HeroArtworkSelection | null;
  stats: EventDetailHeroStats;
  responsibilities: EventResponsibilityPerson[];
  inviteCollaborators?: EventInviteCollaboratorPreview[];
  onSelectTab: (tab: OverviewJumpTab) => void;
  onInviteTeamMember?: () => void;
  /**
   * `home` = Events workspace (Pilot hierarchy).
   * `detail` = Event ID overview (default).
   */
  variant?: "detail" | "home";
  /** When false, hides What's Next (Events home). Default true. */
  showWhatsNext?: boolean;
  /** Attention heading. Events home uses "Attention Needed". */
  attentionTitle?: string;
  /** Rendered after the hero (Also Ahead on Events home). */
  afterHeroSlot?: ReactNode;
  /** Events home: status / staffing / lead / milestone + Invite strip. */
  showOperationalSummary?: boolean;
  /** Manage menu archive/delete noun. */
  manageEntityNoun?: "event" | "campaign";
  /** Soft loading state for async selected-event stats. */
  statsPending?: boolean;
};

function statusChipLabel(status: Event["status"]): string {
  if (status === "draft") return "Needs setup";
  if (status === "scheduled") return "Ready";
  if (status === "published") return "Published";
  return "Archived";
}

function trackLabel(stats: EventDetailHeroStats, status: Event["status"]): string {
  if (status === "archived") return "Archived";
  if (stats.pendingApprovals > 0 || stats.tasks > 0) return "Needs attention";
  if (status === "draft") return "Getting ready";
  return "On track";
}

function seasonEyebrow(date: string): string {
  const d = parseLocalDate(date);
  const month = d.getMonth();
  const year = d.getFullYear();
  let season = "School year";
  if (month >= 2 && month <= 4) season = "Spring";
  else if (month >= 5 && month <= 7) season = "Summer";
  else if (month >= 8 && month <= 10) season = "Fall";
  else season = "Winter";
  return `${season} ${year} · Event`;
}

function buildAttentionItems(stats: EventDetailHeroStats): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (stats.tasks > 0) {
    items.push({
      id: "tasks",
      title: `${stats.tasks} open task${stats.tasks === 1 ? "" : "s"}`,
      detail: "Jump into Planning to clear the list.",
      tab: "tasks",
      tone: "gold",
      icon: "alert",
    });
  }
  if (stats.pendingApprovals > 0) {
    items.push({
      id: "approvals",
      title: `${stats.pendingApprovals} post${
        stats.pendingApprovals === 1 ? "" : "s"
      } awaiting approval`,
      detail: "Review content before it goes out.",
      tab: "approvals",
      tone: "sage",
      icon: "check",
    });
  }
  if (stats.openSpots != null && stats.openSpots > 0) {
    items.push({
      id: "volunteers-open",
      title: `${stats.openSpots} volunteer spot${
        stats.openSpots === 1 ? "" : "s"
      } still open`,
      detail: "Review coverage and still-needed roles.",
      tab: "volunteers",
      tone: "gold",
      icon: "users",
    });
  } else if (stats.filledSpots === 0 && (stats.totalSpots == null || stats.totalSpots === 0)) {
    items.push({
      id: "volunteers-empty",
      title: "Volunteer staffing isn't set up yet",
      detail: "Connect a signup or review open spots.",
      tab: "volunteers",
      tone: "gold",
      icon: "users",
    });
  }
  return items;
}

function AttentionIcon({
  icon,
  tone,
}: {
  icon: AttentionItem["icon"];
  tone: AttentionItem["tone"];
}) {
  const wrap =
    tone === "sage"
      ? "bg-[#e6efe9] text-[#5a7568]"
      : "bg-[#f4f0ea] text-[#c5a880]";
  const Icon =
    icon === "check" ? CheckSquare : icon === "users" ? Users : AlertOctagon;
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
        wrap,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </div>
  );
}

function StaffingDonut({
  filled,
  open,
  pending,
}: {
  filled: number;
  open: number;
  pending: number;
}) {
  const total = filled + open + pending;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  const filledLen = total > 0 ? (filled / total) * c : 0;
  const pendingLen = total > 0 ? (pending / total) * c : 0;
  const openLen = total > 0 ? (open / total) * c : 0;

  return (
    <div className="relative mx-auto h-[200px] w-[200px]">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="#e6dfd5"
          strokeWidth="14"
        />
        {total > 0 ? (
          <>
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="#1c352d"
              strokeWidth="14"
              strokeDasharray={`${filledLen} ${c - filledLen}`}
              strokeDashoffset={0}
            />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="#c5a880"
              strokeWidth="14"
              strokeDasharray={`${pendingLen} ${c - pendingLen}`}
              strokeDashoffset={-filledLen}
            />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="#e6dfd5"
              strokeWidth="14"
              strokeDasharray={`${openLen} ${c - openLen}`}
              strokeDashoffset={-(filledLen + pendingLen)}
            />
          </>
        ) : null}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("font-display text-[28px] leading-none", ew.ink)}>
          {total > 0 ? `${pct}%` : "—"}
        </span>
      </div>
    </div>
  );
}

function leadInitials(name: string | null | undefined): string {
  return (
    (name ?? "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function eventTypeLabel(event: Event): string | null {
  if (event.eventType) {
    return (
      EVENT_TYPE_LABELS[event.eventType as EventType] ?? event.eventType
    );
  }
  return event.category;
}

function milestoneCopy(input: {
  pendingApprovals: number;
  tasks: number;
  open: number;
  countdown: ReturnType<typeof getEventCountdown>;
}): { title: string; detail: string | null } {
  const { pendingApprovals, tasks, open, countdown } = input;
  if (pendingApprovals > 0) {
    return {
      title: `Approve ${pendingApprovals} pending post${pendingApprovals === 1 ? "" : "s"}`,
      detail: "Today",
    };
  }
  if (tasks > 0) {
    return {
      title: `Clear ${tasks} open task${tasks === 1 ? "" : "s"}`,
      detail: countdown.isPast ? "Up next" : "Soon",
    };
  }
  if (open > 0) {
    return {
      title: `Fill ${open} remaining volunteer spot${open === 1 ? "" : "s"}`,
      detail: "Staffing",
    };
  }
  if (!countdown.isPast) {
    return { title: countdown.label, detail: null };
  }
  return { title: "Event plan is current", detail: null };
}

export function EventWorkspaceOverviewPanel({
  event,
  artwork,
  stats,
  responsibilities,
  inviteCollaborators = [],
  onSelectTab,
  onInviteTeamMember,
  variant = "detail",
  showWhatsNext = true,
  attentionTitle = "What Needs Your Attention",
  afterHeroSlot,
  showOperationalSummary = false,
  manageEntityNoun = "campaign",
  statsPending = false,
}: Props) {
  const isHome = variant === "home";
  const imageUrl =
    hasDisplayableArtwork(artwork) && artwork?.imageUrl
      ? artwork.imageUrl
      : null;
  const countdown = getEventCountdown(event.date);
  const timeLabel = formatEventTime(event.time);
  const createHref = createWithAiHref(event.id);
  const attention = buildAttentionItems(stats);
  const lead =
    responsibilities.find((row) => row.responsibility === "Event Lead") ??
    responsibilities[0] ??
    null;
  const filled = stats.filledSpots;
  const total = stats.totalSpots;
  const staffingConfigured = total != null && total > 0;
  const open =
    stats.openSpots ??
    (total != null && total >= filled ? total - filled : 0);
  const pendingApprovals = stats.pendingApprovals;
  const fillPct =
    staffingConfigured ? Math.min(100, Math.round((filled / total) * 100)) : null;
  const chip = statusChipLabel(event.status);
  const track = trackLabel(stats, event.status);
  const typeLabel = eventTypeLabel(event);
  const milestone = milestoneCopy({
    pendingApprovals,
    tasks: stats.tasks,
    open: Math.max(0, open),
    countdown,
  });

  const nextItems: Array<{
    when: string;
    title: string;
    detail: string;
    tab: OverviewJumpTab;
    tone: "sage" | "gold" | "rule";
  }> = [];
  if (pendingApprovals > 0) {
    nextItems.push({
      when: "Today",
      title: "Approve pending content",
      detail: `${pendingApprovals} item${pendingApprovals === 1 ? "" : "s"} waiting in Approvals.`,
      tab: "approvals",
      tone: "sage",
    });
  }
  if (stats.tasks > 0) {
    nextItems.push({
      when: countdown.isPast ? "Up next" : "Tomorrow",
      title: "Work open tasks",
      detail: `${stats.tasks} task${stats.tasks === 1 ? "" : "s"} in Planning.`,
      tab: "tasks",
      tone: "gold",
    });
  }
  nextItems.push({
    when: !countdown.isPast ? countdown.label : "Staffing",
    title: "Review volunteer coverage",
    detail:
      staffingConfigured
        ? `${filled} of ${total} spots filled on the latest signup snapshot.`
        : filled > 0
          ? `${filled} filled spots on the latest signup snapshot.`
          : "Connect or refresh your signup to see fill.",
    tab: "volunteers",
    tone: "rule",
  });

  const teamPreview = responsibilities
    .map((r) => r.displayName?.trim())
    .filter(Boolean)
    .slice(0, 3) as string[];
  const teamExtra = Math.max(0, responsibilities.length - teamPreview.length);
  const pendingInvite =
    inviteCollaborators.find((row) => row.status === "pending") ?? null;

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-10",
        isHome ? "max-w-none" : "max-w-[1240px]",
        statsPending ? "opacity-90" : null,
      )}
      aria-busy={statsPending || undefined}
    >
      {isHome ? (
        <section className={cn(ewCard, "relative overflow-hidden")}>
          <div className="relative flex flex-col lg:flex-row lg:items-stretch">
            <div className="relative min-h-[240px] w-full overflow-hidden bg-[#f4f0ea] lg:w-3/5 lg:min-h-[420px]">
              {imageUrl ? (
                <AppImage
                  src={imageUrl}
                  alt=""
                  fill
                  preset="hero"
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  priority
                />
              ) : (
                <div className="flex h-full min-h-[240px] w-full items-center justify-center bg-gradient-to-br from-[#1c352d] via-[#5a7568] to-[#c5a880] px-6 text-center text-sm font-medium text-white/90 lg:min-h-[420px]">
                  Official artwork appears here after Create with AI
                </div>
              )}
            </div>

            <div className="flex w-full flex-col justify-between gap-10 p-8 lg:w-2/5 lg:p-12">
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-[10px] font-bold tracking-[0.2em] uppercase",
                        ew.gold,
                      )}
                    >
                      Featured Event
                    </p>
                    <h2
                      className={cn(
                        "mt-2 font-display text-3xl leading-tight md:text-4xl",
                        ew.ink,
                      )}
                    >
                      {event.title}
                    </h2>
                    <p className={cn("mt-2 text-sm italic", ew.inksoft)}>
                      {[typeLabel, formatEventDate(event.date)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#ece2d4] bg-[#f4f0ea] px-3 py-1.5 text-[11px] font-medium",
                      ew.ink,
                    )}
                  >
                    <CheckCircle2
                      className={cn("h-3.5 w-3.5", ew.sageDeep)}
                      aria-hidden
                    />
                    {chip}
                  </span>
                </div>

                {event.description?.trim() ? (
                  <p className={cn("text-sm leading-relaxed", ew.inksoft)}>
                    {event.description.trim()}
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-8 pt-2">
                  <div>
                    <p
                      className={cn(
                        "text-[10px] font-bold tracking-wider uppercase",
                        ew.inksoft,
                      )}
                    >
                      Time
                    </p>
                    <p className={cn("mt-1 text-sm font-semibold", ew.ink)}>
                      {timeLabel || "TBD"}
                    </p>
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-[10px] font-bold tracking-wider uppercase",
                        ew.inksoft,
                      )}
                    >
                      Location
                    </p>
                    <p className={cn("mt-1 text-sm font-semibold", ew.ink)}>
                      {event.location?.trim() || "TBD"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-[#e6dfd5] pt-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e6dfd5] bg-[#f4f0ea] text-xs font-semibold text-[#1c352d]">
                      {leadInitials(lead?.displayName)}
                    </div>
                    <div className="min-w-0">
                      <p className={cn("truncate text-xs font-semibold", ew.ink)}>
                        {lead?.displayName?.trim() || "Not assigned yet"}
                      </p>
                      <p className={cn("text-[10px]", ew.inksoft)}>
                        {lead?.organizationTitle?.trim() || "Lead Person"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden items-center gap-1.5 sm:inline-flex">
                      <span className="h-2 w-2 rounded-full bg-[#8ea89d]" />
                      <span
                        className={cn(
                          "text-[10px] font-bold tracking-widest uppercase",
                          ew.inksoft,
                        )}
                      >
                        {track}
                      </span>
                    </span>
                    <EventManageMenu
                      event={event}
                      size="sm"
                      includeEditDetails
                      iconOnly
                      entityNoun={manageEntityNoun}
                    />
                  </div>
                </div>
                <Link
                  href={createHref}
                  prefetch={false}
                  onClick={(clickEvent) => {
                    clickEvent.preventDefault();
                    window.location.assign(createHref);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c352d] px-7 py-4 text-xs font-bold tracking-wide text-white uppercase transition hover:bg-[#5e6b65]"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Generate Event Plan
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className={cn(ewCard, "relative overflow-hidden")}>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            aria-hidden
          >
            {imageUrl ? (
              <AppImage
                src={imageUrl}
                alt=""
                fill
                preset="hero"
                className="object-cover object-center"
                sizes="100vw"
              />
            ) : null}
          </div>

          <div className="relative flex flex-col xl:flex-row xl:items-stretch">
            <div className="flex w-full flex-col items-start gap-10 p-8 lg:flex-row xl:w-2/3 xl:p-12">
              <div className="w-full shrink-0 lg:w-1/4">
                <div className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-[#e6dfd5] bg-white shadow-md">
                  {imageUrl ? (
                    <AppImage
                      src={imageUrl}
                      alt=""
                      fill
                      preset="card"
                      className="object-cover object-center"
                      sizes="(max-width: 1024px) 40vw, 20vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1c352d] via-[#5a7568] to-[#c5a880] px-4 text-center text-sm font-medium text-white/90">
                      Official artwork appears here after Create with AI
                    </div>
                  )}
                  <div className="absolute inset-0 bg-[#1c352d]/5 transition-colors group-hover:bg-transparent" />
                </div>
                <p
                  className={cn(
                    "mt-3 text-center text-[10px] font-medium tracking-[0.2em] uppercase lg:text-left",
                    ew.inksoft,
                  )}
                >
                  Official Artwork
                </p>
              </div>

              <div className="flex w-full flex-1 flex-col gap-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "mb-2 text-xs font-medium tracking-[0.2em] uppercase",
                        ew.gold,
                      )}
                    >
                      {seasonEyebrow(event.date)}
                    </p>
                    <h1
                      className={cn(
                        "font-display text-4xl leading-tight md:text-5xl",
                        ew.ink,
                      )}
                    >
                      {event.title}
                    </h1>
                    <p
                      className={cn(
                        "mt-4 flex flex-wrap items-center gap-2 text-sm italic",
                        ew.inksoft,
                      )}
                    >
                      <Calendar className="h-4 w-4 shrink-0 not-italic" aria-hidden />
                      <span>
                        {formatEventDate(event.date)}
                        {timeLabel ? ` · ${timeLabel}` : null}
                        {event.location ? ` · ${event.location}` : null}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border border-[#ece2d4] bg-[#f4f0ea] px-4 py-2 text-xs font-medium",
                        ew.ink,
                      )}
                    >
                      <CheckCircle2
                        className={cn("h-3.5 w-3.5", ew.sageDeep)}
                        aria-hidden
                      />
                      {chip}
                    </span>
                    <EventManageMenu
                      event={event}
                      size="sm"
                      includeEditDetails
                      iconOnly
                      entityNoun={manageEntityNoun}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div className="border-l-2 border-[#c5a880] pl-5">
                    <p
                      className={cn(
                        "mb-1 text-xs font-semibold tracking-wider uppercase",
                        ew.inksoft,
                      )}
                    >
                      Event Status
                    </p>
                    <p className={cn("font-display text-4xl", ew.ink)}>{track}</p>
                  </div>
                  <div className="flex flex-col justify-center gap-2 border-l-2 border-[#e6dfd5] pl-5">
                    <p className={cn("text-xs", ew.inksoft)}>Staffing Goal</p>
                    {staffingConfigured ? (
                      <>
                        <p className={cn("text-base font-medium tabular-nums", ew.ink)}>
                          {filled}{" "}
                          <span className={cn("text-xs font-normal", ew.inksoft)}>
                            of {total} filled
                          </span>
                        </p>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-[#faf8f5]">
                          <div
                            className="h-full rounded-full bg-[#8ea89d]"
                            style={{ width: `${fillPct ?? 0}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <p className={cn("text-sm", ew.inksoft)}>
                        Volunteer staffing isn&apos;t set up yet
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href={createHref}
                    prefetch={false}
                    onClick={(clickEvent) => {
                      clickEvent.preventDefault();
                      window.location.assign(createHref);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1c352d] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#5e6b65]"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Generate Event Plan
                  </Link>
                </div>
              </div>
            </div>

            <aside className="flex flex-col gap-8 border-t border-[#e6dfd5] bg-[#faf8f5]/30 p-8 xl:w-1/3 xl:border-t-0 xl:border-l xl:p-12">
              <div>
                <h3 className={cn("mb-2 font-display text-lg", ew.ink)}>
                  Lead Coordinator
                </h3>
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ece2d4] text-sm font-semibold text-[#1c352d] ring-2 ring-[#ece2d4] ring-offset-2">
                    {leadInitials(lead?.displayName)}
                  </div>
                  <div>
                    <p className={cn("text-sm font-medium", ew.ink)}>
                      {lead?.displayName?.trim() || "Not assigned yet"}
                    </p>
                    <p className={cn("text-xs italic", ew.inksoft)}>
                      {lead ? "Event Lead" : "Assign from Community"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-auto border-t border-[#e6dfd5] pt-6">
                <p
                  className={cn(
                    "text-[10px] font-bold tracking-[0.2em] uppercase",
                    ew.inksoft,
                  )}
                >
                  Upcoming Milestone
                </p>
                <p className={cn("mt-2 text-sm", ew.ink)}>{milestone.title}</p>
              </div>
            </aside>
          </div>
        </section>
      )}

      {afterHeroSlot}

      {showOperationalSummary ? (
        <section className={cn(ewCard, "p-8 shadow-sm")}>
          <div className="flex flex-col items-stretch gap-8 lg:flex-row lg:items-center lg:gap-10">
            <div className="grid w-full flex-1 grid-cols-2 gap-8 md:grid-cols-4">
              <div>
                <p
                  className={cn(
                    "text-[10px] font-bold tracking-widest uppercase",
                    ew.inksoft,
                  )}
                >
                  Event Status
                </p>
                <p className={cn("mt-1 font-display text-3xl", ew.ink)}>{track}</p>
              </div>
              <div>
                <p
                  className={cn(
                    "text-[10px] font-bold tracking-widest uppercase",
                    ew.inksoft,
                  )}
                >
                  Staffing Goal
                </p>
                {staffingConfigured ? (
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className={cn("font-display text-3xl", ew.ink)}>
                      {fillPct}%
                    </span>
                    <span className={cn("text-xs font-medium", ew.inksoft)}>
                      {filled} of {total} filled
                    </span>
                  </div>
                ) : (
                  <p className={cn("mt-2 text-sm", ew.inksoft)}>
                    Not set up yet
                  </p>
                )}
              </div>
              <div>
                <p
                  className={cn(
                    "text-[10px] font-bold tracking-widest uppercase",
                    ew.inksoft,
                  )}
                >
                  Lead Coordinator
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e6dfd5] bg-[#f4f0ea] text-[10px] font-bold text-[#1c352d]">
                    {leadInitials(lead?.displayName)}
                  </div>
                  <span className={cn("truncate text-xs font-semibold", ew.ink)}>
                    {lead?.displayName?.trim() || "Not assigned"}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[10px] font-bold tracking-widest uppercase",
                    ew.inksoft,
                  )}
                >
                  Upcoming Milestone
                </p>
                <p className={cn("mt-1 truncate text-sm font-semibold", ew.ink)}>
                  {milestone.title}
                </p>
                {milestone.detail ? (
                  <p
                    className={cn(
                      "mt-1 text-[10px] font-bold tracking-wider uppercase",
                      ew.sageDeep,
                    )}
                  >
                    {milestone.detail}
                  </p>
                ) : null}
              </div>
            </div>
            {onInviteTeamMember ? (
              <button
                type="button"
                onClick={onInviteTeamMember}
                data-testid="event-invite-team-member-ops"
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e6dfd5] bg-[#faf8f5] px-5 py-3 text-sm font-semibold text-[#1c352d] transition hover:bg-[#f4f0ea] lg:w-auto"
              >
                <UserPlus className="h-4 w-4" aria-hidden />
                Invite Team Member
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Attention + Staffing */}
      <section
        className={cn(
          "grid grid-cols-1 gap-8",
          isHome ? "md:grid-cols-2" : "lg:grid-cols-3",
        )}
      >
        <div className={cn(ewCard, "p-8", isHome ? null : "lg:col-span-2")}>
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className={cn("font-display text-2xl", ew.ink)}>
              {attentionTitle}
            </h2>
            <span className={cn("text-xs", ew.inksoft)}>
              {attention.length === 0
                ? "You’re clear"
                : `${attention.length} open item${attention.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {attention.length === 0 ? (
            <div className="flex items-center gap-6 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e6efe9] text-[#5a7568]">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className={cn("text-base font-medium", ew.ink)}>
                  Nothing urgent
                </p>
                <p className={cn("text-sm", ew.inksoft)}>
                  Approvals, tasks, and volunteer fill look calm for now.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#e6dfd5]/50">
              {attention.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.tab)}
                  className="group flex items-center gap-6 py-5 text-left"
                >
                  <AttentionIcon icon={item.icon} tone={item.tone} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-base font-medium", ew.ink)}>
                      {item.title}
                    </p>
                    <p className={cn("truncate text-sm", ew.inksoft)}>
                      {item.detail}
                    </p>
                  </div>
                  <ArrowRight
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1",
                      ew.inksoft,
                    )}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={cn(ewCard, "flex flex-col gap-6 p-8")}>
          <h2 className={cn("font-display text-2xl", ew.ink)}>Staffing Status</h2>
          {staffingConfigured ? (
            <>
              <StaffingDonut
                filled={filled}
                open={Math.max(0, open)}
                pending={pendingApprovals}
              />
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className={cn("flex items-center gap-2", ew.inksoft)}>
                    <span className="h-2.5 w-2.5 rounded-full bg-[#1c352d]" />
                    Filled
                  </span>
                  <span className={cn("font-medium tabular-nums", ew.ink)}>
                    {filled} spots
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn("flex items-center gap-2", ew.inksoft)}>
                    <span className="h-2.5 w-2.5 rounded-full bg-[#c5a880]" />
                    Pending review
                  </span>
                  <span className={cn("font-medium tabular-nums", ew.ink)}>
                    {pendingApprovals}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn("flex items-center gap-2", ew.inksoft)}>
                    <span className="h-2.5 w-2.5 rounded-full bg-[#e6dfd5]" />
                    Open
                  </span>
                  <span className={cn("font-medium tabular-nums", ew.ink)}>
                    {Math.max(0, open)} spots
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col justify-center gap-4 py-4">
              <p className={cn("text-sm leading-relaxed", ew.inksoft)}>
                Volunteer staffing isn&apos;t set up yet. Connect a signup to
                track filled and open spots.
              </p>
              <button
                type="button"
                onClick={() => onSelectTab("volunteers")}
                className="inline-flex items-center justify-center rounded-full bg-[#1c352d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5e6b65]"
              >
                Set up volunteers
              </button>
            </div>
          )}
        </div>
      </section>

      {/* What's Next — Event ID overview only */}
      {showWhatsNext ? (
        <section className={cn(ewCard, "relative overflow-hidden p-10 shadow-sm")}>
          <CalendarCheck
            className="pointer-events-none absolute top-0 right-0 -mt-10 -mr-10 h-[180px] w-[180px] text-[#1c352d] opacity-[0.03]"
            aria-hidden
          />
          <h2 className={cn("mb-10 font-display text-2xl", ew.ink)}>What’s Next</h2>
          <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3">
            {nextItems.slice(0, 3).map((item) => (
              <button
                key={`${item.when}-${item.title}`}
                type="button"
                onClick={() => onSelectTab(item.tab)}
                className="relative border-l border-[#e6dfd5]/60 pl-8 text-left md:pl-8"
              >
                <span
                  className={cn(
                    "absolute top-1 left-[-6px] h-3 w-3 rounded-full",
                    item.tone === "sage"
                      ? "bg-[#8ea89d] shadow-[0_0_0_6px_rgba(142,168,157,0.1)]"
                      : item.tone === "gold"
                        ? "bg-[#c5a880] shadow-[0_0_0_6px_rgba(197,168,128,0.1)]"
                        : "bg-[#e6dfd5] shadow-[0_0_0_6px_rgba(230,223,213,0.2)]",
                  )}
                  aria-hidden
                />
                <p
                  className={cn(
                    "mb-2 text-[10px] font-bold tracking-[0.2em] uppercase",
                    item.tone === "rule" ? ew.inksoft : ew.gold,
                  )}
                >
                  {item.when}
                </p>
                <p className={cn("text-base font-medium", ew.ink)}>{item.title}</p>
                <p className={cn("mt-1 text-xs leading-relaxed", ew.inksoft)}>
                  {item.detail}
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Workspace hub cards */}
      <section>
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className={cn("font-display text-3xl", ew.ink)}>
              Event Workspace
            </h2>
            <p className={cn("mt-1 text-sm", ew.inksoft)}>
              Manage the core logistics and volunteer operations
            </p>
          </div>
          <div className="flex items-center gap-6 rounded-full border border-[#e6dfd5] bg-white px-6 py-3 shadow-sm">
            <button
              type="button"
              onClick={() => onSelectTab("insights")}
              className={cn(
                "flex items-center gap-2 text-xs font-semibold transition hover:text-[#1c352d]",
                ew.inksoft,
              )}
            >
              <span className={ew.gold}>↗</span> Insights
            </button>
            <span className="h-3 w-px bg-[#e6dfd5]" aria-hidden />
            <button
              type="button"
              onClick={() => onSelectTab("activity")}
              className={cn(
                "flex items-center gap-2 text-xs font-semibold transition hover:text-[#1c352d]",
                ew.inksoft,
              )}
            >
              <span className={ew.gold}>↺</span> Activity
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <WorkspaceCard
            icon={<ClipboardList className="h-5 w-5" />}
            title="Planning"
            subtitle="Tasks, Notes, & Files"
            meta={
              <span className="rounded bg-[#e6efe9] px-2 py-1 text-xs font-medium text-[#5a7568]">
                {stats.tasks} Open Task{stats.tasks === 1 ? "" : "s"}
              </span>
            }
            onClick={() => onSelectTab("tasks")}
          />
          <WorkspaceCard
            icon={<FileStack className="h-5 w-5" />}
            title="Approvals"
            subtitle="Content requiring review"
            meta={
              <span className="rounded bg-[#f4f0ea] px-2 py-1 text-xs font-medium text-[#c5a880]">
                {pendingApprovals === 0
                  ? "All clear"
                  : `${pendingApprovals} Pending Review`}
              </span>
            }
            onClick={() => onSelectTab("approvals")}
          />
          <WorkspaceCard
            icon={<Users className="h-5 w-5" />}
            title="Volunteers"
            subtitle="Shifts & Signups"
            meta={
              <span className="rounded bg-[#faf8f5] px-2 py-1 text-xs font-medium text-[#5e6b65]">
                {staffingConfigured
                  ? `${filled}/${total} Filled`
                  : filled > 0
                    ? `${filled} Filled`
                    : "Not set up"}
              </span>
            }
            onClick={() => onSelectTab("volunteers")}
          />
          <CommunityWorkspaceCard
            teamPreview={teamPreview}
            teamExtra={teamExtra}
            pendingInvite={pendingInvite}
            onOpenCommunity={() => onSelectTab("responsibilities")}
            onInviteTeamMember={onInviteTeamMember}
          />
        </div>
      </section>
    </div>
  );
}

function CommunityWorkspaceCard({
  teamPreview,
  teamExtra,
  pendingInvite,
  onOpenCommunity,
  onInviteTeamMember,
}: {
  teamPreview: string[];
  teamExtra: number;
  pendingInvite: EventInviteCollaboratorPreview | null;
  onOpenCommunity: () => void;
  onInviteTeamMember?: () => void;
}) {
  return (
    <div
      className={cn(
        ewCard,
        "group flex flex-col gap-6 p-8 text-left transition-all hover:-translate-y-1 hover:shadow-md",
      )}
    >
      <button
        type="button"
        onClick={onOpenCommunity}
        className="flex flex-col gap-6 text-left"
      >
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border border-[#e6dfd5] bg-[#faf8f5] transition-colors group-hover:bg-[#f4f0ea]",
            ew.ink,
          )}
        >
          <UsersRound className="h-5 w-5" />
        </div>
        <div>
          <h3 className={cn("font-display text-lg", ew.ink)}>Community</h3>
          <p className={cn("mt-1 text-xs", ew.inksoft)}>Team & Vendors</p>
        </div>
      </button>

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          {teamPreview.length > 0 ? (
            <button
              type="button"
              onClick={onOpenCommunity}
              className="flex -space-x-2"
              aria-label="Open Community team"
            >
              {teamPreview.map((name) => (
                <span
                  key={name}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#ece2d4] text-[10px] font-bold text-[#1c352d]"
                  title={name}
                >
                  {name
                    .split(/\s+/)
                    .map((p) => p[0]?.toUpperCase() ?? "")
                    .slice(0, 2)
                    .join("")}
                </span>
              ))}
              {teamExtra > 0 ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#f4f0ea] text-[10px] font-bold text-[#1c352d]">
                  +{teamExtra}
                </span>
              ) : null}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenCommunity}
              className="rounded bg-[#faf8f5] px-2 py-1 text-xs font-medium text-[#5e6b65]"
            >
              Add team
            </button>
          )}

          {onInviteTeamMember ? (
            <button
              type="button"
              onClick={onInviteTeamMember}
              data-testid="event-invite-team-member-community"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1c352d] px-4 py-2 text-[10px] font-bold tracking-wider text-white uppercase transition-colors hover:bg-[#5e6b65]"
            >
              <span aria-hidden>+</span> Invite
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenCommunity}
              className="text-[#e6dfd5] transition-colors group-hover:text-[#c5a880]"
              aria-label="Open Community"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        {pendingInvite ? (
          <div className="flex items-center gap-3 border-t border-[#e6dfd5]/30 pt-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#e6dfd5] bg-[#faf8f5] text-[10px] font-bold text-[#5e6b65]">
              {pendingInvite.displayName
                .split(/\s+/)
                .map((part) => part[0]?.toUpperCase() ?? "")
                .slice(0, 2)
                .join("") || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] leading-tight font-semibold text-[#1c352d]">
                {pendingInvite.displayName}
              </p>
              <p className="text-[10px] text-[#5e6b65]">
                {pendingInvite.roleLabel} ·{" "}
                <span className="font-medium italic text-[#c5a880]">
                  Invite pending
                </span>
              </p>
            </div>
          </div>
        ) : null}
      </div>
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
  meta: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        ewCard,
        "group flex flex-col gap-6 p-8 text-left transition-all hover:-translate-y-1 hover:shadow-md",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border border-[#e6dfd5] bg-[#faf8f5] transition-colors group-hover:bg-[#f4f0ea]",
          ew.ink,
        )}
      >
        {icon}
      </div>
      <div>
        <h3 className={cn("font-display text-lg", ew.ink)}>{title}</h3>
        <p className={cn("mt-1 text-xs", ew.inksoft)}>{subtitle}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        {meta}
        <ArrowRight
          className="h-4 w-4 text-[#e6dfd5] transition-colors group-hover:text-[#c5a880]"
          aria-hidden
        />
      </div>
    </button>
  );
}
