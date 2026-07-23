export const APPROVALS_DEMO = {
  labels: {
    workspace: "Approvals",
    title: "Approvals & Scheduling",
    review: "Review",
  },
  summary: [
    { id: "assigned", label: "Assigned to Me", count: 2, hint: "Needs your approval", active: true },
    { id: "changes", label: "Changes Requested", count: 0, hint: "Returned for edits", active: false },
    { id: "queue", label: "In Queue", count: 1, hint: "Waiting on others", active: false },
    { id: "scheduled", label: "Scheduled", count: 3, hint: "Ready to publish", active: false },
  ],
  row: {
    milestone: "Reminder Only",
    event: "School Supply Sorting",
    type: "Campaign",
    status: "Assigned to Me",
    due: "Due today",
    assigneeInitials: "MP",
    assigneeName: "Michelle Park",
    assigneeRole: "President",
    nextAction: "Review and approve",
    submitted: "Submitted 4h ago",
    delivery: "FB Scheduled",
    schedule: "Aug 3, 2026, 9:00 AM",
  },
  review: {
    title: "Reminder Only",
    subtitle: "School Supply Sorting · Campaign",
    caption:
      "Join us for School Supply Sorting on August 4. Help get classroom kits organized and ready for a great year.",
    platforms: "Facebook",
    delivery: "Schedule",
    schedule: "Aug 3, 2026 · 9:00 AM",
    feedImage: "/images/back-to-school-fair-campaign.png",
    storyImage: "/images/back-to-school-fair-campaign.png",
  },
  secondaryRows: [
    {
      milestone: "Final Reminder",
      event: "Spirit Night",
      status: "In Queue",
    },
    {
      milestone: "Event Day",
      event: "Board Meeting",
      status: "Scheduled",
    },
  ],
  toast: {
    title: "Approved",
    description: "Reminder Only is approved and stays on the schedule.",
  },
} as const;
