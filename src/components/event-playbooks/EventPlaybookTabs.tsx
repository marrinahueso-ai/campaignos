"use client";

import { useCallback, useEffect, useState } from "react";
import {
  stepFromHash as campaignStepFromHash,
  type CampaignWorkflowStep,
} from "@/components/event-workspace/CampaignWorkspaceTabs";
import { cn } from "@/lib/utils/cn";

export type EventPlaybookTab =
  | "overview"
  | "tasks"
  | "notes"
  | "files"
  | "social-media"
  | "ai-insights"
  | "settings";

const ALL_TABS: { id: EventPlaybookTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "social-media", label: "Social Media" },
  { id: "tasks", label: "Tasks" },
  { id: "notes", label: "Notes & Lessons" },
  { id: "files", label: "Files" },
  { id: "ai-insights", label: "AI Insights" },
  { id: "settings", label: "Settings" },
];

const LEGACY_CAMPAIGN_HASHES = new Set([
  "plan",
  "communication-plan",
  "overview",
  "artwork",
  "creative",
  "schedule",
  "captions",
  "timeline",
  "publish",
  "published",
  "approval",
  "publishing",
]);

function parseLocationHash(): {
  tab: EventPlaybookTab;
  campaignStep: CampaignWorkflowStep | null;
} {
  const raw = window.location.hash.replace("#", "");
  if (!raw) {
    return { tab: "overview", campaignStep: null };
  }

  if (ALL_TABS.some((entry) => entry.id === raw)) {
    return { tab: raw as EventPlaybookTab, campaignStep: null };
  }

  if (LEGACY_CAMPAIGN_HASHES.has(raw)) {
    return {
      tab: "social-media",
      campaignStep: campaignStepFromHash(`#${raw}`) ?? "plan",
    };
  }

  const campaignStep = campaignStepFromHash(`#${raw}`);
  if (campaignStep) {
    return { tab: "social-media", campaignStep };
  }

  return { tab: "overview", campaignStep: null };
}

interface EventPlaybookTabsProps {
  overview: React.ReactNode;
  tasks: React.ReactNode;
  notes: React.ReactNode;
  files: React.ReactNode;
  socialMedia: React.ReactNode | null;
  aiInsights: React.ReactNode;
  settings: React.ReactNode;
  hasCampaign?: boolean;
  defaultTab?: EventPlaybookTab;
  initialCampaignStep?: CampaignWorkflowStep;
  onCampaignStepChange?: (step: CampaignWorkflowStep) => void;
}

export function EventPlaybookTabs({
  overview,
  tasks,
  notes,
  files,
  socialMedia,
  aiInsights,
  settings,
  hasCampaign = true,
  defaultTab = "overview",
  initialCampaignStep = "plan",
  onCampaignStepChange,
}: EventPlaybookTabsProps) {
  const visibleTabs = hasCampaign
    ? ALL_TABS
    : ALL_TABS.filter((tab) => tab.id !== "social-media");

  const [activeTab, setActiveTab] = useState<EventPlaybookTab>(defaultTab);
  const [campaignStep, setCampaignStep] =
    useState<CampaignWorkflowStep>(initialCampaignStep);
  const [initialized, setInitialized] = useState(false);

  const syncFromHash = useCallback(() => {
    const parsed = parseLocationHash();
    const tab = visibleTabs.some((entry) => entry.id === parsed.tab)
      ? parsed.tab
      : defaultTab;
    setActiveTab(tab);
    if (parsed.campaignStep) {
      setCampaignStep(parsed.campaignStep);
      onCampaignStepChange?.(parsed.campaignStep);
    }
  }, [defaultTab, onCampaignStepChange, visibleTabs]);

  useEffect(() => {
    syncFromHash();
    setInitialized(true);
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [syncFromHash]);

  function selectTab(tab: EventPlaybookTab) {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
  }

  const panels: Record<EventPlaybookTab, React.ReactNode> = {
    overview,
    tasks,
    notes,
    files,
    "social-media": socialMedia,
    "ai-insights": aiInsights,
    settings,
  };

  return (
    <div className="border border-cos-border bg-cos-card shadow-sm">
      <div
        className="sticky-dashboard-subnav border-b border-cos-border px-4 pt-4 lg:px-6"
        role="navigation"
        aria-label="Planning hub sections"
      >
        <div
          className="flex gap-0 overflow-x-auto border border-cos-border bg-cos-bg p-1"
          role="tablist"
        >
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`playbook-tab-${tab.id}`}
                id={`playbook-tab-trigger-${tab.id}`}
                onClick={() => selectTab(tab.id)}
                className={cn(
                  "shrink-0 px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-cos-card text-cos-text shadow-sm"
                    : "text-cos-muted hover:text-cos-text",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-cos-bg p-6 lg:p-8">
        {!initialized ? (
          <div className="min-h-[12rem] animate-pulse bg-cos-bg/60" />
        ) : (
          visibleTabs.map((tab) =>
            activeTab === tab.id ? (
              <div
                key={tab.id}
                id={`playbook-tab-${tab.id}`}
                role="tabpanel"
                aria-labelledby={`playbook-tab-trigger-${tab.id}`}
              >
                {tab.id === "social-media" && socialMedia
                  ? socialMedia
                  : panels[tab.id]}
              </div>
            ) : null,
          )
        )}
      </div>
    </div>
  );
}

// Re-export for hash parsing in hub shell
export { type CampaignWorkflowStep };
