import { defineTimeline } from "@/marketing/engine";
import { APPROVALS_SPEC } from "./approvalsSpec";

void APPROVALS_SPEC;

export const APPROVALS_TIMELINE = defineTimeline({
  id: "approvals",
  duration: 20,
  loop: true,
  cues: [
    { at: 0, id: "hub", label: "Hub" },
    { at: 3.5, id: "focus", label: "Focus row" },
    { at: 6.5, id: "view", label: "Move to View" },
    { at: 7.6, id: "view-click", label: "Click View" },
    { at: 8.2, id: "review", label: "Review drawer" },
    { at: 14, id: "approve", label: "Move to Approve" },
    { at: 15.2, id: "approve-click", label: "Click Approve" },
    { at: 15.8, id: "done", label: "Approved" },
    { at: 16.1, id: "toast", label: "Toast" },
    { at: 18, id: "hold", label: "Hold" },
  ],
});
