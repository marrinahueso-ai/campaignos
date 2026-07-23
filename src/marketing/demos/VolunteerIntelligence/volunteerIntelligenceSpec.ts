import { defineDemoSpec } from "@/marketing/demo-generator";

export const VOLUNTEER_INTELLIGENCE_SPEC = defineDemoSpec({
  id: "volunteer-intelligence",
  name: "Volunteer Intelligence",
  folderName: "VolunteerIntelligence",
  previewLabel: "Volunteer Intelligence",
  description:
    "Shows Volunteer Master fill rate, underfilled roles, and where help is still needed.",
  productArea: "Volunteers / Volunteer Master",
  audience: "PTO/PTA volunteers evaluating Hey Ralli",
  goal: "Visitor sees filled vs open roles without opening SignUpGenius.",
  playback: {
    duration: 18,
    loop: true,
    autoplay: true,
    allowBeatOverlap: true,
  },
  states: {
    startingState: "Volunteer Master with empty KPI emphasis.",
    finalState: "72% fill rate, three underfilled roles highlighted, toast.",
    reducedMotionState:
      "Show 72% fill rate, role bars, underfilled callout, and toast immediately.",
  },
  beats: [
    {
      id: "overview",
      label: "Overview",
      start: 0,
      end: 3.5,
      description: "Show Volunteer Master shell.",
      preferredPrimitives: ["Scene"],
    },
    {
      id: "kpis",
      label: "KPIs",
      start: 3.5,
      end: 8,
      description: "Count up fill rate and underfilled roles.",
      preferredPrimitives: ["CountUp", "FadeSlide"],
    },
    {
      id: "roles",
      label: "Roles",
      start: 8,
      end: 13,
      description: "Reveal role fill bars; highlight open roles.",
      preferredPrimitives: ["FadeSlide", "ProgressBar"],
      overlapOk: true,
    },
    {
      id: "finish",
      label: "Finish",
      start: 13,
      end: 18,
      description: "Toast hold.",
      preferredPrimitives: ["Toast"],
    },
  ],
  content: {
    requiredText: {
      title: "Volunteer Master",
      event: "Back to School Fair",
      fillRate: "72%",
      underfilled: "3",
      toastTitle: "Staffing picture clear",
    },
    requiredLists: {
      roles: [
        "Welcome table",
        "Classroom guides",
        "Supply drop-off",
        "Cleanup crew",
      ],
    },
  },
  responsive: {
    primaryStory: ["Fill rate", "Underfilled count", "Open roles"],
    mobileSimplifications: ["Keep KPIs and top underfilled roles"],
  },
  accessibility: {
    decorativeElements: [],
    announcements: [],
    notes: ["Toast announce={false}."],
  },
  restrictions: [
    "No live SignUpGenius APIs",
    "No volunteer PII",
    "No dashboard imports",
  ],
  suggestedPrimitives: ["CountUp", "ProgressBar", "FadeSlide", "Toast", "Scene"],
});
