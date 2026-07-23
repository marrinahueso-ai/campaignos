import { defineTimeline } from "@/marketing/engine";
import { VOLUNTEER_INTELLIGENCE_SPEC } from "./volunteerIntelligenceSpec";

void VOLUNTEER_INTELLIGENCE_SPEC;

export const VOLUNTEER_INTELLIGENCE_TIMELINE = defineTimeline({
  id: "volunteer-intelligence",
  duration: 18,
  loop: true,
  cues: [
    { at: 0, id: "overview", label: "Overview" },
    { at: 3.5, id: "kpis", label: "KPIs" },
    { at: 8, id: "roles", label: "Roles" },
    { at: 13, id: "toast", label: "Toast" },
    { at: 16, id: "hold", label: "Hold" },
  ],
});
