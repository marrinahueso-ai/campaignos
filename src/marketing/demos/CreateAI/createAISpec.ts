import { defineDemoSpec } from "@/marketing/demo-generator";

/**
 * Authoring specification for the Create with AI marketing demo.
 * Does not change runtime timeline behavior — documents the contract.
 */
export const CREATE_AI_SPEC = defineDemoSpec({
  id: "create-ai",
  name: "Create with AI",
  folderName: "CreateAI",
  previewLabel: "Create with AI",
  description:
    "Shows how Hey Ralli turns one school event into a complete communication campaign.",
  productArea: "Create with AI / Campaign Builder",
  audience: "PTO/PTA volunteers evaluating Hey Ralli",
  goal: "Visitor understands that one event becomes artwork, caption, milestones, and Ready for Review — without clicking.",
  playback: {
    duration: 25.5,
    loop: true,
    autoplay: true,
    // CTA sub-cues, preparing, and milestone staggers intentionally overlap.
    allowBeatOverlap: true,
  },
  states: {
    startingState:
      "Event workspace for Back to School Fair with Planning status and Create with AI CTA.",
    finalState:
      "Campaign draft with artwork, full caption, three milestones Ready, Ready for Review status, and Campaign created toast.",
    reducedMotionState:
      "Immediately show the completed campaign: artwork, caption, all milestones, Ready for Review, and toast — no cursor travel, typing, pulse, or shimmer.",
  },
  beats: [
    {
      id: "workspace",
      label: "Event workspace",
      start: 0,
      end: 2.5,
      description: "Hold starting event context so visitors understand the scene.",
      preferredPrimitives: ["Scene"],
    },
    {
      id: "create-cta",
      label: "Create with AI",
      start: 2.5,
      end: 4.5,
      description: "Cursor moves to Create with AI, highlight, click.",
      preferredPrimitives: ["Cursor", "Highlight", "Pulse", "MouseClick"],
    },
    {
      id: "panel-open",
      label: "Panel + preparing",
      start: 4.5,
      end: 7.0,
      description: "Open Create with AI panel and show calm preparing state.",
      preferredPrimitives: ["Scene", "Skeleton", "ProgressBar"],
    },
    {
      id: "artwork",
      label: "Artwork reveal",
      start: 7.0,
      end: 11.0,
      description: "Reveal Back to School Fair artwork preview.",
      preferredPrimitives: ["FadeSlide"],
    },
    {
      id: "caption",
      label: "Caption",
      start: 11.0,
      end: 15.5,
      description: "Type the approved social caption at readable pace.",
      preferredPrimitives: ["TypingAnimation", "FadeSlide"],
    },
    {
      id: "milestones",
      label: "Milestones",
      start: 15.5,
      end: 20.0,
      description: "Stagger Save the Date, Final Reminder, Event Day.",
      preferredPrimitives: ["FadeSlide", "AutoScroll"],
      overlapOk: true,
    },
    {
      id: "ready",
      label: "Ready for Review",
      start: 20.0,
      end: 25.5,
      description: "Badge becomes Ready for Review; show Campaign created toast; hold.",
      preferredPrimitives: ["BadgeChange", "Toast"],
    },
  ],
  content: {
    requiredText: {
      school: "Edmondson Elementary",
      eventTitle: "Back to School Fair",
      date: "August 5",
      time: "3:00–4:30 PM",
      location: "Edmondson Elementary",
      statusStart: "Planning",
      statusEnd: "Ready for Review",
      cta: "Create with AI",
      preparing: "Preparing your campaign…",
      caption:
        "Join us for the Back to School Fair on August 5. Meet your teachers, visit the school, and get ready for a great year.",
      toastTitle: "Campaign created",
    },
    requiredLists: {
      milestones: ["Save the Date", "Final Reminder", "Event Day"],
    },
  },
  responsive: {
    primaryStory: [
      "Event title",
      "Create with AI action",
      "Artwork",
      "Caption",
      "Milestones",
      "Ready for Review",
    ],
    mobileSimplifications: [
      "Stack panel below event summary",
      "Cap artwork height",
      "Autoscroll panel to milestones when they appear",
    ],
  },
  accessibility: {
    decorativeElements: ["Animated cursor", "Click ripple"],
    announcements: [],
    notes: [
      "Toast uses announce={false} to avoid loop spam.",
      "Status change uses text labels, not color alone.",
    ],
  },
  restrictions: [
    "No live org/event APIs",
    "No dashboard component imports",
    "No confetti",
    "No public marketing page wiring in this phase",
  ],
  suggestedPrimitives: [
    "Cursor",
    "MouseClick",
    "Highlight",
    "Pulse",
    "TypingAnimation",
    "FadeSlide",
    "BadgeChange",
    "Skeleton",
    "ProgressBar",
    "Toast",
    "AutoScroll",
    "Scene",
  ],
});
