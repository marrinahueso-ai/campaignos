/**
 * Public Features page (“See Hey Ralli in Action”) section copy and static previews.
 * Create with AI uses the Motion Engine demo; other stories use local product screenshots.
 */

export type FeaturesInActionStaticSectionId =
  | "plan-your-year"
  | "approvals"
  | "volunteer-intelligence"
  | "communications-hub"
  | "ask-ralli";

export interface FeaturesInActionBenefit {
  text: string;
}

export interface FeaturesInActionStaticSection {
  id: FeaturesInActionStaticSectionId;
  eyebrow: string;
  heading: string;
  body: string;
  benefits: string[];
  /** Local static product screenshot under /public */
  imageSrc: string;
  imageAlt: string;
}

export const FEATURES_IN_ACTION_HERO = {
  eyebrow: "See Hey Ralli in Action",
  title: "One event. Every message, task, and detail in one place.",
  description:
    "Hey Ralli helps your team plan events, create communications, manage approvals, understand volunteer needs, and know what to do next.",
  primaryCta: "Get Started",
  secondaryCta: "Explore the Workflow",
  workflowAnchor: "create-with-ai",
} as const;

export const FEATURES_CREATE_WITH_AI_STORY = {
  id: "create-with-ai",
  eyebrow: "Create with AI",
  heading: "Turn one event into a complete campaign.",
  body: "Hey Ralli uses the event details your team already entered to create coordinated artwork, captions, communication milestones, and a campaign that is ready for review.",
  benefits: [
    "Create artwork and messaging from one event",
    "Keep dates, details, and captions aligned",
    "Move the complete campaign into review",
  ],
} as const;

export const FEATURES_IN_ACTION_STATIC_SECTIONS: FeaturesInActionStaticSection[] =
  [
    {
      id: "plan-your-year",
      eyebrow: "Plan Your Year",
      heading: "See the year before it gets busy.",
      body: "Bring events, deadlines, communications, and important dates into one organized view. Hey Ralli helps your team understand what is coming and prepare before work becomes urgent.",
      benefits: [
        "Organize events and communication deadlines",
        "Spot busy weeks and missing plans",
        "Keep the whole team working from the same calendar",
      ],
      imageSrc: "/images/features/calendar.png",
      imageAlt: "Hey Ralli calendar view with school events and deadlines",
    },
    {
      id: "approvals",
      eyebrow: "Approvals",
      heading: "Keep reviews moving without chasing people.",
      body: "Send artwork and messaging to the correct reviewer, see what needs attention, and keep every approval connected to the event.",
      benefits: [
        "Route work to the right people",
        "See what is waiting for review",
        "Keep feedback and status in one place",
      ],
      imageSrc: "/images/features/approvals.png",
      imageAlt: "Hey Ralli approvals workspace with items waiting for review",
    },
    {
      id: "volunteer-intelligence",
      eyebrow: "Volunteer Intelligence",
      heading: "Know what is filled—and what still needs help.",
      body: "Turn volunteer signup information into a clear staffing picture. See your fill rate, open roles, and the next action your team should take.",
      benefits: [
        "Monitor filled and available positions",
        "Identify roles that need attention",
        "Know when to send another reminder",
      ],
      imageSrc: "/images/features/planning-hub.png",
      imageAlt: "Hey Ralli planning hub showing event staffing and tasks",
    },
    {
      id: "communications-hub",
      eyebrow: "Communications Hub",
      heading: "Keep every message connected to the event.",
      body: "Manage upcoming communications, drafts, approvals, and recent activity from one organized workspace instead of scattered documents and inboxes.",
      benefits: [
        "See what is coming next",
        "Find drafts and recent messages quickly",
        "Keep communications tied to their event",
      ],
      imageSrc: "/images/features/publish.png",
      imageAlt: "Hey Ralli communications and publishing workspace",
    },
    {
      id: "ask-ralli",
      eyebrow: "Ask Ralli",
      heading: "Always know what to do next.",
      body: "Ask questions about your events, timelines, communications, and team responsibilities. Hey Ralli uses the information already inside your workspace to provide a clear next step.",
      benefits: [
        "Get answers in plain language",
        "Find missing tasks and communications",
        "Turn information into an action plan",
      ],
      imageSrc: "/images/features/dashboard.png",
      imageAlt: "Hey Ralli Today dashboard highlighting what needs attention",
    },
  ];

export const FEATURES_IN_ACTION_FINAL_CTA = {
  eyebrow: "Ready when you are",
  title: "Plan the event. Hey Ralli helps with everything around it.",
  body: "Give your team one place to organize the work, create the communication, and keep every event moving forward.",
  cta: "Get Started",
} as const;
