"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import {
  FacebookPlatformIcon,
  InstagramPlatformIcon,
} from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { MILESTONE_PLANNING_COLORS } from "@/components/event-workspace/plan/milestone-planning-utils";
import { computePlanningProgress } from "@/lib/event-playbooks/progress";
import {
  filterSocialBundles,
  formatSocialPostDateColumn,
  formatSocialPostTime,
  isScheduledSocialPost,
} from "@/lib/event-playbooks/planning-hub-utils";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { EventPlaybookTask } from "@/types/event-playbooks";

const SIDEBAR_COLORS = {
  donutTrack: "#E8E2DA",
  donutFill: "#C4A77D",
  cardBg: "#FFFFFF",
} as const;

interface SocialMediaCenterSidebarProps {
  eventId: string;
  tasks: EventPlaybookTask[];
  metaPublishBundles: MetaPublishBundle[];
  onCreateMilestone?: () => void;
}

function MilestoneProgressDonut({ percent }: { percent: number }) {
  const size = 88;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={SIDEBAR_COLORS.donutTrack}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={SIDEBAR_COLORS.donutFill}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute font-display text-2xl"
        style={{ color: MILESTONE_PLANNING_COLORS.text }}
      >
        {percent}%
      </span>
    </div>
  );
}

function resolveBundlePlatform(bundle: MetaPublishBundle): "facebook" | "instagram" | null {
  const platforms = new Set(bundle.targets.map((target) => target.platform));
  if (platforms.has("instagram") && !platforms.has("facebook")) {
    return "instagram";
  }
  if (platforms.has("facebook")) {
    return "facebook";
  }
  if (platforms.has("instagram")) {
    return "instagram";
  }
  return null;
}

function SidebarCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="border p-4"
      style={{
        borderColor: MILESTONE_PLANNING_COLORS.border,
        backgroundColor: SIDEBAR_COLORS.cardBg,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className="font-display text-base"
          style={{ color: MILESTONE_PLANNING_COLORS.text }}
        >
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function SidebarLink({
  href,
  children,
  onClick,
}: {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const className =
    "font-display text-xs transition-opacity hover:opacity-80";
  const style = { color: "#8A7355" };

  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} style={style}>
      {children}
    </button>
  );
}

export function SocialMediaCenterSidebar({
  eventId,
  tasks,
  metaPublishBundles,
  onCreateMilestone,
}: SocialMediaCenterSidebarProps) {
  const progressPercent = computePlanningProgress(tasks);
  const doneTaskCount = tasks.filter((task) => task.status === "done").length;
  const upcomingBundles = filterSocialBundles(metaPublishBundles, "upcoming").slice(0, 3);

  return (
    <aside className="flex flex-col gap-4">
      <SidebarCard title="Milestone Progress">
        <div className="mt-4 flex items-center gap-4">
          <MilestoneProgressDonut percent={progressPercent} />
          <div>
            <p className="text-sm" style={{ color: "#7A7268" }}>
              <span
                className="font-medium"
                style={{ color: MILESTONE_PLANNING_COLORS.text }}
              >
                {doneTaskCount}
              </span>{" "}
              of{" "}
              <span
                className="font-medium"
                style={{ color: MILESTONE_PLANNING_COLORS.text }}
              >
                {tasks.length}
              </span>{" "}
              tasks
            </p>
            <div className="mt-2">
              <SidebarLink href={`/events/${eventId}#tasks`}>
                View all tasks →
              </SidebarLink>
            </div>
          </div>
        </div>
      </SidebarCard>

      <SidebarCard
        title="Upcoming Milestones"
        action={
          <SidebarLink href="/calendar">View calendar →</SidebarLink>
        }
      >
        <ul className="mt-4 space-y-3">
          {upcomingBundles.length === 0 ? (
            <li className="text-sm" style={{ color: "#7A7268" }}>
              No upcoming milestones scheduled yet.
            </li>
          ) : (
            upcomingBundles.map((bundle, index) => {
              const dateColumn = formatSocialPostDateColumn(bundle);
              const platform = resolveBundlePlatform(bundle);

              return (
                <li
                  key={`${bundle.relativeDay}-${bundle.title}-${index}`}
                  className="flex items-center gap-3"
                >
                  <div
                    className="flex w-12 shrink-0 flex-col items-center leading-none"
                    style={{ color: "#7A7268" }}
                  >
                    <span className="text-[9px] font-bold tracking-wide">
                      {dateColumn.month}
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{ color: MILESTONE_PLANNING_COLORS.text }}
                    >
                      {dateColumn.day}
                    </span>
                    <span className="text-[9px] font-semibold tracking-wide">
                      {dateColumn.weekday}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: MILESTONE_PLANNING_COLORS.text }}
                    >
                      {bundle.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: "#7A7268" }}>
                      {platform === "facebook" && (
                        <FacebookPlatformIcon className="h-3.5 w-3.5" />
                      )}
                      {platform === "instagram" && (
                        <InstagramPlatformIcon className="h-3.5 w-3.5" />
                      )}
                      {formatSocialPostTime(bundle)}
                    </p>
                  </div>

                  {isScheduledSocialPost(bundle) && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: MILESTONE_PLANNING_COLORS.successBg,
                        color: MILESTONE_PLANNING_COLORS.success,
                      }}
                    >
                      Scheduled
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>

        <button
          type="button"
          onClick={onCreateMilestone}
          className="mt-4 flex w-full items-center justify-center gap-1.5 border py-2.5 text-xs font-medium transition-colors hover:bg-[#FAF7F2]"
          style={{
            borderColor: MILESTONE_PLANNING_COLORS.border,
            color: MILESTONE_PLANNING_COLORS.text,
            backgroundColor: "#FFFFFF",
          }}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Create new milestone
        </button>
      </SidebarCard>
    </aside>
  );
}
