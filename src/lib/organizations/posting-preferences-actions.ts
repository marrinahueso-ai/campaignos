"use server";

import { revalidatePath } from "next/cache";
import {
  inputFromPreferences,
  updateOrganizationPostingPreferences,
  windowsFromInput,
} from "@/lib/organizations/posting-preferences";
import { getLatestOrganization } from "@/lib/organizations/queries";
import type {
  OrganizationPostingPreferences,
  PostingPreferencesInput,
} from "@/types/posting-preferences";

export interface PostingPreferencesActionState {
  error: string | null;
  success: boolean;
}

export async function getPostingPreferencesSettingsData(): Promise<{
  organizationId: string;
  preferences: OrganizationPostingPreferences;
  input: PostingPreferencesInput;
} | null> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return null;
  }

  const preferences: OrganizationPostingPreferences = {
    timezone: organization.timezone,
    preferredPostingHours: organization.preferredPostingHours,
  };

  return {
    organizationId: organization.id,
    preferences,
    input: inputFromPreferences(preferences),
  };
}

export async function savePostingPreferencesAction(
  _prevState: PostingPreferencesActionState,
  formData: FormData,
): Promise<PostingPreferencesActionState> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return { error: "Complete School Setup first.", success: false };
  }

  const timezone = String(formData.get("timezone") ?? "").trim();
  if (!timezone) {
    return { error: "Choose a timezone.", success: false };
  }

  const useCustomWindows = formData.get("useCustomWindows") === "on";
  const startHour = Number(formData.get("startHour"));
  const endHour = Number(formData.get("endHour"));
  const daysRaw = formData.getAll("daysOfWeek").map((value) => Number(value));

  if (useCustomWindows) {
    if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
      return { error: "Start hour must be between 0 and 23.", success: false };
    }
    if (!Number.isInteger(endHour) || endHour < 0 || endHour > 23) {
      return { error: "End hour must be between 0 and 23.", success: false };
    }
    if (endHour < startHour) {
      return { error: "End hour must be after start hour.", success: false };
    }
    if (daysRaw.length === 0) {
      return { error: "Select at least one day for preferred posting times.", success: false };
    }
  }

  const input: PostingPreferencesInput = {
    timezone,
    useCustomWindows,
    startHour: Number.isInteger(startHour) ? startHour : 17,
    endHour: Number.isInteger(endHour) ? endHour : 20,
    daysOfWeek: daysRaw.filter((day) => day >= 0 && day <= 6),
  };

  const saved = await updateOrganizationPostingPreferences(organization.id, {
    timezone,
    preferredPostingHours: windowsFromInput(input),
  });

  if (!saved) {
    return {
      error: "Unable to save posting preferences. Run migration 035 first.",
      success: false,
    };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/posting-schedule");
  revalidatePath("/calendar");

  return { error: null, success: true };
}
