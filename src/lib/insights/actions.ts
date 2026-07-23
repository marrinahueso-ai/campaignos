"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { syncOrganizationInsights } from "@/lib/meta/insights-sync";

export async function syncInsightsAction(input?: {
  since?: string;
  until?: string;
}): Promise<{
  ok: boolean;
  postsSynced: number;
  daysSynced: number;
  error: string | null;
  warnings: string[];
}> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return {
      ok: false,
      postsSynced: 0,
      daysSynced: 0,
      error: "Organization not found.",
      warnings: [],
    };
  }

  const result = await syncOrganizationInsights({
    organizationId: organization.id,
    since: input?.since,
    until: input?.until,
  });

  revalidatePath("/insights");
  revalidatePath("/events", "layout");

  return result;
}
