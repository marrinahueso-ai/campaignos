/**
 * TEMPLATE — copy into src/marketing/demos/[DemoName]/[demoName]Timeline.ts
 * Cue ids should align with DemoSpec beat ids where practical.
 */

import { defineTimeline } from "@/marketing/engine";

export const DEMO_TIMELINE = defineTimeline({
  id: "[demo-id]",
  duration: 22,
  loop: true,
  cues: [
    { at: 0, id: "start", label: "Starting state" },
    { at: 2.5, id: "action", label: "Primary action" },
    { at: 8, id: "reveal", label: "Main reveal" },
    { at: 16, id: "result", label: "Final result" },
    { at: 20, id: "hold", label: "Final hold" },
  ],
});
