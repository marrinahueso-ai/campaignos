export type CalendarCommandTab = "planning" | "events" | "review" | "publishing";

export const CALENDAR_COMMAND_TABS: {
  id: CalendarCommandTab;
  label: string;
  description: string;
}[] = [
  {
    id: "planning",
    label: "What's due",
    description: "Posts, reminders, and deadlines coming up across your events.",
  },
  {
    id: "events",
    label: "Events",
    description: "School and PTO events on your calendar.",
  },
  {
    id: "review",
    label: "Review imports",
    description: "Clean up your uploaded school calendar before adding events.",
  },
  {
    id: "publishing",
    label: "Publishing",
    description: "Drafts, scheduled posts, and content ready to go live.",
  },
];

export const DEFAULT_CALENDAR_TAB: CalendarCommandTab = "planning";

export function parseCalendarTab(value: string | undefined): CalendarCommandTab {
  const match = CALENDAR_COMMAND_TABS.find((tab) => tab.id === value);
  return match?.id ?? DEFAULT_CALENDAR_TAB;
}

export function calendarTabHref(tab: CalendarCommandTab): string {
  if (tab === DEFAULT_CALENDAR_TAB) return "/calendar";
  return `/calendar?tab=${tab}`;
}
