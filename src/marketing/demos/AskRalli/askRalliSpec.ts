import { defineDemoSpec } from "@/marketing/demo-generator";

export const ASK_RALLI_SPEC = defineDemoSpec({
  id: "ask-ralli",
  name: "Ask Ralli",
  folderName: "AskRalli",
  previewLabel: "Ask Ralli",
  description:
    "Shows Ask Ralli answering a next-step question with deep-link chips.",
  productArea: "Hey Ralli Assistant",
  audience: "PTO/PTA volunteers evaluating Hey Ralli",
  goal: "Visitor understands Ask Ralli turns workspace context into a clear next action.",
  playback: {
    duration: 18,
    loop: true,
    autoplay: true,
    allowBeatOverlap: true,
  },
  states: {
    startingState: "Empty Ask Ralli composer.",
    finalState: "Answer with next-step chips and toast.",
    reducedMotionState:
      "Show completed question, answer, chips, and toast immediately.",
  },
  beats: [
    {
      id: "idle",
      label: "Idle",
      start: 0,
      end: 2.5,
      description: "Show assistant shell.",
      preferredPrimitives: ["Scene"],
    },
    {
      id: "question",
      label: "Question",
      start: 2.5,
      end: 7.5,
      description: "Type the visitor question.",
      preferredPrimitives: ["TypingAnimation"],
    },
    {
      id: "answer",
      label: "Answer",
      start: 7.5,
      end: 13,
      description: "Reveal answer and chips.",
      preferredPrimitives: ["FadeSlide", "TypingAnimation"],
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
      question: "What should I do next for Back to School Fair?",
      answer:
        "Save the Date is waiting on Michelle Park. Approve that artwork first, then check Classroom guides — still short three volunteers.",
      toastTitle: "Clear next step",
    },
    requiredLists: {
      chips: ["Open Approvals", "View Volunteers", "Event workspace"],
    },
  },
  responsive: {
    primaryStory: ["Question", "Answer", "Action chips"],
    mobileSimplifications: ["Keep answer and first chip"],
  },
  accessibility: {
    decorativeElements: [],
    announcements: [],
    notes: ["Toast announce={false}."],
  },
  restrictions: [
    "No live assistant APIs",
    "No invented metrics",
    "No dashboard imports",
  ],
  suggestedPrimitives: ["TypingAnimation", "FadeSlide", "Toast", "Scene"],
});
