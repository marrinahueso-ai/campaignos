import type { SchoolSetupInput } from "@/types";

export function parseSchoolSetupInput(
  formData: FormData,
): { data: SchoolSetupInput } | { error: string } {
  const name = formData.get("name")?.toString().trim() ?? "";

  if (!name) {
    return { error: "School name is required." };
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
