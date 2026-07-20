"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  disconnectGoogleCalendarConnection,
  getGoogleCalendarConnectionForCurrentOrg,
  isGoogleCalendarConnectionConfigured,
} from "@/lib/google-calendar/connection";
import { isGoogleCalendarIntegrationConfigured } from "@/lib/google-calendar/config";
import { syncSchoolYearGoogleCalendar } from "@/lib/google-calendar/sync";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getActiveSchoolYear } from "@/lib/school-years/queries";

export type GoogleCalendarActionResult = {
  success: boolean;
  error?: string | null;
  importId?: string | null;
  added?: number;
  skipped?: number;
};

export async function disconnectGoogleCalendarAction(): Promise<GoogleCalendarActionResult> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return { success: false, error: "No organization found." };
  }

  const ok = await disconnectGoogleCalendarConnection(organization.id);
  if (!ok) {
    return { success: false, error: "Could not disconnect Google Calendar." };
  }

  revalidatePath("/settings/integrations");
  revalidatePath("/settings/integrations/calendar");
  return { success: true };
}

export async function syncGoogleCalendarAction(): Promise<GoogleCalendarActionResult> {
  if (!isGoogleCalendarIntegrationConfigured()) {
    return {
      success: false,
      error: "Google Calendar is not configured on this server yet.",
    };
  }

  const organization = await getLatestOrganization();
  if (!organization) {
    return { success: false, error: "No organization found." };
  }

  const connection = await getGoogleCalendarConnectionForCurrentOrg();
  if (!isGoogleCalendarConnectionConfigured(connection)) {
    return { success: false, error: "Connect Google Calendar first." };
  }

  const schoolYear = await getActiveSchoolYear(organization.id);
  if (!schoolYear) {
    return {
      success: false,
      error: "Set an active school year before syncing Google Calendar.",
    };
  }

  const result = await syncSchoolYearGoogleCalendar({
    organizationId: organization.id,
    organizationSchoolYear: organization.schoolYear ?? null,
    schoolYear,
    connection,
    autoImport: false,
  });

  revalidatePath("/settings/integrations/calendar");
  revalidatePath("/calendar");
  revalidatePath("/calendar/review");
  revalidatePath("/calendar/import");
  revalidatePath("/dashboard");
  revalidatePath("/events");

  if (!result.success) {
    return { success: false, error: result.error };
  }

  if (result.importId && result.added > 0) {
    redirect(`/calendar/review?import=${result.importId}`);
  }

  return {
    success: true,
    importId: result.importId,
    added: result.added,
    skipped: result.skipped,
  };
}
