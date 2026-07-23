import { defineTimeline } from "@/marketing/engine";
import { PLAN_YOUR_YEAR_SPEC } from "./planYourYearSpec";

void PLAN_YOUR_YEAR_SPEC;

export const PLAN_YOUR_YEAR_TIMELINE = defineTimeline({
  id: "plan-your-year",
  duration: 22,
  loop: true,
  cues: [
    { at: 0, id: "month", label: "Month hold" },
    { at: 2.5, id: "grab", label: "Grab post" },
    { at: 3.6, id: "grab-click", label: "Pick up" },
    { at: 4.2, id: "drag", label: "Dragging" },
    { at: 8.0, id: "drop", label: "Drop" },
    { at: 8.3, id: "drop-click", label: "Release" },
    { at: 9.2, id: "open-event", label: "Open event" },
    { at: 10.4, id: "event-click", label: "Click event" },
    { at: 10.6, id: "drawer", label: "Event drawer" },
    { at: 12.8, id: "scroll", label: "Scroll detail" },
    { at: 16.0, id: "hub", label: "Planning Hub CTA" },
    { at: 17.0, id: "hub-click", label: "Click hub" },
    { at: 17.8, id: "toast", label: "Toast" },
    { at: 20.0, id: "hold", label: "Hold" },
  ],
});
