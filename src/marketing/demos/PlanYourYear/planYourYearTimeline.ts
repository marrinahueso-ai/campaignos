import { defineTimeline } from "@/marketing/engine";
import { PLAN_YOUR_YEAR_SPEC } from "./planYourYearSpec";

void PLAN_YOUR_YEAR_SPEC;

export const PLAN_YOUR_YEAR_TIMELINE = defineTimeline({
  id: "plan-your-year",
  duration: 18,
  loop: true,
  cues: [
    { at: 0, id: "calendar", label: "Calendar" },
    { at: 3, id: "grab", label: "Grab post" },
    { at: 4.4, id: "grab-click", label: "Pick up" },
    { at: 5.5, id: "drag", label: "Dragging" },
    { at: 10.5, id: "drop", label: "Drop" },
    { at: 10.8, id: "drop-click", label: "Release" },
    { at: 13.5, id: "toast", label: "Toast" },
    { at: 16, id: "hold", label: "Hold" },
  ],
});
