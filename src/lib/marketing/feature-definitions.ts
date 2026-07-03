import {
  CalendarRange,
  Flame,
  ImageIcon,
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  Send,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FeaturePreviewSlug, FeatureVideoSlug } from "@/lib/marketing/feature-preview-fixtures";
import { FEATURE_VIDEO_SLUGS } from "@/lib/marketing/feature-preview-fixtures";

export type FeatureMediaMode = "live" | "video";

export interface FeatureDefinition {
  id: FeaturePreviewSlug;
  icon: LucideIcon;
  /** Short label for carousel nav pills */
  navLabel: string;
  title: string;
  summary: string;
  highlights: string[];
  details: string[];
  media?: FeatureMediaMode;
}

function withMedia(
  feature: Omit<FeatureDefinition, "media">,
): FeatureDefinition {
  const usesVideo = FEATURE_VIDEO_SLUGS.includes(feature.id as FeatureVideoSlug);
  return usesVideo ? { ...feature, media: "video" } : { ...feature, media: "live" };
}

export const MARKETING_FEATURES: FeatureDefinition[] = [
  withMedia({
    id: "dashboard",
    icon: LayoutDashboard,
    navLabel: "Today",
    title: "Start your day on Today",
    summary:
      "Open CampaignOS and know exactly what deserves your attention — Next Up, pulse snapshots, and your week at a glance.",
    highlights: ["Next Up", "Pulse snapshots", "Week at a glance"],
    details: [
      "Next Up highlights the one thing to focus on right now",
      "Quick snapshots for approvals and recently published posts",
      "Weather and your week on the side — context, not clutter",
    ],
  }),
  withMedia({
    id: "workflow",
    icon: Megaphone,
    navLabel: "Campaigns",
    title: "Campaigns at a glance",
    summary:
      "Every full campaign and reminder plan in one grid — thumbnails, chairs, and one click to the planning hub.",
    highlights: ["Campaign cards", "Full vs reminders", "Open planning hub"],
    details: [
      "Browse campaigns grouped by month with artwork thumbnails",
      "See Full campaign vs Reminders only at a glance",
      "Jump straight into the planning hub from any card",
    ],
  }),
  withMedia({
    id: "planning-hub",
    icon: LayoutGrid,
    navLabel: "Planning hub",
    title: "Event planning hub",
    summary:
      "Drill into one event — overview, tasks, files, and social in one place.",
    highlights: ["Event overview", "Planning checklist", "Quick links"],
    details: [
      "See date, budget, attendance, and committee at a glance",
      "Track planning tasks with progress toward event day",
      "Jump to artwork, schedule, or settings from quick links",
    ],
  }),
  withMedia({
    id: "calendar",
    icon: CalendarRange,
    navLabel: "Calendar",
    title: "One calendar for the whole school year",
    summary:
      "Events, post deadlines, and reminders — layered on a month view dense enough to scan at a glance.",
    highlights: ["Month view", "Meta post chips", "Layer toggles"],
    details: [
      "Import your school calendar once during setup",
      "Toggle layers: campaigns, drafts, scheduled posts, events",
      "Hover any day to see what's coming up",
    ],
  }),
  withMedia({
    id: "heatmap",
    icon: Flame,
    navLabel: "Heatmap",
    title: "Posting-time heatmap",
    summary:
      "See when parents actually engage — schedule posts in the green zones, not guesswork.",
    highlights: ["Engagement heatmap", "Preferred windows", "History blended"],
    details: [
      "Week view tints each hour by engagement score",
      "Blend your preferred times with published-post history",
      "Drag posts onto high-score slots in one motion",
    ],
  }),
  withMedia({
    id: "artwork",
    icon: ImageIcon,
    navLabel: "Artwork",
    title: "Artwork studio for every milestone",
    summary:
      "Create feed and story graphics in one flow — no Canva juggling unless you want it.",
    highlights: ["Feed + story pairs", "Brand-aware AI", "Canva import"],
    details: [
      "One creation flow per milestone (1:1 feed + 9:16 story)",
      "AI-assisted prompts using your school brand",
      "Import from Canva when you're already there",
    ],
  }),
  withMedia({
    id: "approvals",
    icon: Users,
    navLabel: "Approvals",
    title: "Team roster & approvals",
    summary:
      "Upload your board structure once. Route captions and posts to the right person.",
    highlights: ["Excel roster import", "Committee slots", "One-click sign-off"],
    details: [
      "Import VP and committee roster from Excel",
      "Assign approval roles per event",
      "Track what's waiting on you vs. your team",
    ],
  }),
  withMedia({
    id: "publish",
    icon: Send,
    navLabel: "Publish",
    title: "Publish to Facebook & Instagram",
    summary:
      "Schedule Meta posts from the same place you planned them — feed and story together.",
    highlights: ["Meta scheduling", "Queue + history", "Feed & story"],
    details: [
      "Draft and approve captions per milestone",
      "Schedule all ready posts in one click",
      "See published history without leaving the workspace",
    ],
  }),
];
