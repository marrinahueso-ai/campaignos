import { createClient } from "@/lib/supabase/server";
import { getLatestOrganization } from "@/lib/organizations/queries";
import type {
  OrganizationPostingPreferences,
  PostingPreferencesInput,
  PreferredPostingWindow,
} from "@/types/posting-preferences";

export const COMMON_US_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

export function windowsFromInput(input: PostingPreferencesInput): PreferredPostingWindow[] | null {
  if (!input.useCustomWindows) {
    return null;
  }

  return [
    {
      daysOfWeek: input.daysOfWeek,
      startHour: input.startHour,
      endHour: input.endHour,
    },
  ];
}

export function inputFromPreferences(
  prefs: OrganizationPostingPreferences,
): PostingPreferencesInput {
  const windows = prefs.preferredPostingHours;
  const first = windows?.[0];

  return {
    timezone: prefs.timezone,
    useCustomWindows: Boolean(windows && windows.length > 0),
    startHour: first?.startHour ?? 17,
    endHour: first?.endHour ?? 20,
    daysOfWeek: first?.daysOfWeek ?? [1, 2, 3, 4, 5],
  };
}

export async function getOrganizationPostingPreferences(): Promise<OrganizationPostingPreferences | null> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return null;
  }

  return {
    timezone: organization.timezone,
    preferredPostingHours: organization.preferredPostingHours,
  };
}

export async function updateOrganizationPostingPreferences(
  organizationId: string,
  prefs: OrganizationPostingPreferences,
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("organizations")
    .update({
      timezone: prefs.timezone,
      preferred_posting_hours: prefs.preferredPostingHours,
    })
    .eq("id", organizationId);

  if (error) {
    console.error("Failed to update posting preferences:", error.message);
    return false;
  }

  return true;
}
