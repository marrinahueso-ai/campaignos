import type { CommunicationStrategy } from "@/types/communication-strategy";
import type {
  CommitteeName,
  ResponsibilityType,
} from "@/types/organization-workspace";

export const SYSTEM_ORGANIZATION_ROLES: {
  name: string;
  description: string;
}[] = [
  {
    name: "President",
    description: "Final approvals and board messaging.",
  },
  {
    name: "VP Communications",
    description: "Overall communications strategy and timeline oversight.",
  },
  {
    name: "VP Events",
    description: "Event logistics and committee coordination.",
  },
  {
    name: "Creative Chair",
    description: "Flyers, graphics, and social visuals.",
  },
  {
    name: "Newsletter Editor",
    description: "Weekly or monthly newsletter content.",
  },
  {
    name: "Website Chair",
    description: "Website announcements and calendar updates.",
  },
  {
    name: "Volunteer Coordinator",
    description: "Volunteer posts and signup communications.",
  },
  {
    name: "Principal",
    description: "Morning announcements and staff-facing notes.",
  },
  {
    name: "Viewer",
    description: "Read-only visibility — no ownership defaults.",
  },
];

export const RESPONSIBILITY_TYPES: {
  value: ResponsibilityType;
  label: string;
}[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "newsletter", label: "Newsletter" },
  { value: "website", label: "Website" },
  { value: "morning_announcements", label: "Morning Announcements" },
  { value: "artwork", label: "Artwork" },
  { value: "volunteer_communications", label: "Volunteer Communications" },
  { value: "publishing", label: "Publishing" },
  { value: "approvals", label: "Approvals" },
];

export const RESPONSIBILITY_LABELS: Record<ResponsibilityType, string> =
  Object.fromEntries(
    RESPONSIBILITY_TYPES.map(({ value, label }) => [value, label]),
  ) as Record<ResponsibilityType, string>;

export const COMMITTEE_DEFAULTS: {
  value: CommitteeName;
  label: string;
  defaultStrategy: CommunicationStrategy;
  defaultPlaybookSlug: string;
}[] = [
  {
    value: "book_fair",
    label: "Book Fair",
    defaultStrategy: "full_campaign",
    defaultPlaybookSlug: "book-fair",
  },
  {
    value: "teacher_appreciation",
    label: "Teacher Appreciation",
    defaultStrategy: "full_campaign",
    defaultPlaybookSlug: "teacher-appreciation",
  },
  {
    value: "spirit_wear",
    label: "Spirit Wear",
    defaultStrategy: "full_campaign",
    defaultPlaybookSlug: "spirit-night",
  },
  {
    value: "hospitality",
    label: "Hospitality",
    defaultStrategy: "reminder_only",
    defaultPlaybookSlug: "general-event",
  },
  {
    value: "fundraising",
    label: "Fundraising",
    defaultStrategy: "full_campaign",
    defaultPlaybookSlug: "fundraiser",
  },
  {
    value: "general_pto_meeting",
    label: "General PTO Meeting",
    defaultStrategy: "reminder_only",
    defaultPlaybookSlug: "pto-meeting",
  },
  {
    value: "family_event",
    label: "Family Event",
    defaultStrategy: "full_campaign",
    defaultPlaybookSlug: "family-event",
  },
  {
    value: "volunteer_recruitment",
    label: "Volunteer Recruitment",
    defaultStrategy: "reminder_only",
    defaultPlaybookSlug: "volunteer-drive",
  },
];

export const COMMITTEE_LABELS: Record<CommitteeName, string> =
  Object.fromEntries(
    COMMITTEE_DEFAULTS.map(({ value, label }) => [value, label]),
  ) as Record<CommitteeName, string>;

export const PLAYBOOK_SLUG_OPTIONS: { value: string; label: string }[] = [
  { value: "book-fair", label: "Book Fair" },
  { value: "teacher-appreciation", label: "Teacher Appreciation" },
  { value: "pto-meeting", label: "PTO Meeting" },
  { value: "spirit-night", label: "Spirit Night" },
  { value: "fundraiser", label: "Fundraiser" },
  { value: "family-event", label: "Family Event" },
  { value: "volunteer-drive", label: "Volunteer Drive" },
  { value: "general-event", label: "General Event" },
];

/** Maps event_type values to committee_defaults.committee_name keys. */
export const EVENT_TYPE_TO_COMMITTEE: Partial<
  Record<string, CommitteeName>
> = {
  book_fair: "book_fair",
  teacher_appreciation: "teacher_appreciation",
  spirit_night: "spirit_wear",
  fundraiser: "fundraising",
  pto_meeting: "general_pto_meeting",
  family_event: "family_event",
  volunteer_drive: "volunteer_recruitment",
};

/** Default role name per responsibility when seeding a new organization. */
export const DEFAULT_RESPONSIBILITY_ROLE_NAMES: Record<
  ResponsibilityType,
  string
> = {
  facebook: "VP Communications",
  instagram: "VP Communications",
  newsletter: "VP Communications",
  website: "VP Communications",
  morning_announcements: "VP Communications",
  artwork: "VP Communications",
  volunteer_communications: "VP Staff Support/Hospitality",
  publishing: "VP Communications",
  approvals: "President",
};

/** Default role name per committee when seeding a new organization. */
export const DEFAULT_COMMITTEE_ROLE_NAMES: Record<CommitteeName, string> = {
  book_fair: "VP Events",
  teacher_appreciation: "VP Staff Support/Hospitality",
  spirit_wear: "VP Events",
  hospitality: "VP Staff Support/Hospitality",
  fundraising: "VP Fundraising",
  general_pto_meeting: "President",
  family_event: "VP Events",
  volunteer_recruitment: "VP Staff Support/Hospitality",
};

/** Responsibilities shown read-only in Event Workspace. */
export const EVENT_WORKSPACE_DEFAULT_RESPONSIBILITIES: ResponsibilityType[] = [
  "artwork",
  "approvals",
  "publishing",
];
