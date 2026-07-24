"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeEventsHomeLayout,
  type EventsHomeLayout,
} from "@/lib/events/events-home-layout";

export async function saveEventsHomeLayoutAction(
  layout: EventsHomeLayout,
): Promise<{ success: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { success: false, error: "Not signed in." };
  }

  const normalized = normalizeEventsHomeLayout(layout);
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .update({ events_home_layout: normalized })
    .eq("id", membership.user.id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    console.error("[events] failed to save home layout:", error.message);
    return { success: false, error: "Could not save Events card layout." };
  }

  revalidatePath("/events");
  return { success: true };
}
