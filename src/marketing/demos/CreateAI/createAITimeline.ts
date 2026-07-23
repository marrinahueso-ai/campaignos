import { defineTimeline } from "@/marketing/engine";
import { CREATE_AI_SPEC } from "./createAISpec";

/** Keeps the DemoSpec in the demo module graph for authoring validation. */
void CREATE_AI_SPEC;

/**
 * Create with AI marketing demo timeline (~25.5s).
 *
 * 0.0–2.5  Event workspace hold
 * 2.5–4.5  Cursor → Create with AI → click
 * 4.5–7.0  Panel open + preparing
 * 7.0–11.0 Artwork reveal
 * 11.0–15.5 Caption typing
 * 15.5–20.0 Milestone stagger
 * 20.0–23.0 Ready for Review + toast
 * 23.0–25.5 Final hold → loop
 */
export const CREATE_AI_TIMELINE = defineTimeline({
  id: "create-with-ai",
  duration: 25.5,
  loop: true,
  cues: [
    { at: 0, id: "workspace", label: "Event workspace" },
    { at: 2.5, id: "create-cta", label: "Create with AI highlight" },
    { at: 3.6, id: "create-click", label: "Create with AI click" },
    { at: 4.5, id: "panel-open", label: "Panel opens" },
    { at: 4.6, id: "preparing", label: "Preparing campaign" },
    { at: 7.0, id: "artwork", label: "Artwork reveal" },
    { at: 11.0, id: "caption", label: "Caption typing" },
    { at: 15.5, id: "milestones", label: "Milestones" },
    { at: 16.2, id: "milestone-2", label: "Final Reminder" },
    { at: 16.9, id: "milestone-3", label: "Event Day" },
    { at: 20.0, id: "ready", label: "Ready for Review" },
    { at: 20.4, id: "toast", label: "Campaign created toast" },
    { at: 23.0, id: "hold", label: "Final hold" },
  ],
});

export const CREATE_AI_DURATION = CREATE_AI_TIMELINE.duration;
