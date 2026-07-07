"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { MessageSquare, Plus } from "lucide-react";
import {
  filterSocialBundles,
  formatSocialPostDateColumn,
  formatSocialPostTime,
  isScheduledSocialPost,
  socialPostPlatformLabel,
  socialPostThumbnail,
  type SocialPostFilter,
} from "@/lib/event-playbooks/planning-hub-utils";
import {
  PlanningHubActionLink,
  PlanningHubCard,
  PlanningHubSectionTitle,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import { cn } from "@/lib/utils/cn";

const SOCIAL_CENTER_BORDER = "#006B5D";

const socialCenterCardClass =
  "flex h-full flex-col border-2 p-5 shadow-[0_1px_2px_rgba(42,38,34,0.04)]";

const TABS: { id: SocialPostFilter | "calendar"; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "recent", label: "Recent" },
  { id: "drafts", label: "Drafts" },
  { id: "calendar", label: "Calendar" },
];

interface PlanningHubSocialCenterProps {
  bundles: MetaPublishBundle[];
  hasCampaign: boolean;
  onNavigateTab: (tab: EventPlaybookTab, step?: CampaignWorkflowStep) => void;
}

export function PlanningHubSocialCenter({
  bundles,
  hasCampaign,
  onNavigateTab,
}: PlanningHubSocialCenterProps) {
  const [activeTab, setActiveTab] = useState<SocialPostFilter | "calendar">("upcoming");

  const posts = useMemo(() => {
    if (activeTab === "calendar") {
      return filterSocialBundles(bundles, "upcoming");
    }
    return filterSocialBundles(bundles, activeTab);
  }, [activeTab, bundles]);

  if (!hasCampaign) {
    return (
      <PlanningHubCard
        className={socialCenterCardClass}
        style={{ borderColor: SOCIAL_CENTER_BORDER }}
      >
        <PlanningHubSectionTitle icon={MessageSquare} title="Social Media Center" />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm text-cos-muted">
            Social media planning is available for full campaigns.
          </p>
        </div>
      </PlanningHubCard>
    );
  }

  return (
    <PlanningHubCard
      className={socialCenterCardClass}
      style={{ borderColor: SOCIAL_CENTER_BORDER }}
    >
      <PlanningHubSectionTitle
        icon={MessageSquare}
        title="Social Media Center"
        action={
          <PlanningHubActionLink onClick={() => onNavigateTab("social-media", "publish")}>
            View all posts →
          </PlanningHubActionLink>
        }
      />

      <div className="mt-4 flex gap-4 border-b border-cos-border">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === "calendar") {
                  window.location.href = "/calendar";
                  return;
                }
                setActiveTab(tab.id);
              }}
              className={cn(
                "-mb-px pb-2 text-xs font-medium transition-colors",
                isActive
                  ? "border-b-2 border-cos-text font-semibold text-cos-text"
                  : "text-cos-muted hover:text-cos-text",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-1 flex-col justify-center space-y-2">
        {posts.length === 0 ? (
          <li className="flex flex-1 items-center justify-center">
            <p className="w-full rounded-[10px] border border-dashed border-cos-border px-3 py-8 text-center text-sm text-cos-muted">
              No {activeTab} posts yet.
            </p>
          </li>
        ) : (
          posts.slice(0, 3).map((bundle, index) => {
            const thumbnail = socialPostThumbnail(bundle);
            const dateColumn = formatSocialPostDateColumn(bundle);

            return (
              <li
                key={`${bundle.relativeDay}-${bundle.title}-${index}`}
                className="flex items-center gap-3 rounded-[10px] border border-cos-border bg-cos-bg px-3 py-2.5"
              >
                <div className="flex w-11 shrink-0 flex-col items-center leading-none text-cos-dark-muted">
                  <span className="text-[9px] font-bold tracking-wide">{dateColumn.month}</span>
                  <span className="text-lg font-bold text-cos-text">
                    {dateColumn.day}
                  </span>
                  <span className="text-[9px] font-semibold tracking-wide">
                    {dateColumn.weekday}
                  </span>
                </div>

                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[8px] border border-cos-border bg-cos-bg-alt">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-cos-dark-muted" strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-cos-text">
                    {bundle.title}
                  </p>
                  <p className="truncate text-xs text-cos-dark-muted">
                    {socialPostPlatformLabel(bundle)} · {formatSocialPostTime(bundle)}
                  </p>
                </div>

                {isScheduledSocialPost(bundle) && (
                  <span className="shrink-0 rounded-full bg-cos-success-bg px-2 py-0.5 text-[10px] font-semibold text-cos-success-text">
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
        onClick={() => onNavigateTab("social-media", "plan")}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] border border-cos-border bg-cos-bg-alt px-4 py-2.5 text-sm font-semibold text-cos-text transition-colors hover:bg-cos-bg"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Create New Post
      </button>
    </PlanningHubCard>
  );
}
