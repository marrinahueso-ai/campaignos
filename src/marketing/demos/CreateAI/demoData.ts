/**
 * Static fixture content for the Create with AI marketing demo.
 * No live org, event, or API data.
 */

export const CREATE_AI_DEMO = {
  school: "Edmondson Elementary",
  event: {
    title: "Back to School Fair",
    date: "August 5",
    time: "3:00–4:30 PM",
    location: "Edmondson Elementary",
  },
  status: {
    start: "Planning",
    end: "Ready for Review",
  },
  cta: "Create with AI",
  preparing: "Preparing your campaign…",
  caption:
    "Join us for the Back to School Fair on August 5. Meet your teachers, visit the school, and get ready for a great year.",
  milestones: [
    { id: "save-the-date", label: "Save the Date", timing: "3 weeks before" },
    { id: "final-reminder", label: "Final Reminder", timing: "3 days before" },
    { id: "event-day", label: "Event Day", timing: "Day of" },
  ],
  toast: {
    title: "Campaign created",
    description: "Artwork, caption, and milestones are ready for review.",
  },
  artwork: {
    src: "/images/back-to-school-fair-campaign.png",
    alt: "Back to School Fair campaign artwork for Edmondson Elementary",
  },
  labels: {
    workspace: "Event workspace",
    panel: "Create with AI",
    artwork: "Artwork",
    caption: "Caption",
    milestones: "Campaign milestones",
  },
} as const;

export type CreateAIDemoData = typeof CREATE_AI_DEMO;
