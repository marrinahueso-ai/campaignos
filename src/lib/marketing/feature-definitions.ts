import {
  CalendarRange,
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
  details: string[];
}

export const MARKETING_FEATURES: FeatureDefinition[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "A dashboard that feels like a friend",
    summary:
      "Open CampaignOS and know exactly what deserves your attention — without a wall of tasks.",
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
    details: [
      "Import your school calendar once during setup",
      "Toggle layers: campaigns, drafts, scheduled posts, events",
      "Hover any day to see what's coming up",
    ],
  },
  {
    id: "artwork",
    icon: ImageIcon,
    title: "Artwork studio for every milestone",
    summary:
      "Create feed and story graphics in one flow — no Canva juggling unless you want it.",
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
    details: [
      "Draft and approve captions per milestone",
      "Schedule all ready posts in one click",
      "See published history without leaving the workspace",
    ],
  },
];
