import {
  CalendarRange,
  Flame,
  ImageIcon,
  LayoutDashboard,
  Megaphone,
  Send,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FeaturePreviewSlug } from "@/lib/marketing/feature-preview-fixtures";

export interface FeatureDefinition {
  id: FeaturePreviewSlug;
  icon: LucideIcon;
  title: string;
  summary: string;
  highlights: string[];
  details: string[];
}

export const MARKETING_FEATURES: FeatureDefinition[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "A dashboard that feels like a friend",
    summary:
      "Open CampaignOS and know exactly what deserves your attention — without a wall of tasks.",
    highlights: ["Next Up", "Pulse snapshots", "Week at a glance"],
    details: [
      "Next Up highlights the one thing to focus on right now",
      "Quick snapshots for approvals and recently published posts",
      "Weather and your week on the side — context, not clutter",
    ],
  },
  {
    id: "workflow",
    icon: Megaphone,
    title: "Campaign workflow, step by step",
    summary:
      "Every event moves through a clear path: plan → artwork → schedule → publish.",
    highlights: ["Communication plan", "Meta milestones", "Review & publish"],
    details: [
      "Communication plan tailored to your event type",
      "Artwork and captions stay tied to each milestone",
      "Review & publish when your team is ready",
    ],
  },
  {
    id: "calendar",
    icon: CalendarRange,
    title: "One calendar for the whole school year",
    summary:
      "Events, post deadlines, and reminders — layered on a single view you can actually read.",
    highlights: ["Layer toggles", "Month + week views", "Drag to reschedule"],
    details: [
      "Import your school calendar once during setup",
      "Toggle layers: campaigns, drafts, scheduled posts, events",
      "Hover any day to see what's coming up",
    ],
  },
  {
    id: "heatmap",
    icon: Flame,
    title: "Posting-time heatmap",
    summary:
      "See when parents actually engage — schedule posts in the green zones, not guesswork.",
    highlights: ["Engagement heatmap", "Preferred windows", "History blended"],
    details: [
      "Week view tints each hour by engagement score",
      "Blend your preferred times with published-post history",
      "Drag posts onto high-score slots in one motion",
    ],
  },
  {
    id: "artwork",
    icon: ImageIcon,
    title: "Artwork studio for every milestone",
    summary:
      "Create feed and story graphics in one flow — no Canva juggling unless you want it.",
    highlights: ["Feed + story pairs", "Brand-aware AI", "Canva import"],
    details: [
      "One creation flow per milestone (1:1 feed + 9:16 story)",
      "AI-assisted prompts using your school brand",
      "Import from Canva when you're already there",
    ],
  },
  {
    id: "approvals",
    icon: Users,
    title: "Team roster & approvals",
    summary:
      "Upload your board structure once. Route captions and posts to the right person.",
    highlights: ["Excel roster import", "Committee slots", "One-click sign-off"],
    details: [
      "Import VP and committee roster from Excel",
      "Assign approval roles per event",
      "Track what's waiting on you vs. your team",
    ],
  },
  {
    id: "publish",
    icon: Send,
    title: "Publish to Facebook & Instagram",
    summary:
      "Schedule Meta posts from the same place you planned them — feed and story together.",
    highlights: ["Meta scheduling", "Queue + history", "Feed & story"],
    details: [
      "Draft and approve captions per milestone",
      "Schedule all ready posts in one click",
      "See published history without leaving the workspace",
    ],
  },
];
