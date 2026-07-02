"use server";

import { revalidatePath } from "next/cache";
import {
  deleteTrainingDocument,
  registerTrainingDocument,
  upsertAiProfile,
} from "@/lib/organization-intelligence/mutations";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  parseAiProfileInput,
  parseTrainingDocumentDeleteInput,
  parseTrainingDocumentInput,
} from "@/lib/organization-intelligence/validation";

export interface IntelligenceActionState {
  error: string | null;
  success: boolean;
}

async function requireOrganizationId(): Promise<
  { organizationId: string } | { error: string }
> {
  const organization = await getLatestOrganization();

  if (!organization) {
    return {
      error: "Complete School Setup first to configure your AI Brain profile.",
    };
  }

  return { organizationId: organization.id };
}

export async function saveAiBrainProfileAction(
  _prevState: IntelligenceActionState,
  formData: FormData,
): Promise<IntelligenceActionState> {
  const orgResult = await requireOrganizationId();
  if ("error" in orgResult) {
    return { error: orgResult.error, success: false };
  }

  const parsed = parseAiProfileInput(formData);
  if ("error" in parsed) {
    return { error: parsed.error, success: false };
  }

  const profile = await upsertAiProfile(orgResult.organizationId, parsed.data);
  if (!profile) {
    return {
      error: "Unable to save AI Brain profile. Run migration 007 first.",
      success: false,
    };
  }

  revalidatePath("/settings/ai-brain");
  revalidatePath("/settings");

  return { error: null, success: true };
}

export async function uploadTrainingDocumentAction(
  _prevState: IntelligenceActionState,
  formData: FormData,
): Promise<IntelligenceActionState> {
  const orgResult = await requireOrganizationId();
  if ("error" in orgResult) {
    return { error: orgResult.error, success: false };
  }

  const parsed = parseTrainingDocumentInput(formData);
  if ("error" in parsed) {
    return { error: parsed.error, success: false };
  }

  const result = await registerTrainingDocument(
    orgResult.organizationId,
    parsed.data,
    parsed.file,
  );

  if (!result.document) {
    return {
      error: result.error ?? "Unable to register training document.",
      success: false,
    };
  }

  revalidatePath("/settings/ai-brain");

  return { error: null, success: true };
}

export async function deleteTrainingDocumentAction(
  documentId: string,
): Promise<IntelligenceActionState> {
  const orgResult = await requireOrganizationId();
  if ("error" in orgResult) {
    return { error: orgResult.error, success: false };
  }

  const parsed = parseTrainingDocumentDeleteInput(documentId);
  if ("error" in parsed) {
    return { error: parsed.error, success: false };
  }

  const success = await deleteTrainingDocument(
    orgResult.organizationId,
    parsed.data.documentId,
  );

  if (!success) {
    return { error: "Unable to remove training document.", success: false };
  }

  revalidatePath("/settings/ai-brain");

  return { error: null, success: true };
}
