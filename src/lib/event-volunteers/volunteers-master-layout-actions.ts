"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeVolunteersMasterLayout,
  type VolunteersMasterLayout,
} from "@/lib/event-volunteers/volunteers-master-layout";

export async function saveVolunteersMasterLayoutAction(
  layout: VolunteersMasterLayout,
): Promise<{ success: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { success: false, error: "Not signed in." };
  }

  const normalized = normalizeVolunteersMasterLayout(layout);
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .update({ volunteers_master_layout: normalized })
    .eq("id", membership.user.id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    console.error(
      "[volunteers] failed to save master layout:",
      error.message,
    );
    return { success: false, error: "Could not save Volunteer card layout." };
  }

  revalidatePath("/volunteers");
  return { success: true };
}
