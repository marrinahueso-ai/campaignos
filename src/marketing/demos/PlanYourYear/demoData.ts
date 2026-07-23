/** Static fixtures for the Plan Your Year marketing demo. */
export const PLAN_YOUR_YEAR_DEMO = {
  labels: {
    workspace: "Calendar",
    school: "Edmondson Elementary",
    month: "August 2026",
    weekLabel: "Week of Aug 3",
  },
  days: [
    { key: "sun", label: "Sun", date: 2 },
    { key: "mon", label: "Mon", date: 3 },
    { key: "tue", label: "Tue", date: 4 },
    { key: "wed", label: "Wed", date: 5 },
    { key: "thu", label: "Thu", date: 6 },
    { key: "fri", label: "Fri", date: 7 },
    { key: "sat", label: "Sat", date: 8 },
  ],
  /** Post that gets drag-rescheduled Wed → Fri */
  dragPost: {
    category: "Posts",
    title: "Back to School Fair",
    status: "Scheduled",
    fromDay: "wed",
    toDay: "fri",
  },
  staticCards: [
    {
      day: "tue",
      category: "Events",
      title: "Kindergarten Mixer",
      status: "Draft",
    },
    {
      day: "thu",
      category: "Posts",
      title: "Spirit Afternoon",
      status: "Published",
    },
  ],
  toast: {
    title: "Post rescheduled",
    description: "Drag posts on the calendar to change the Meta schedule.",
  },
} as const;
