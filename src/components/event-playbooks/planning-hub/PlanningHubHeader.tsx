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
import { PlanningHubCard } from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import { cn } from "@/lib/utils/cn";

const QUICK_ACTIONS = [
  {
    id: "create-post",
    title: "Create Post",
    subtext: "Social Media",
    icon: MessageSquare,
    iconBg: "bg-[#fce8e4]",
    iconColor: "text-[#e87461]",
    tab: "social-media" as EventPlaybookTab,
    step: "plan" as CampaignWorkflowStep,
  },
  {
    id: "add-task",
    title: "Add Task",
    subtext: "To-do list",
    icon: CheckSquare,
    iconBg: "bg-[#e4f2e8]",
    iconColor: "text-[#5a9e6f]",
    tab: "tasks" as EventPlaybookTab,
  },
  {
    id: "upload-file",
    title: "Upload File",
    subtext: "Docs & Media",
    icon: Upload,
    iconBg: "bg-[#e4edf8]",
    iconColor: "text-[#5b8fc7]",
    tab: "files" as EventPlaybookTab,
  },
  {
    id: "invite-volunteer",
    title: "Invite Volunteer",
    subtext: "Get help",
    icon: UserPlus,
    iconBg: "bg-[#f8ece0]",
    iconColor: "text-[#e8944a]",
    tab: "settings" as EventPlaybookTab,
  },
  {
    id: "view-calendar",
    title: "View Calendar",
    subtext: "See what's next",
    icon: CalendarDays,
    iconBg: "bg-[#ece4f5]",
    iconColor: "text-[#8b6fbf]",
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
        <h1 className="font-display text-3xl leading-tight text-[#2a2622] sm:text-4xl">
          {greeting}, {name}! 👋
        </h1>
        <p className="mt-1.5 text-base text-[#7a7268]">
          Let&apos;s bring your campaign to life today.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  action.iconBg,
                )}
              >
                <Icon className={cn("h-4 w-4", action.iconColor)} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-semibold text-[#2a2622]">
                  {action.title}
                </span>
                <span className="block text-xs text-[#a89f94]">{action.subtext}</span>
              </span>
            </>
          );

          if ("href" in action && action.href) {
            return (
              <PlanningHubCard key={action.id} className="p-0">
                <a
                  href={action.href}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#faf7f2]"
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
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#faf7f2]"
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
