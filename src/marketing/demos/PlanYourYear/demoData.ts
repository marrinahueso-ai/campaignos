/** Static fixtures for the Plan Your Year marketing demo. */
export const PLAN_YOUR_YEAR_DEMO = {
  labels: {
    workspace: "Calendar",
    school: "Edmondson Elementary",
    month: "August 2026",
    detail: "Event detail",
    heatmap: "Posting times",
  },
  events: [
    { day: 5, title: "Back to School Fair", tone: "brand" as const },
    { day: 8, title: "Volunteer Kickoff", tone: "sage" as const },
    { day: 12, title: "Board Meeting", tone: "muted" as const },
  ],
  selected: {
    title: "Back to School Fair",
    date: "Wednesday, August 5",
    time: "3:00–4:30 PM",
    place: "Edmondson Elementary",
    next: "Save the Date · draft ready",
  },
  heatmap: ["Tue 7pm", "Wed 6pm", "Thu 7pm"],
  toast: {
    title: "Year in view",
    description: "Events, posts, and deadlines stay on one calendar.",
  },
} as const;
