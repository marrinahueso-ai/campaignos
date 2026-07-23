"use server";

import { revalidatePath } from "next/cache";
import { resolveFoundingAccess } from "@/lib/auth/founding-access";
import {
  clearPendingFoundingAccessCookie,
  getPendingFoundingAccessCode,
} from "@/lib/auth/founding-access-server";
import { getActiveMembership } from "@/lib/auth/membership-queries";
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
  const existingMembership = await getActiveMembership();
  if (existingMembership) {
    return {
      error:
        "This account already belongs to a school workspace. Sign in to your existing workspace, or use an invite link to join another team.",
      success: false,
    };
  }

  const parsed = parseSchoolSetupInput(formData);

  if ("error" in parsed) {
    return { error: parsed.error, success: false };
  }

  const pendingCode = await getPendingFoundingAccessCode();
  const formCode = formData.get("foundingAccessCode")?.toString();
  const foundingAccess = pendingCode
    ? resolveFoundingAccess(pendingCode, { required: true })
    : resolveFoundingAccess(formCode);

  if (!foundingAccess.valid) {
    return { error: foundingAccess.error, success: false };
  }

  const files = parseSchoolSetupFiles(formData);
  const result = await createSchoolProfile(parsed.data, files, foundingAccess);

  if ("error" in result && result.error) {
    return { error: result.error, success: false };
  }

  await clearPendingFoundingAccessCookie();

  revalidatePath("/dashboard");
  revalidatePath("/settings/school-setup");
  revalidatePath("/school-setup");

  return { error: null, success: true };
}
