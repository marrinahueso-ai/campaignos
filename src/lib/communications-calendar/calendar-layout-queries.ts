import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  defaultCalendarLayout,
  normalizeCalendarLayout,
  type CalendarLayout,
} from "@/lib/communications-calendar/calendar-layout";

export async function getCalendarLayoutForCurrentUser(): Promise<CalendarLayout> {
  const membership = await getActiveMembership();
  if (!membership) {
    return defaultCalendarLayout();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select("calendar_layout")
    .eq("id", membership.user.id)
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || error.message.includes("calendar_layout")) {
      return defaultCalendarLayout();
    }
    console.error("[calendar] failed to load layout:", error.message);
    return defaultCalendarLayout();
  }

  return normalizeCalendarLayout(
    (data as { calendar_layout?: unknown } | null)?.calendar_layout,
  );
}
