"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { CalendarPublishingTab } from "@/components/calendar-command-center/CalendarPublishingTab";
import { CommunicationsCalendar } from "@/components/communications-calendar/CommunicationsCalendar";
import { PlanningCalendarShell } from "@/components/communications-planning-calendar/PlanningCalendarShell";
import { Button } from "@/components/ui/Button";
import {
  CALENDAR_COMMAND_TABS,
  calendarTabHref,
  parseCalendarTab,
  type CalendarCommandTab,
} from "@/lib/calendar/command-center";
import { cn } from "@/lib/utils/cn";
import type {
  CommunicationsCalendarData,
  PlanningCalendarData,
} from "@/types/communications-calendar";

interface CalendarCommandCenterProps {
  planningData: PlanningCalendarData;
  eventsData: CommunicationsCalendarData;
  initialTab: CalendarCommandTab;
}

export function CalendarCommandCenter({
  planningData,
  eventsData,
  initialTab,
}: CalendarCommandCenterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseCalendarTab(searchParams.get("tab") ?? initialTab);
  const activeMeta = CALENDAR_COMMAND_TABS.find((tab) => tab.id === activeTab)!;

  function setTab(tab: CalendarCommandTab) {
    router.replace(calendarTabHref(tab), { scroll: false });
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <header className="rounded-2xl border border-cos-border bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cos-primary text-white">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-cos-text">Calendar</h1>
            <p className="mt-1 text-sm text-cos-muted">{activeMeta.description}</p>
          </div>
        </div>

        <nav
          className="mt-5 flex flex-wrap gap-2 border-t border-cos-border pt-4"
          aria-label="Calendar sections"
        >
          {CALENDAR_COMMAND_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-cos-primary text-white shadow-sm"
                  : "bg-cos-bg text-cos-muted ring-1 ring-slate-200 hover:bg-white hover:text-cos-text",
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === "planning" && <PlanningCalendarShell data={planningData} />}
      {activeTab === "events" && (
        <CommunicationsCalendar data={eventsData} fixedMode="events" embedded />
      )}
      {activeTab === "review" && (
        <div className="rounded-2xl border border-cos-border bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-cos-text">Review imported calendar</p>
          <p className="mt-2 text-sm text-cos-muted">
            Upload, chat-fix dates, and import view-only events from the review
            screen.
          </p>
          <Button href="/calendar/review" className="mt-4">
            Open calendar review
          </Button>
        </div>
      )}
      {activeTab === "publishing" && (
        <CalendarPublishingTab items={planningData.items} />
      )}
    </div>
  );
}
