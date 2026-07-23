import { defineDemoSpec } from "@/marketing/demo-generator";

export const APPROVALS_SPEC = defineDemoSpec({
  id: "approvals",
  name: "Approvals",
  folderName: "Approvals",
  previewLabel: "Approvals",
  description:
    "Shows Assigned to Me in the Approvals hub, opens Review via View, then Approve.",
  productArea: "Approvals",
  audience: "PTO/PTA volunteers evaluating Hey Ralli",
  goal: "Visitor recognizes Assigned to Me rows and understands View opens a review drawer to approve.",
  playback: {
    duration: 20,
    loop: true,
    autoplay: true,
    allowBeatOverlap: true,
  },
  states: {
    startingState:
      "Approvals hub with Assigned to Me filter active and a real assigned row with View.",
    finalState: "Review drawer open, item approved, success toast.",
    reducedMotionState:
      "Show Review drawer with approved end state and toast immediately — no cursor travel.",
  },
  beats: [
    {
      id: "hub",
      label: "Hub",
      start: 0,
      end: 3.5,
      description: "Show summary filters and Assigned to Me row.",
      preferredPrimitives: ["Scene"],
    },
    {
      id: "focus",
      label: "Focus row",
      start: 3.5,
      end: 6.5,
      description: "Highlight the assigned row and View button.",
      preferredPrimitives: ["Highlight", "Cursor"],
    },
    {
      id: "view",
      label: "Open View",
      start: 6.5,
      end: 9,
      description: "Click View to open Review drawer.",
      preferredPrimitives: ["Cursor", "MouseClick", "Drawer"],
    },
    {
      id: "review",
      label: "Review panel",
      start: 9,
      end: 14,
      description: "Show artwork, caption, schedule in Review drawer.",
      preferredPrimitives: ["Drawer", "FadeSlide"],
    },
    {
      id: "approve",
      label: "Approve",
      start: 14,
      end: 20,
      description: "Click Approve; toast confirms.",
      preferredPrimitives: ["Cursor", "MouseClick", "BadgeChange", "Toast"],
    },
  ],
  content: {
    requiredText: {
      filter: "Assigned to Me",
      milestone: "Reminder Only",
      event: "School Supply Sorting",
      view: "View",
      approve: "Approve",
      toastTitle: "Approved",
    },
  },
  responsive: {
    primaryStory: [
      "Assigned to Me filter",
      "Assigned row",
      "View",
      "Review drawer",
      "Approve",
    ],
    mobileSimplifications: ["Full-width Review drawer; keep View and Approve"],
  },
  accessibility: {
    decorativeElements: ["Animated cursor"],
    announcements: [],
    notes: ["Toast announce={false}. Status uses text labels."],
  },
  restrictions: [
    "No live approval APIs",
    "No dashboard imports",
    "No user screenshot assets",
  ],
  suggestedPrimitives: [
    "Cursor",
    "MouseClick",
    "Highlight",
    "Drawer",
    "BadgeChange",
    "Toast",
    "FadeSlide",
    "Scene",
  ],
});
