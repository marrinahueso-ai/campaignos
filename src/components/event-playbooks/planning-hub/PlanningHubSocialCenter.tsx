"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { MessageSquare, Plus } from "lucide-react";
import {
  filterSocialBundles,
  formatSocialPostSchedule,
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
        <p className="mt-4 text-sm text-[#7a7268]">
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

      <div className="mt-4 flex gap-1 rounded-lg bg-[#f6f2eb] p-1">
        {TABS.map((tab) => (
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
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab.id
                ? "bg-[#fffcf7] text-[#2a2622] shadow-sm"
                : "text-[#7a7268] hover:text-[#2a2622]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ul className="mt-3 flex-1 space-y-2">
        {posts.length === 0 ? (
          <li className="rounded-lg border border-dashed border-[#e8e0d4] px-3 py-6 text-center text-sm text-[#7a7268]">
            No {activeTab} posts yet.
          </li>
        ) : (
          posts.slice(0, 3).map((bundle, index) => {
            const thumbnail = socialPostThumbnail(bundle);
            return (
              <li
                key={`${bundle.relativeDay}-${bundle.title}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-[#f0ebe3] bg-[#faf7f2] px-3 py-2.5"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[#e8e0d4] bg-[#f6f2eb]">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#c4bab0]">
                      <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#2a2622]">
                    {socialPostPlatformLabel(bundle)}
                  </p>
                  <p className="text-xs text-[#a89f94]">
                    {formatSocialPostSchedule(bundle)}
                  </p>
                </div>
                {isScheduledSocialPost(bundle) && (
                  <span className="shrink-0 rounded-full bg-[#e4f2e8] px-2 py-0.5 text-[10px] font-semibold text-[#3d7a4a]">
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
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#e8e0d4] bg-[#f6f2eb] px-4 py-2.5 text-sm font-semibold text-[#2a2622] transition-colors hover:bg-[#ebe4d9]"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Create New Post
      </button>
    </PlanningHubCard>
  );
}
