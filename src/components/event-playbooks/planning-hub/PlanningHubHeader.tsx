"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  MessageSquare,
  Upload,
  UserPlus,
} from "lucide-react";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import {
  PH,
  PlanningHubCard,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

const QUICK_ACTIONS = [
  {
    id: "create-post",
    title: "Create Post",
    subtext: "Social Media",
    icon: MessageSquare,
    iconBg: PH.iconTints.coral.bg,
    iconColor: PH.iconTints.coral.color,
    tab: "social-media" as EventPlaybookTab,
    step: "plan" as CampaignWorkflowStep,
  },
  {
    id: "add-task",
    title: "Add Task",
    subtext: "To-do list",
    icon: CheckSquare,
    iconBg: PH.iconTints.green.bg,
    iconColor: PH.iconTints.green.color,
    tab: "tasks" as EventPlaybookTab,
  },
  {
    id: "upload-file",
    title: "Upload File",
    subtext: "Docs & Media",
    icon: Upload,
    iconBg: PH.iconTints.blue.bg,
    iconColor: PH.iconTints.blue.color,
    tab: "files" as EventPlaybookTab,
  },
  {
    id: "invite-volunteer",
    title: "Invite Volunteer",
    subtext: "Get help",
    icon: UserPlus,
    iconBg: PH.iconTints.orange.bg,
    iconColor: PH.iconTints.orange.color,
    tab: "settings" as EventPlaybookTab,
  },
  {
    id: "view-calendar",
    title: "View Calendar",
    subtext: "See what's next",
    icon: CalendarDays,
    iconBg: PH.iconTints.purple.bg,
    iconColor: PH.iconTints.purple.color,
    href: "/calendar",
  },
] as const;

interface PlanningHubHeaderProps {
  event: Event;
  campaignEvents: Event[];
  onNavigateTab: (tab: EventPlaybookTab, step?: CampaignWorkflowStep) => void;
}

export function PlanningHubHeader({
  event,
  campaignEvents,
  onNavigateTab,
}: PlanningHubHeaderProps) {
  const router = useRouter();
  const [campaignOpen, setCampaignOpen] = useState(false);
  const campaignRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (campaignRef.current && !campaignRef.current.contains(event.target as Node)) {
        setCampaignOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const eventsForDropdown =
    campaignEvents.length > 0
      ? campaignEvents
      : [event];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-0" ref={campaignRef}>
          <button
            type="button"
            onClick={() => setCampaignOpen((open) => !open)}
            className="font-display inline-flex max-w-full items-center gap-2 text-left text-[2rem] leading-tight text-cos-text sm:text-[2.25rem]"
            aria-expanded={campaignOpen}
            aria-haspopup="listbox"
          >
            <span className="truncate">{event.title}</span>
            <ChevronDown
              className="h-5 w-5 shrink-0 text-cos-dark-muted sm:h-6 sm:w-6"
              strokeWidth={1.5}
            />
          </button>

          {campaignOpen && (
            <ul
              role="listbox"
              className="absolute left-0 top-[calc(100%+0.35rem)] z-30 max-h-64 w-72 overflow-y-auto rounded-[12px] border border-cos-border bg-cos-card py-1 shadow-lg"
            >
              {eventsForDropdown.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={entry.id === event.id}
                    className={cn(
                      "block w-full px-3 py-2 text-left text-sm text-cos-text transition-colors hover:bg-cos-bg",
                      entry.id === event.id && "bg-cos-bg font-medium",
                    )}
                    onClick={() => {
                      setCampaignOpen(false);
                      if (entry.id !== event.id) {
                        router.push(`/events/${entry.id}`);
                      }
                    }}
                  >
                    {entry.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <span className="inline-flex shrink-0 items-center rounded-full bg-cos-warning px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-cos-warning-text">
          Planning Hub
        </span>
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
                <span className="block text-sm font-semibold text-cos-text">
                  {action.title}
                </span>
                <span className="block text-xs text-cos-dark-muted">{action.subtext}</span>
              </span>
            </>
          );

          if ("href" in action && action.href) {
            return (
              <PlanningHubCard key={action.id} className="p-0">
                <a
                  href={action.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-cos-bg",
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
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-cos-bg"
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
