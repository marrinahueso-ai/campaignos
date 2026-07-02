import type { EventType } from "@/types/playbooks";

export const EVENT_TYPES: {
  value: EventType;
  label: string;
}[] = [
  { value: "book_fair", label: "Book Fair" },
  { value: "teacher_appreciation", label: "Teacher / Volunteer Appreciation" },
  { value: "early_release", label: "Early Release Day" },
  { value: "pto_meeting", label: "PTO Meeting" },
  { value: "spirit_night", label: "Spirit Night" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "family_event", label: "Family Event" },
  { value: "volunteer_drive", label: "Volunteer Drive" },
  { value: "holiday", label: "Holiday / No School" },
  { value: "general_event", label: "General Event" },
];

export const EVENT_TYPE_LABELS: Record<EventType, string> = Object.fromEntries(
  EVENT_TYPES.map(({ value, label }) => [value, label]),
) as Record<EventType, string>;

export const DEFAULT_EVENT_TYPE: EventType = "general_event";

export const SYSTEM_PLAYBOOK_IDS: Record<EventType, string> = {
  book_fair: "a1000001-0000-4000-8000-000000000001",
  teacher_appreciation: "a1000001-0000-4000-8000-000000000002",
  pto_meeting: "a1000001-0000-4000-8000-000000000003",
  spirit_night: "a1000001-0000-4000-8000-000000000004",
  fundraiser: "a1000001-0000-4000-8000-000000000005",
  family_event: "a1000001-0000-4000-8000-000000000006",
  volunteer_drive: "a1000001-0000-4000-8000-000000000007",
  general_event: "a1000001-0000-4000-8000-000000000008",
  early_release: "a1000001-0000-4000-8000-000000000008",
  holiday: "a1000001-0000-4000-8000-000000000009",
};

export const CHANNEL_LABELS: Record<string, string> = {
  website_announcement: "Website Announcement",
  newsletter: "Newsletter",
  facebook: "Facebook",
  instagram: "Instagram",
  email: "Email",
  flyer: "Flyer",
  principal_notes: "Principal Notes",
  morning_announcements: "Morning Announcements",
  volunteer_signup: "Volunteer Signup",
};

export const STEP_DEFAULT_STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
] as const;

export function formatRelativeDay(relativeDay: number): string {
  if (relativeDay === 0) return "Day Of";
  if (relativeDay === 1) return "Thank You (+1 day)";
  if (relativeDay === -1) return "Day Before";
  if (relativeDay < 0) return `${Math.abs(relativeDay)} Days Out`;
  return `+${relativeDay} Days After`;
}

export function slugifyPlaybookName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}
