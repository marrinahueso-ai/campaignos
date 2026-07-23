import { defineDemoSpec } from "@/marketing/demo-generator";

export const PLAN_YOUR_YEAR_SPEC = defineDemoSpec({
  id: "plan-your-year",
  name: "Plan Your Year",
  folderName: "PlanYourYear",
  previewLabel: "Plan Your Year",
  description:
    "Shows the school calendar with grip-handle post cards and drag-to-reschedule.",
  productArea: "Calendar",
  audience: "PTO/PTA volunteers evaluating Hey Ralli",
  goal: "Visitor sees calendar cards like the product and understands posts can be rescheduled by dragging.",
  playback: {
    duration: 18,
    loop: true,
    autoplay: true,
    allowBeatOverlap: true,
  },
  states: {
    startingState:
      "Week calendar with Events/Posts cards including Scheduled Back to School Fair on Wednesday.",
    finalState:
      "Same post landed on Friday after drag; reschedule toast visible.",
    reducedMotionState:
      "Show final week with Back to School Fair already on Friday and toast — no cursor or drag motion.",
  },
  beats: [
    {
      id: "calendar",
      label: "Calendar hold",
      start: 0,
      end: 3,
      description: "Show week grid and cards with grip handles.",
      preferredPrimitives: ["Scene"],
    },
    {
      id: "grab",
      label: "Grab post",
      start: 3,
      end: 5.5,
      description: "Cursor moves to grip and picks up Scheduled post.",
      preferredPrimitives: ["Cursor", "MouseClick", "Highlight"],
    },
    {
      id: "drag",
      label: "Drag",
      start: 5.5,
      end: 10.5,
      description: "Drag ghost card from Wednesday to Friday.",
      preferredPrimitives: ["Cursor", "Scene"],
    },
    {
      id: "drop",
      label: "Drop",
      start: 10.5,
      end: 13.5,
      description: "Drop on Friday; card settles in new day.",
      preferredPrimitives: ["MouseClick", "FadeSlide"],
    },
    {
      id: "finish",
      label: "Hold",
      start: 13.5,
      end: 18,
      description: "Toast and final hold.",
      preferredPrimitives: ["Toast"],
    },
  ],
  content: {
    requiredText: {
      school: "Edmondson Elementary",
      week: "Week of Aug 3",
      postTitle: "Back to School Fair",
      status: "Scheduled",
      toastTitle: "Post rescheduled",
    },
  },
  responsive: {
    primaryStory: ["Week grid", "Grip cards", "Drag reschedule", "Toast"],
    mobileSimplifications: ["Keep Wed→Fri drag readable; fewer static cards"],
  },
  accessibility: {
    decorativeElements: ["Animated cursor", "Drag ghost"],
    announcements: [],
    notes: ["Toast announce={false}."],
  },
  restrictions: [
    "No live calendar APIs",
    "No dashboard imports",
    "No real screenshot assets",
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
