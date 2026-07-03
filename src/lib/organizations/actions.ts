"use server";

import { revalidatePath } from "next/cache";
import { resolveFoundingAccess } from "@/lib/auth/founding-access";
import { createSchoolProfile } from "@/lib/organizations/mutations";
import {
  parseSchoolSetupFiles,
  parseSchoolSetupInput,
} from "@/lib/organizations/validation";

export interface SchoolSetupFormState {
  error: string | null;
  success: boolean;
}

export async function completeSchoolSetup(
  _prevState: SchoolSetupFormState,
  formData: FormData,
): Promise<SchoolSetupFormState> {
  const parsed = parseSchoolSetupInput(formData);

  if ("error" in parsed) {
    return { error: parsed.error, success: false };
  }

  const foundingAccess = resolveFoundingAccess(
    formData.get("foundingAccessCode")?.toString(),
  );

  if (!foundingAccess.valid) {
    return { error: foundingAccess.error, success: false };
  }

  const files = parseSchoolSetupFiles(formData);
  const result = await createSchoolProfile(parsed.data, files, foundingAccess);

  if ("error" in result && result.error) {
    return { error: result.error, success: false };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings/school-setup");
  revalidatePath("/school-setup");

  return { error: null, success: true };
}
