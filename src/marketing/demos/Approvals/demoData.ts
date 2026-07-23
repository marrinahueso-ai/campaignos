export const APPROVALS_DEMO = {
  labels: {
    workspace: "Approvals",
    title: "Assigned to Me",
  },
  filters: ["Assigned to Me", "Changes Requested", "In Queue", "Scheduled"],
  item: {
    milestone: "Save the Date",
    event: "Back to School Fair",
    assignee: "Michelle Park",
    schedule: "Jul 15 · 7:00 PM",
    statusStart: "Waiting",
    statusEnd: "Approved",
  },
  queue: [
    { milestone: "Final Reminder", event: "Spirit Night", status: "In Queue" },
    { milestone: "Event Day", event: "Board Meeting", status: "Scheduled" },
  ],
  toast: {
    title: "Approved",
    description: "Save the Date stays connected to Back to School Fair.",
  },
} as const;
