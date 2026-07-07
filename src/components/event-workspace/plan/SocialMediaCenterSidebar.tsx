"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import {
  FacebookPlatformIcon,
  InstagramPlatformIcon,
} from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { SocialMediaCenterContextCard } from "@/components/event-workspace/plan/SocialMediaCenterContextCard";
import { computePlanningProgress } from "@/lib/event-playbooks/progress";
import {
  filterSocialBundles,
  formatSocialPostDateColumn,
  formatSocialPostTime,
  isScheduledSocialPost,
} from "@/lib/event-playbooks/planning-hub-utils";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { MilestonePlanningVpRoleOption } from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import type { EventPlaybookTask } from "@/types/event-playbooks";
import type { Event } from "@/types";
import type { CommunicationPlaybook } from "@/types/playbooks";

interface SocialMediaCenterSidebarProps {
  event: Event;
  eventId: string;
  tasks: EventPlaybookTask[];
  metaPublishBundles: MetaPublishBundle[];
  onCreateMilestone?: () => void;
  playbookId: string;
  availablePlaybooks: CommunicationPlaybook[];
  vpRoles: MilestonePlanningVpRoleOption[];
  defaultVpRoleId: string;
  committeePersonOptions: string[];
  defaultCommitteePerson: string;
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
          className="stroke-cos-bg-alt"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-cos-accent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute font-display text-2xl text-cos-text">{percent}%</span>
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
    <div className="border border-cos-border bg-cos-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base text-cos-text">{title}</h3>
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
    "font-display text-xs text-cos-accent transition-opacity hover:text-cos-text";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function SocialMediaCenterSidebar({
  event,
  eventId,
  tasks,
  metaPublishBundles,
  onCreateMilestone,
  playbookId,
  availablePlaybooks,
  vpRoles,
  defaultVpRoleId,
  committeePersonOptions,
  defaultCommitteePerson,
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
            <p className="text-sm text-cos-muted">
              <span className="font-medium text-cos-text">{doneTaskCount}</span> of{" "}
              <span className="font-medium text-cos-text">{tasks.length}</span> tasks
            </p>
            <div className="mt-2">
              <SidebarLink href={`/events/${eventId}#tasks`}>View all tasks →</SidebarLink>
            </div>
          </div>
        </div>
      </SidebarCard>

      <SocialMediaCenterContextCard
        event={event}
        playbookId={playbookId}
        availablePlaybooks={availablePlaybooks}
        vpRoles={vpRoles}
        defaultVpRoleId={defaultVpRoleId}
        committeePersonOptions={committeePersonOptions}
        defaultCommitteePerson={defaultCommitteePerson}
      />

      <SidebarCard
        title="Upcoming Milestones"
        action={<SidebarLink href="/calendar">View calendar →</SidebarLink>}
      >
        <ul className="mt-4 space-y-3">
          {upcomingBundles.length === 0 ? (
            <li className="text-sm text-cos-muted">No upcoming milestones scheduled yet.</li>
          ) : (
            upcomingBundles.map((bundle, index) => {
              const dateColumn = formatSocialPostDateColumn(bundle);
              const platform = resolveBundlePlatform(bundle);

              return (
                <li
                  key={`${bundle.relativeDay}-${bundle.title}-${index}`}
                  className="flex items-center gap-3"
                >
                  <div className="flex w-12 shrink-0 flex-col items-center leading-none text-cos-muted">
                    <span className="text-[9px] font-bold tracking-wide">
                      {dateColumn.month}
                    </span>
                    <span className="text-lg font-bold text-cos-text">{dateColumn.day}</span>
                    <span className="text-[9px] font-semibold tracking-wide">
                      {dateColumn.weekday}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-cos-text">{bundle.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-cos-muted">
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
                    <span className="shrink-0 rounded-full bg-cos-success-bg px-2 py-0.5 text-[10px] font-medium text-cos-success-text">
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
          className="mt-4 flex w-full items-center justify-center gap-1.5 border border-cos-border bg-cos-card py-2.5 text-xs font-medium text-cos-text transition-colors hover:bg-cos-bg"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Create new milestone
        </button>
      </SidebarCard>
    </aside>
  );
}
