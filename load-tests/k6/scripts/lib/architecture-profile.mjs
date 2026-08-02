/**
 * Config + content generators for the `100-school-architecture` seed profile.
 *
 * This profile is deliberately separate from the 20-school k6 load-test
 * fixture (lib/schools.mjs ROLE_BLUEPRINT / accounts.local.json) so that the
 * already-validated 15/30/50-VU k6 suite is never touched by this larger,
 * one-off structural/architecture-validation dataset.
 */

export const PROFILE_KEY = "100-school-architecture";

export const ARCHITECTURE_CONFIG = {
  schoolCount: 100,
  schoolNamePad: 3, // "Load Test School 001" … "100"
  eventsPerSchool: 25,
  milestonesPerEvent: 5, // approval_scheduling_items rows (unified approvals+scheduling queue)
  communicationItemsPerEvent: 1,
  eventAssetsPerEvent: 1,
  playbookStepsPerOrg: 5,
  inboxThreadsPerOrg: 3,
  brandKitItemsPerOrg: 4,
  calendarImportsPerOrg: 1,
};

// role_kind check (migration 024): null | 'president' | 'vp' | 'other'
// campaign_role check (migration 059): admin | president | vp_communications |
//   committee_chair | contributor | view_only | developer | tester
export const ARCHITECTURE_ROLE_BLUEPRINT = [
  {
    key: "owner",
    campaignRole: "admin",
    orgRoleName: "Owner/Administrator",
    roleKind: "other",
    sortOrder: 10,
    label: "Owner",
  },
  {
    key: "president",
    campaignRole: "president",
    orgRoleName: "President",
    roleKind: "president",
    sortOrder: 20,
    label: "President",
  },
  {
    key: "vp_communications",
    campaignRole: "vp_communications",
    orgRoleName: "VP Communications",
    roleKind: "vp",
    sortOrder: 30,
    label: "VP Communications",
  },
  {
    key: "vp_events",
    campaignRole: "contributor",
    orgRoleName: "VP Events",
    roleKind: "vp",
    sortOrder: 40,
    label: "VP Events",
  },
  {
    key: "treasurer",
    campaignRole: "contributor",
    orgRoleName: "Treasurer",
    roleKind: "other",
    sortOrder: 50,
    label: "Treasurer",
  },
  {
    key: "committee_chair",
    campaignRole: "committee_chair",
    orgRoleName: "Committee Chair",
    roleKind: "other",
    sortOrder: 60,
    label: "Committee Chair",
  },
  {
    key: "volunteer",
    campaignRole: "contributor",
    orgRoleName: "Volunteer",
    roleKind: "other",
    sortOrder: 70,
    label: "Volunteer",
  },
  {
    key: "viewer",
    campaignRole: "view_only",
    orgRoleName: "Viewer",
    roleKind: "other",
    sortOrder: 90,
    label: "Viewer",
  },
];

// events.event_type check (migration 004): must be one of these (or null)
export const EVENT_TYPES = [
  "book_fair",
  "teacher_appreciation",
  "pto_meeting",
  "spirit_night",
  "fundraiser",
  "family_event",
  "volunteer_drive",
  "general_event",
];

// approval_scheduling_items.workflow_status check (048 + 20260727193323)
const MILESTONE_WORKFLOW_STATUSES = [
  "in_queue",
  "assigned_to_me",
  "scheduled",
  "posted",
  "published",
];

const MILESTONE_TITLES = [
  "Save the Date",
  "Volunteer Call",
  "Reminder Push",
  "Day-Of Coverage",
  "Recap & Thank You",
];

/** 5 milestone_name/workflow_status pairs for one event (deterministic). */
export function buildMilestonesForEvent(prefix, eventTitle, count) {
  return Array.from({ length: count }, (_, i) => ({
    milestone_name: `${prefix} ${MILESTONE_TITLES[i % MILESTONE_TITLES.length]}`,
    workflow_status:
      MILESTONE_WORKFLOW_STATUSES[i % MILESTONE_WORKFLOW_STATUSES.length],
    source: "campaign_builder",
    platforms: ["instagram", "facebook"],
    caption_text: `${prefix} Pre-generated caption for "${eventTitle}" — no OpenAI call`,
  }));
}

// communication_playbook_steps.channel / communication_items.channel check
// (migration 004 / 003): shared enum
const CHANNELS = [
  "newsletter",
  "facebook",
  "email",
  "instagram",
  "morning_announcements",
  "website_announcement",
];

/** Mirrors the built-in "General Event" system playbook's step shape. */
export const ARCHITECTURE_PLAYBOOK_STEPS = [
  { sort_order: 0, relative_day: -14, title: "14 Days Out", channel: "newsletter" },
  { sort_order: 1, relative_day: -7, title: "7 Days Out", channel: "facebook" },
  { sort_order: 2, relative_day: -1, title: "Day Before", channel: "email" },
  { sort_order: 3, relative_day: 0, title: "Day Of", channel: "morning_announcements" },
  { sort_order: 4, relative_day: 1, title: "Thank You", channel: "newsletter" },
];

// communication_items.status check (migration 012)
const COMMUNICATION_STATUSES = [
  "draft",
  "generated",
  "pending_approval",
  "approved",
  "published",
];

export function communicationItemForEvent(index) {
  return {
    channel: CHANNELS[index % CHANNELS.length],
    status: COMMUNICATION_STATUSES[index % COMMUNICATION_STATUSES.length],
    is_published: index % COMMUNICATION_STATUSES.length === 4,
  };
}

// inbox_threads.channel_type enum (042 + 043) / status check (042)
const INBOX_CHANNELS = ["instagram_dm", "facebook_message", "instagram_comment"];
const INBOX_STATUSES = ["pending", "approved", "archived"];

export function inboxThreadSpec(index) {
  return {
    channel_type: INBOX_CHANNELS[index % INBOX_CHANNELS.length],
    status: INBOX_STATUSES[index % INBOX_STATUSES.length],
  };
}

// organization_brand_kit_items.category check (migration 013)
export function brandKitItemSpecs(orgIndex) {
  const hue = (orgIndex * 37) % 360; // deterministic per-org accent hue
  return [
    {
      category: "school_logo",
      label: "School Logo (placeholder)",
      value_text: null,
      storage_path: `architecture-seed/org-${orgIndex}/school-logo-placeholder.png`,
    },
    {
      category: "color",
      label: "Primary Color",
      value_text: `hsl(${hue}, 65%, 45%)`,
      storage_path: null,
    },
    {
      category: "color",
      label: "Secondary Color",
      value_text: `hsl(${(hue + 120) % 360}, 55%, 55%)`,
      storage_path: null,
    },
    {
      category: "brand_voice",
      label: "Brand Voice Notes",
      value_text: "Warm, community-first, concise — synthetic seed data.",
      storage_path: null,
    },
  ];
}

// event_assets.asset_type check (migration 003/011)
export function eventAssetSpec() {
  return {
    asset_type: "hero_image",
    status: "placeholder",
    ai_generated: true,
    filename: null,
    storage_path: null,
  };
}

export function schoolYearLabel() {
  return "2025-2026";
}
