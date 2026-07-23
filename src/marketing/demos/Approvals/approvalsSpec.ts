import { defineDemoSpec } from "@/marketing/demo-generator";

export const APPROVALS_SPEC = defineDemoSpec({
  id: "approvals",
  name: "Approvals",
  folderName: "Approvals",
  previewLabel: "Approvals",
  description:
    "Shows the Approvals hub: review a waiting item and approve it without leaving the event context.",
  productArea: "Approvals",
  audience: "PTO/PTA volunteers evaluating Hey Ralli",
  goal: "Visitor understands reviews stay organized and connected to the event.",
  playback: {
    duration: 16,
    loop: true,
    autoplay: true,
    allowBeatOverlap: true,
  },
  states: {
    startingState: "Assigned to Me queue with Save the Date waiting.",
    finalState: "Item approved with success toast.",
    reducedMotionState: "Show approved Save the Date row and toast immediately.",
  },
  beats: [
    {
      id: "queue",
      label: "Queue",
      start: 0,
      end: 3.5,
      description: "Show Assigned to Me filters and waiting item.",
      preferredPrimitives: ["Scene"],
    },
    {
      id: "focus",
      label: "Focus item",
      start: 3.5,
      end: 6.5,
      description: "Highlight waiting approval.",
      preferredPrimitives: ["Highlight", "Cursor"],
    },
    {
      id: "approve",
      label: "Approve",
      start: 6.5,
      end: 10,
      description: "Click Approve.",
      preferredPrimitives: ["Cursor", "MouseClick"],
    },
    {
      id: "done",
      label: "Approved",
      start: 10,
      end: 16,
      description: "Badge changes and toast.",
      preferredPrimitives: ["BadgeChange", "Toast"],
    },
  ],
  content: {
    requiredText: {
      milestone: "Save the Date",
      event: "Back to School Fair",
      statusStart: "Waiting",
      statusEnd: "Approved",
      toastTitle: "Approved",
    },
  },
  responsive: {
    primaryStory: ["Filter", "Waiting item", "Approve", "Approved status"],
    mobileSimplifications: ["Keep primary row and Approve CTA"],
  },
  accessibility: {
    decorativeElements: ["Animated cursor"],
    announcements: [],
    notes: ["Status uses text labels; toast announce={false}."],
  },
  restrictions: ["No live approval APIs", "No dashboard imports"],
  suggestedPrimitives: [
    "Cursor",
    "MouseClick",
    "Highlight",
    "BadgeChange",
    "Toast",
    "Scene",
  ],
});
