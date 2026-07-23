import { defineDemoSpec } from "@/marketing/demo-generator";

export const PLAN_YOUR_YEAR_SPEC = defineDemoSpec({
  id: "plan-your-year",
  name: "Plan Your Year",
  folderName: "PlanYourYear",
  previewLabel: "Plan Your Year",
  description:
    "Shows the school-year calendar with an event detail and posting-time guidance.",
  productArea: "Calendar",
  audience: "PTO/PTA volunteers evaluating Hey Ralli",
  goal: "Visitor sees events on one calendar and can open an event for next steps.",
  playback: {
    duration: 18,
    loop: true,
    autoplay: true,
    allowBeatOverlap: true,
  },
  states: {
    startingState: "August calendar with several school events.",
    finalState:
      "Back to School Fair selected with detail panel and posting-time chips visible.",
    reducedMotionState:
      "Show August calendar, selected Fair detail, posting times, and toast immediately.",
  },
  beats: [
    {
      id: "calendar",
      label: "Calendar hold",
      start: 0,
      end: 3,
      description: "Show month grid with events.",
      preferredPrimitives: ["Scene"],
    },
    {
      id: "select",
      label: "Select event",
      start: 3,
      end: 6,
      description: "Cursor clicks Back to School Fair.",
      preferredPrimitives: ["Cursor", "MouseClick", "Highlight"],
    },
    {
      id: "detail",
      label: "Detail panel",
      start: 6,
      end: 11,
      description: "Event detail opens with next communication.",
      preferredPrimitives: ["FadeSlide", "Scene"],
    },
    {
      id: "heatmap",
      label: "Posting times",
      start: 11,
      end: 14.5,
      description: "Show preferred posting windows.",
      preferredPrimitives: ["FadeSlide"],
      overlapOk: true,
    },
    {
      id: "finish",
      label: "Hold",
      start: 14.5,
      end: 18,
      description: "Toast and final hold.",
      preferredPrimitives: ["Toast"],
    },
  ],
  content: {
    requiredText: {
      school: "Edmondson Elementary",
      month: "August 2026",
      eventTitle: "Back to School Fair",
      toastTitle: "Year in view",
    },
  },
  responsive: {
    primaryStory: ["Month events", "Selected event", "Detail", "Posting times"],
    mobileSimplifications: ["Keep selected event and detail readable"],
  },
  accessibility: {
    decorativeElements: ["Animated cursor"],
    announcements: [],
    notes: ["Toast announce={false} to avoid loop spam."],
  },
  restrictions: [
    "No live calendar APIs",
    "No dashboard imports",
    "No Insights-weighted heatmap claims",
  ],
  suggestedPrimitives: [
    "Cursor",
    "MouseClick",
    "Highlight",
    "FadeSlide",
    "Toast",
    "Scene",
  ],
});
