"use client";

import {
  CalendarDays,
  CheckSquare,
  MessageSquare,
  Upload,
  UserPlus,
} from "lucide-react";
import { getTimeOfDayGreeting } from "@/lib/weather/greeting";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import {
  PH,
  PlanningHubCard,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import { cn } from "@/lib/utils/cn";

const QUICK_ACTIONS = [
  {
    id: "create-post",
    title: "Create Post",
    subtext: "Social Media",
    icon: MessageSquare,
    iconBg: "#FCE8E4",
    iconColor: "#E87461",
    tab: "social-media" as EventPlaybookTab,
    step: "plan" as CampaignWorkflowStep,
  },
  {
    id: "add-task",
    title: "Add Task",
    subtext: "To-do list",
    icon: CheckSquare,
    iconBg: "#E4F2E8",
    iconColor: "#5A9E6F",
    tab: "tasks" as EventPlaybookTab,
  },
  {
    id: "upload-file",
    title: "Upload File",
    subtext: "Docs & Media",
    icon: Upload,
    iconBg: "#E4EDF8",
    iconColor: "#5B8FC7",
    tab: "files" as EventPlaybookTab,
  },
  {
    id: "invite-volunteer",
    title: "Invite Volunteer",
    subtext: "Get help",
    icon: UserPlus,
    iconBg: "#F8ECE0",
    iconColor: "#E8944A",
    tab: "settings" as EventPlaybookTab,
  },
  {
    id: "view-calendar",
    title: "View Calendar",
    subtext: "See what's next",
    icon: CalendarDays,
    iconBg: "#ECE4F5",
    iconColor: "#8B6FBF",
    href: "/calendar",
  },
] as const;

interface PlanningHubHeaderProps {
  greetingName: string;
  timezone?: string;
  onNavigateTab: (tab: EventPlaybookTab, step?: CampaignWorkflowStep) => void;
}

export function PlanningHubHeader({
  greetingName,
  timezone,
  onNavigateTab,
}: PlanningHubHeaderProps) {
  const greeting = getTimeOfDayGreeting(new Date(), timezone);
  const name = greetingName.trim() || "there";

  return (
    <div className="space-y-5">
      <div>
        <h1
          className="font-display text-[2rem] leading-tight sm:text-[2.25rem]"
          style={{ color: PH.textPrimary }}
        >
          {greeting}, {name}! 👋
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: PH.textSecondary }}>
          Let&apos;s bring your campaign to life today.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: action.iconBg }}
              >
                <Icon
                  className="h-[18px] w-[18px]"
                  style={{ color: action.iconColor }}
                  strokeWidth={1.75}
                />
              </span>
              <span className="min-w-0 text-left">
                <span
                  className="block text-sm font-semibold"
                  style={{ color: PH.textPrimary }}
                >
                  {action.title}
                </span>
                <span className="block text-xs" style={{ color: PH.textMuted }}>
                  {action.subtext}
                </span>
              </span>
            </>
          );

          if ("href" in action && action.href) {
            return (
              <PlanningHubCard key={action.id} className="p-0">
                <a
                  href={action.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#FAF7F2]",
                  )}
                >
                  {content}
                </a>
              </PlanningHubCard>
            );
          }

          return (
            <PlanningHubCard key={action.id} className="p-0">
              <button
                type="button"
                onClick={() => {
                  if ("tab" in action) {
                    onNavigateTab(
                      action.tab,
                      "step" in action ? action.step : undefined,
                    );
                  }
                }}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#FAF7F2]"
              >
                {content}
              </button>
            </PlanningHubCard>
          );
        })}
      </div>
    </div>
  );
}
