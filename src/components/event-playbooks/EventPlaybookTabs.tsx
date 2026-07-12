"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  stepFromHash as campaignStepFromHash,
  type CampaignWorkflowStep,
} from "@/components/event-workspace/CampaignWorkspaceTabs";
import { subscribeToLocationHash } from "@/lib/navigation/location-hash";
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
  { id: "tasks", label: "Tasks" },
  { id: "notes", label: "Notes & Lessons" },
  { id: "files", label: "Files" },
  { id: "ai-insights", label: "AI Insights" },
  { id: "settings", label: "Settings" },
];

const LEGACY_CAMPAIGN_HASHES = new Set([
  "plan",
  "communication-plan",
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
    return { tab: "overview", campaignStep: null };
  }

  const campaignStep = campaignStepFromHash(`#${raw}`);
  if (campaignStep) {
    return { tab: "overview", campaignStep: null };
  }

  return { tab: "overview", campaignStep: null };
}

function resolvePlaybookTabFromHash(
  visibleTabs: { id: EventPlaybookTab; label: string }[],
  defaultTab: EventPlaybookTab,
): EventPlaybookTab {
  const parsed = parseLocationHash();
  return visibleTabs.some((entry) => entry.id === parsed.tab)
    ? parsed.tab
    : defaultTab;
}

function resolveCampaignStepFromHash(
  initialCampaignStep: CampaignWorkflowStep,
): CampaignWorkflowStep {
  const parsed = parseLocationHash();
  return parsed.campaignStep ?? initialCampaignStep;
}

function usePlaybookTabFromHash(
  visibleTabs: { id: EventPlaybookTab; label: string }[],
  defaultTab: EventPlaybookTab,
): EventPlaybookTab {
  return useSyncExternalStore(
    subscribeToLocationHash,
    () => resolvePlaybookTabFromHash(visibleTabs, defaultTab),
    () => defaultTab,
  );
}

function useCampaignStepFromHash(
  initialCampaignStep: CampaignWorkflowStep,
): CampaignWorkflowStep {
  return useSyncExternalStore(
    subscribeToLocationHash,
    () => resolveCampaignStepFromHash(initialCampaignStep),
    () => initialCampaignStep,
  );
}

interface EventPlaybookTabsProps {
  overview: (navigateToTab: (
    tab: EventPlaybookTab,
    step?: CampaignWorkflowStep,
  ) => void) => React.ReactNode;
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
  const visibleTabs = ALL_TABS;

  const activeTab = usePlaybookTabFromHash(visibleTabs, defaultTab);
  const campaignStep = useCampaignStepFromHash(initialCampaignStep);

  const navigateToTab = useCallback(
    (tab: EventPlaybookTab, step?: CampaignWorkflowStep) => {
      void step;
      const resolvedTab = visibleTabs.some((entry) => entry.id === tab)
        ? tab
        : defaultTab;

      if (resolvedTab === "social-media" && hasCampaign) {
        window.location.href = `/events/${window.location.pathname.split("/").pop()}/campaign-builder#inspiration`;
        return;
      }

      window.history.replaceState(null, "", `#${resolvedTab}`);
    },
    [defaultTab, hasCampaign, visibleTabs],
  );

  useEffect(() => {
    onCampaignStepChange?.(campaignStep);
  }, [campaignStep, onCampaignStepChange]);

  function selectTab(tab: EventPlaybookTab) {
    navigateToTab(tab);
  }

  const panels: Record<EventPlaybookTab, React.ReactNode> = {
    overview: overview(navigateToTab),
    tasks,
    notes,
    files,
    "social-media": socialMedia,
    "ai-insights": aiInsights,
    settings,
  };

  const showPlanningDashboard = activeTab === "overview";
  const isFullBleedView = showPlanningDashboard;

  return (
    <div className={cn(!isFullBleedView && "border border-cos-border bg-cos-card shadow-sm")}>
      {!isFullBleedView && (
        <div
          className="sticky-dashboard-subnav border-b border-cos-border px-4 pt-4 lg:px-6"
          role="navigation"
          aria-label="Planning hub sections"
        >
          <Link
            href="#overview"
            onClick={(event) => {
              event.preventDefault();
              navigateToTab("overview");
            }}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#d97706] hover:text-[#b45309]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Back to Planning Hub
          </Link>

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
      )}

      <div
        className={cn(
          isFullBleedView ? "-mt-8 pt-0 lg:-mt-10" : "bg-cos-bg p-6 lg:p-8",
        )}
      >
        {visibleTabs.map((tab) =>
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
        )}
      </div>
    </div>
  );
}

export { type CampaignWorkflowStep };
