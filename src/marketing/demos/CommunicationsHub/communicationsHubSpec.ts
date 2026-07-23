import { defineDemoSpec } from "@/marketing/demo-generator";

export const COMMUNICATIONS_HUB_SPEC = defineDemoSpec({
  id: "communications-hub",
  name: "Communications Hub",
  folderName: "CommunicationsHub",
  previewLabel: "Communications Hub",
  description:
    "Shows the Meta inbox: unread thread, AI draft, approve-then-send.",
  productArea: "Communications Hub / Inbox",
  audience: "PTO/PTA volunteers evaluating Hey Ralli",
  goal: "Visitor understands Facebook/Instagram messages stay in one inbox with AI draft help.",
  playback: {
    duration: 18,
    loop: true,
    autoplay: true,
    allowBeatOverlap: true,
  },
  states: {
    startingState: "Unread queue with a Messenger question about the fair.",
    finalState: "AI draft approved and reply sent toast.",
    reducedMotionState:
      "Show unread thread, completed draft reply, and sent toast immediately.",
  },
  beats: [
    {
      id: "inbox",
      label: "Inbox",
      start: 0,
      end: 3.5,
      description: "Show Unread queue and thread.",
      preferredPrimitives: ["Scene"],
    },
    {
      id: "open",
      label: "Open thread",
      start: 3.5,
      end: 6.5,
      description: "Highlight conversation.",
      preferredPrimitives: ["Highlight", "Cursor"],
    },
    {
      id: "draft",
      label: "AI draft",
      start: 6.5,
      end: 12.5,
      description: "Type AI draft reply.",
      preferredPrimitives: ["TypingAnimation", "FadeSlide"],
    },
    {
      id: "send",
      label: "Send",
      start: 12.5,
      end: 18,
      description: "Approve & send + toast.",
      preferredPrimitives: ["Cursor", "MouseClick", "Toast"],
    },
  ],
  content: {
    requiredText: {
      from: "Jordan Lee",
      question: "What time does the fair start?",
      draft:
        "Hi Jordan — the Back to School Fair is August 5 from 3:00–4:30 PM at Edmondson Elementary. Hope to see you there!",
      toastTitle: "Reply sent",
    },
  },
  responsive: {
    primaryStory: ["Unread", "Thread", "AI draft", "Send"],
    mobileSimplifications: ["Stack queue above thread"],
  },
  accessibility: {
    decorativeElements: ["Animated cursor"],
    announcements: [],
    notes: ["Toast announce={false}."],
  },
  restrictions: [
    "No live Meta APIs",
    "No Gmail claims",
    "No dashboard imports",
  ],
  suggestedPrimitives: [
    "Cursor",
    "MouseClick",
    "Highlight",
    "TypingAnimation",
    "FadeSlide",
    "Toast",
    "Scene",
  ],
});
