import { defineDemoSpec } from "@/marketing/demo-generator";

export const PLAN_YOUR_YEAR_SPEC = defineDemoSpec({
  id: "plan-your-year",
  name: "Plan Your Year",
  folderName: "PlanYourYear",
  previewLabel: "Plan Your Year",
  description:
    "Month calendar: drag a Scheduled post, open an event, scroll the detail panel, and open Planning Hub.",
  productArea: "Calendar",
  audience: "PTO/PTA volunteers evaluating Hey Ralli",
  goal: "Visitor sees the school year on a month calendar, understands drag-to-reschedule, and that events open into a Planning Hub.",
  playback: {
    duration: 22,
    loop: true,
    autoplay: true,
    allowBeatOverlap: true,
  },
  states: {
    startingState:
      "August month view for Edmondson Elementary with Events / Scheduled / Published layers and Back to School Fair on Aug 5.",
    finalState:
      "Save the Date settled on Friday; event detail open at Planning Hub CTA; Planning Hub toast visible.",
    reducedMotionState:
      "Show completed month: post already on Friday, event drawer open scrolled to Open Planning Hub, toast visible — no cursor or drag motion.",
  },
  beats: [
    {
      id: "month",
      label: "Month hold",
      start: 0,
      end: 2.5,
      description: "Show month chrome, layer chips, and calendar cards.",
      preferredPrimitives: ["Scene"],
    },
    {
      id: "dnd",
      label: "Drag and drop",
      start: 2.5,
      end: 9.2,
      description: "Cursor grabs Scheduled post by grip and drops it on Friday.",
      preferredPrimitives: ["Cursor", "MouseClick", "Highlight", "Scene"],
    },
    {
      id: "open-event",
      label: "Open event",
      start: 9.2,
      end: 12.8,
      description: "Cursor clicks Back to School Fair; event detail drawer opens.",
      preferredPrimitives: ["Cursor", "MouseClick", "Drawer", "Highlight"],
    },
    {
      id: "scroll",
      label: "Scroll down",
      start: 12.8,
      end: 16,
      description: "AutoScroll inside the detail panel to reveal Open Planning Hub.",
      preferredPrimitives: ["AutoScroll"],
    },
    {
      id: "hub",
      label: "Open Planning Hub",
      start: 16,
      end: 17.8,
      description: "Cursor clicks Open Planning Hub CTA.",
      preferredPrimitives: ["Cursor", "MouseClick", "Highlight"],
    },
    {
      id: "finish",
      label: "End demo",
      start: 17.8,
      end: 22,
      description: "Toast and calm hold before loop.",
      preferredPrimitives: ["Toast"],
    },
  ],
  content: {
    requiredText: {
      school: "Edmondson Elementary",
      month: "August 2026",
      eventTitle: "Back to School Fair",
      dragTitle: "Save the Date",
      status: "Scheduled",
      hubCta: "Open Planning Hub",
      toastTitle: "Planning Hub open",
    },
  },
  responsive: {
    primaryStory: [
      "Month grid",
      "Grip DnD",
      "Event drawer",
      "Planning Hub CTA",
      "Toast",
    ],
    mobileSimplifications: [
      "Keep Aug 5→7 drag readable; compact chips; drawer covers most of frame",
    ],
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
    "Drawer",
    "AutoScroll",
    "Toast",
    "Scene",
  ],
});
