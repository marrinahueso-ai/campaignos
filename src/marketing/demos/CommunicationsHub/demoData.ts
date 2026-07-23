export const COMMUNICATIONS_HUB_DEMO = {
  labels: {
    workspace: "Communications Hub",
    title: "Unread",
    thread: "Messenger",
  },
  queues: ["Unread", "Follow up", "Done"],
  conversation: {
    from: "Jordan Lee",
    preview: "What time does the fair start?",
    parent: "Back to School Fair · Save the Date",
    draft:
      "Hi Jordan — the Back to School Fair is August 5 from 3:00–4:30 PM at Edmondson Elementary. Hope to see you there!",
  },
  toast: {
    title: "Reply sent",
    description: "Messenger reply stays tied to your Meta inbox.",
  },
} as const;
