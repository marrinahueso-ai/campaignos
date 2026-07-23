import { defineTimeline } from "@/marketing/engine";
import { PLAN_YOUR_YEAR_SPEC } from "./planYourYearSpec";

void PLAN_YOUR_YEAR_SPEC;

export const PLAN_YOUR_YEAR_TIMELINE = defineTimeline({
  id: "plan-your-year",
  duration: 18,
  loop: true,
  cues: [
    { at: 0, id: "calendar", label: "Calendar" },
    { at: 3, id: "select", label: "Select event" },
    { at: 4.2, id: "select-click", label: "Click Fair" },
    { at: 6, id: "detail", label: "Detail panel" },
    { at: 11, id: "heatmap", label: "Posting times" },
    { at: 14.5, id: "toast", label: "Toast" },
    { at: 16.5, id: "hold", label: "Hold" },
  ],
});
