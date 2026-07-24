import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  defaultEventsHomeLayout,
  normalizeEventsHomeLayout,
  type EventsHomeLayout,
} from "@/lib/events/events-home-layout";

export async function getEventsHomeLayoutForCurrentUser(): Promise<EventsHomeLayout> {
  const membership = await getActiveMembership();
  if (!membership) {
    return defaultEventsHomeLayout();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select("events_home_layout")
    .eq("id", membership.user.id)
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || error.message.includes("events_home_layout")) {
      return defaultEventsHomeLayout();
    }
    console.error("[events] failed to load home layout:", error.message);
    return defaultEventsHomeLayout();
  }

  return normalizeEventsHomeLayout(
    (data as { events_home_layout?: unknown } | null)?.events_home_layout,
  );
}
