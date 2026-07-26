"use server";

import { revalidatePath } from "next/cache";
import {
  mergePlanningQuickLinks,
  parsePlanningQuickLinks,
  type PlanningQuickLinksMap,
  type PlanningVendorEntry,
} from "@/lib/event-playbooks/planning-constants";
import { updateEventPlanningFields } from "@/lib/event-playbooks/planning-mutations";
import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/types/playbooks";

function revalidateEvent(eventId: string) {
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/calendar");
}

export async function saveEventPlanningOverviewAction(
  eventId: string,
  input: {
    goal: string;
    location: string;
    budget: string;
    audience: string;
    expectedAttendance: string;
    eventType: EventType;
  },
): Promise<{ success: boolean; error: string | null }> {
  const ok = await updateEventPlanningFields(eventId, {
    goal: input.goal.trim() || null,
    location: input.location.trim() || null,
    budget: input.budget.trim() || null,
    audience: input.audience.trim() || null,
    expected_attendance: input.expectedAttendance.trim() || null,
    event_type: input.eventType,
  });

  if (!ok) {
    return { success: false, error: "Unable to save event overview." };
  }

  revalidateEvent(eventId);
  return { success: true, error: null };
}

export async function saveEventPlanningQuickLinksAction(
  eventId: string,
  links: PlanningQuickLinksMap,
): Promise<{ success: boolean; error: string | null }> {
  const ok = await updateEventPlanningFields(eventId, {
    planning_quick_links: links,
  });

  if (!ok) {
    return { success: false, error: "Unable to save quick links." };
  }

  revalidateEvent(eventId);
  return { success: true, error: null };
}

/**
 * Merge a volunteer page URL into planning quick links without wiping other links.
 * Used by Homepage Composer when an event card link is edited.
 */
export async function saveEventVolunteerSignupUrlAction(
  eventId: string,
  url: string,
): Promise<{ success: boolean; error: string | null }> {
  const trimmed = url.trim();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("planning_quick_links")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load planning quick links:", error.message);
    return { success: false, error: "Unable to update volunteer page link." };
  }

  const current = mergePlanningQuickLinks(
    parsePlanningQuickLinks(data?.planning_quick_links),
  );
  const next: PlanningQuickLinksMap = {
    ...current,
    volunteer_signup: {
      url: trimmed,
      status: trimmed ? "filled" : "open",
    },
  };

  return saveEventPlanningQuickLinksAction(eventId, next);
}

export async function saveEventPlanningVendorsAction(
  eventId: string,
  vendors: PlanningVendorEntry[],
): Promise<{ success: boolean; error: string | null }> {
  const ok = await updateEventPlanningFields(eventId, {
    planning_vendors: vendors,
  });

  if (!ok) {
    return { success: false, error: "Unable to save vendor list." };
  }

  revalidateEvent(eventId);
  return { success: true, error: null };
}

export async function saveApprovedSquareImageAction(
  eventId: string,
  input: {
    imageDataUrl: string | null;
    status: "open" | "filled";
  },
): Promise<{ success: boolean; error: string | null }> {
  const ok = await updateEventPlanningFields(eventId, {
    approved_square_image_url: input.imageDataUrl,
    approved_square_image_status: input.status,
  });

  if (!ok) {
    return { success: false, error: "Unable to save approved image." };
  }

  revalidateEvent(eventId);
  return { success: true, error: null };
}
