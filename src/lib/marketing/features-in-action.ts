/**
 * Public Features page (“See Hey Ralli in Action”) — copy + demo registry ids.
 * All stories use Motion Engine demos; copy matches shipped product behavior.
 */

export type FeaturesInActionStoryId =
  | "create-with-ai"
  | "plan-your-year"
  | "approvals"
  | "volunteer-intelligence"
  | "communications-hub"
  | "ask-ralli";

export interface FeaturesInActionStory {
  id: FeaturesInActionStoryId;
  /** Registry id in MARKETING_DEMO_REGISTRY */
  demoId: string;
  eyebrow: string;
  heading: string;
  body: string;
  benefits: string[];
}

export const FEATURES_IN_ACTION_HERO = {
  eyebrow: "See Hey Ralli in Action",
  title: "One event. Every message, task, and detail in one place.",
  description:
    "Hey Ralli helps school and community teams plan the year, create event campaigns, move approvals, see volunteer gaps, answer Meta messages, and know what to do next.",
  primaryCta: "Get Started",
  secondaryCta: "Explore the Workflow",
  workflowAnchor: "create-with-ai",
} as const;

export const FEATURES_IN_ACTION_STORIES: FeaturesInActionStory[] = [
  {
    id: "create-with-ai",
    demoId: "create-ai",
    eyebrow: "Create with AI",
    heading: "Turn one event into a complete campaign.",
    body: "Start from the event your team already entered. Hey Ralli drafts coordinated artwork, captions, and communication milestones so the campaign is ready to send for approval.",
    benefits: [
      "Build artwork and messaging from one event workspace",
      "Keep captions and milestone timing aligned to the event",
      "Send the campaign for review when artwork and captions are ready",
    ],
  },
  {
    id: "plan-your-year",
    demoId: "plan-your-year",
    eyebrow: "Plan Your Year",
    heading: "See the school year on one calendar.",
    body: "Bring events, Meta post schedules, and deadlines into month, week, and agenda views. Import from Google Calendar, ICS, or a file, review duplicates, then open an event for the next communication.",
    benefits: [
      "Organize events and scheduled posts in one place",
      "Import and review calendars before the year gets busy",
      "Use posting-time guidance when Meta is connected",
    ],
  },
  {
    id: "approvals",
    demoId: "approvals",
    eyebrow: "Approvals",
    heading: "Keep reviews moving without chasing people.",
    body: "The Approvals hub shows what is assigned to you, waiting in queue, scheduled, or already published. Approve or request changes while every item stays connected to its event.",
    benefits: [
      "Filter Assigned to Me, Changes Requested, In Queue, and more",
      "Approve or request changes with comments in one place",
      "Resubmit after edits without rebuilding the whole campaign",
    ],
  },
  {
    id: "volunteer-intelligence",
    demoId: "volunteer-intelligence",
    eyebrow: "Volunteer Intelligence",
    heading: "Know what is filled—and what still needs help.",
    body: "Volunteer Master turns SignUpGenius signup data into fill rate, underfilled roles, and upcoming events—without exposing volunteer personal details on the org view.",
    benefits: [
      "Monitor overall fill rate and underfilled roles",
      "See which events still need people this week",
      "Confirm SignUpGenius data on each event’s Volunteers tab",
    ],
  },
  {
    id: "communications-hub",
    demoId: "communications-hub",
    eyebrow: "Communications Hub",
    heading: "Answer Facebook and Instagram in one inbox.",
    body: "Communications Hub brings Meta DMs, comments, and mentions together. Draft a reply with Inbox AI, approve it, then send—while queues keep Unread, Follow up, and Done organized.",
    benefits: [
      "Work Unread, Follow up, Done, and Deleted queues",
      "Reply to Messenger, Instagram, comments, and tags",
      "Approve AI drafts before anything posts to Meta",
    ],
  },
  {
    id: "ask-ralli",
    demoId: "ask-ralli",
    eyebrow: "Ask Ralli",
    heading: "Always know what to do next.",
    body: "Ask Ralli is the Hey Ralli Assistant pinned in your workspace. Ask about events, approvals, volunteers, or communications and get a plain-language next step with links into the right screen.",
    benefits: [
      "Get answers from information already in your workspace",
      "Jump to Approvals, Volunteers, Insights, or Create with AI",
      "Ask how-to questions when you need a quick product tip",
    ],
  },
];

/** @deprecated Use FEATURES_IN_ACTION_STORIES[0] */
export const FEATURES_CREATE_WITH_AI_STORY = FEATURES_IN_ACTION_STORIES[0];

export const FEATURES_IN_ACTION_FINAL_CTA = {
  eyebrow: "Ready when you are",
  title: "Plan the event. Hey Ralli helps with everything around it.",
  body: "Give your team one place to organize the year, create the campaign, move approvals, and keep every event moving forward.",
  cta: "Get Started",
} as const;
