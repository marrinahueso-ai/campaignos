import type { SchoolSetupInput } from "@/types";
import { validateCalendarSubscribeUrl } from "@/lib/calendar-import/fetch-subscribe-feed";
import { COMMON_US_TIMEZONES } from "@/types/posting-preferences";

export function parseSchoolSetupInput(
  formData: FormData,
): { data: SchoolSetupInput } | { error: string } {
  const name = formData.get("name")?.toString().trim() ?? "";
  const timezone = formData.get("timezone")?.toString().trim() ?? "";

  if (!name) {
    return { error: "School name is required." };
  }

  if (!timezone) {
    return { error: "Select your organization timezone." };
  }

  const isKnownTimezone = (COMMON_US_TIMEZONES as readonly string[]).includes(
    timezone,
  );
  if (!isKnownTimezone) {
    return { error: "Select a valid timezone." };
  }

  const calendarSubscribeUrlRaw =
    formData.get("calendarSubscribeUrl")?.toString().trim() || null;

  let calendarSubscribeUrl: string | null = null;
  if (calendarSubscribeUrlRaw) {
    const feedValidation = validateCalendarSubscribeUrl(calendarSubscribeUrlRaw);
    if (!feedValidation.valid) {
      return { error: feedValidation.error };
    }
    calendarSubscribeUrl = feedValidation.normalized || null;
  }

  return {
    data: {
      name,
      district: formData.get("district")?.toString().trim() || null,
      schoolYear: formData.get("schoolYear")?.toString().trim() || null,
      mascot: formData.get("mascot")?.toString().trim() || null,
      principal: formData.get("principal")?.toString().trim() || null,
      schoolWebsite: formData.get("schoolWebsite")?.toString().trim() || null,
      ptoWebsite: formData.get("ptoWebsite")?.toString().trim() || null,
      timezone,
      calendarSubscribeUrl,
      primaryColor: formData.get("primaryColor")?.toString().trim() || null,
      secondaryColor: formData.get("secondaryColor")?.toString().trim() || null,
      fontFamily: formData.get("fontFamily")?.toString().trim() || null,
    },
  };
}

export function parseSchoolSetupFiles(formData: FormData) {
  const ptoLogo = formData.get("ptoLogo");
  const schoolLogo = formData.get("schoolLogo");
  const calendarFile = formData.get("calendarFile");

  return {
    ptoLogo: ptoLogo instanceof File && ptoLogo.size > 0 ? ptoLogo : null,
    schoolLogo:
      schoolLogo instanceof File && schoolLogo.size > 0 ? schoolLogo : null,
    calendarFile:
      calendarFile instanceof File && calendarFile.size > 0
        ? calendarFile
        : null,
  };
}
