"use server";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeCalendarLayout,
  type CalendarLayout,
} from "@/lib/communications-calendar/calendar-layout";

export async function saveCalendarLayoutAction(
  layout: CalendarLayout,
): Promise<{ success: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { success: false, error: "Not signed in." };
  }

  const normalized = normalizeCalendarLayout(layout);
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .update({ calendar_layout: normalized })
    .eq("id", membership.user.id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    console.error("[calendar] failed to save layout:", error.message);
    return { success: false, error: "Could not save calendar colors." };
  }

  // No revalidatePath — layout is already applied optimistically on the client.
  // Refreshing /calendar can stack a Suspense/loading shell above the live grid.
  return { success: true };
}
