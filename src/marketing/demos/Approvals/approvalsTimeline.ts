import { defineTimeline } from "@/marketing/engine";
import { APPROVALS_SPEC } from "./approvalsSpec";

void APPROVALS_SPEC;

export const APPROVALS_TIMELINE = defineTimeline({
  id: "approvals",
  duration: 16,
  loop: true,
  cues: [
    { at: 0, id: "queue", label: "Queue" },
    { at: 3.5, id: "focus", label: "Focus item" },
    { at: 6.5, id: "approve", label: "Move to Approve" },
    { at: 7.6, id: "approve-click", label: "Click Approve" },
    { at: 10, id: "done", label: "Approved" },
    { at: 10.3, id: "toast", label: "Toast" },
    { at: 14, id: "hold", label: "Hold" },
  ],
});
