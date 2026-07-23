import { defineTimeline } from "@/marketing/engine";
import { ASK_RALLI_SPEC } from "./askRalliSpec";

void ASK_RALLI_SPEC;

export const ASK_RALLI_TIMELINE = defineTimeline({
  id: "ask-ralli",
  duration: 18,
  loop: true,
  cues: [
    { at: 0, id: "idle", label: "Idle" },
    { at: 2.5, id: "question", label: "Question" },
    { at: 7.5, id: "answer", label: "Answer" },
    { at: 11.5, id: "chips", label: "Chips" },
    { at: 13, id: "toast", label: "Toast" },
    { at: 16, id: "hold", label: "Hold" },
  ],
});
