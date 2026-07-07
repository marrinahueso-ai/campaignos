import { DEFAULT_EVENT_TYPE } from "@/lib/playbooks/constants";
import type { Event } from "@/types";
import type { EventType } from "@/types/playbooks";

export type PlanningOverviewFormState = {
  goal: string;
  location: string;
  budget: string;
  audience: string;
  expectedAttendance: string;
  eventType: EventType;
};

export function buildPlanningOverviewFromEvent(event: Event): PlanningOverviewFormState {
  return {
    goal: event.goal ?? "",
    location: event.location ?? "",
    budget: event.budget ?? "",
    audience: event.audience ?? "",
    expectedAttendance: event.expectedAttendance ?? "",
    eventType: event.eventType ?? DEFAULT_EVENT_TYPE,
  };
}
