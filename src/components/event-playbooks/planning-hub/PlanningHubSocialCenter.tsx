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
  PH,
  PlanningHubActionLink,
  PlanningHubCard,
  PlanningHubSectionTitle,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import { cn } from "@/lib/utils/cn";

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
      <PlanningHubCard className="flex h-full flex-col p-5">
        <PlanningHubSectionTitle icon={MessageSquare} title="Social Media Center" />
        <p className="mt-4 text-sm" style={{ color: PH.textSecondary }}>
          Social media planning is available for full campaigns.
        </p>
      </PlanningHubCard>
    );
  }

  return (
    <PlanningHubCard className="flex h-full flex-col p-5">
      <PlanningHubSectionTitle
        icon={MessageSquare}
        title="Social Media Center"
        action={
          <PlanningHubActionLink onClick={() => onNavigateTab("social-media", "publish")}>
            View all posts →
          </PlanningHubActionLink>
        }
      />

      <div
        className="mt-4 flex gap-4 border-b"
        style={{ borderColor: PH.cardBorder }}
      >
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
                isActive ? "border-b-2 font-semibold" : "hover:opacity-80",
              )}
              style={{
                color: isActive ? PH.textPrimary : PH.textSecondary,
                borderColor: isActive ? PH.textPrimary : "transparent",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <ul className="mt-3 flex-1 space-y-2">
        {posts.length === 0 ? (
          <li
            className="rounded-[10px] border border-dashed px-3 py-6 text-center text-sm"
            style={{ borderColor: PH.cardBorder, color: PH.textSecondary }}
          >
            No {activeTab} posts yet.
          </li>
        ) : (
          posts.slice(0, 3).map((bundle, index) => {
            const thumbnail = socialPostThumbnail(bundle);
            const dateColumn = formatSocialPostDateColumn(bundle);

            return (
              <li
                key={`${bundle.relativeDay}-${bundle.title}-${index}`}
                className="flex items-center gap-3 rounded-[10px] border px-3 py-2.5"
                style={{ borderColor: PH.cardBorder, backgroundColor: PH.pageBg }}
              >
                <div
                  className="flex w-11 shrink-0 flex-col items-center leading-none"
                  style={{ color: PH.textMuted }}
                >
                  <span className="text-[9px] font-bold tracking-wide">{dateColumn.month}</span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: PH.textPrimary }}
                  >
                    {dateColumn.day}
                  </span>
                  <span className="text-[9px] font-semibold tracking-wide">
                    {dateColumn.weekday}
                  </span>
                </div>

                <div
                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[8px] border"
                  style={{ borderColor: PH.cardBorder, backgroundColor: PH.beigeButton }}
                >
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
                      <MessageSquare className="h-4 w-4" style={{ color: PH.iconMuted }} strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: PH.textPrimary }}
                  >
                    {bundle.title}
                  </p>
                  <p className="truncate text-xs" style={{ color: PH.textMuted }}>
                    {socialPostPlatformLabel(bundle)} · {formatSocialPostTime(bundle)}
                  </p>
                </div>

                {isScheduledSocialPost(bundle) && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: PH.greenScheduled,
                      color: PH.greenScheduledText,
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
        onClick={() => onNavigateTab("social-media", "plan")}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition-colors"
        style={{
          borderColor: PH.cardBorder,
          backgroundColor: PH.beigeButton,
          color: PH.textPrimary,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = PH.beigeButtonHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = PH.beigeButton;
        }}
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Create New Post
      </button>
    </PlanningHubCard>
  );
}
