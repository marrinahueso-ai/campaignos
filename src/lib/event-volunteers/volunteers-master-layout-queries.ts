import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  defaultVolunteersMasterLayout,
  normalizeVolunteersMasterLayout,
  type VolunteersMasterLayout,
} from "@/lib/event-volunteers/volunteers-master-layout";

export async function getVolunteersMasterLayoutForCurrentUser(): Promise<VolunteersMasterLayout> {
  const membership = await getActiveMembership();
  if (!membership) {
    return defaultVolunteersMasterLayout();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select("volunteers_master_layout")
    .eq("id", membership.user.id)
    .maybeSingle();

  if (error) {
    if (
      error.code === "42703" ||
      error.message.includes("volunteers_master_layout")
    ) {
      return defaultVolunteersMasterLayout();
    }
    console.error(
      "[volunteers] failed to load master layout:",
      error.message,
    );
    return defaultVolunteersMasterLayout();
  }

  return normalizeVolunteersMasterLayout(
    (data as { volunteers_master_layout?: unknown } | null)
      ?.volunteers_master_layout,
  );
}
