import { createClient } from "@/lib/supabase/server";
import {
  mapAiProfileRow,
  mapTrainingDocumentRow,
  toAiProfileUpsert,
} from "@/lib/organization-intelligence/mappers";
import type {
  OrganizationAiProfile,
  OrganizationAiProfileInput,
  OrganizationAiProfileRow,
  OrganizationTrainingDocument,
  OrganizationTrainingDocumentRow,
  TrainingDocumentType,
} from "@/types/organization-intelligence";

const TRAINING_LIBRARY_BUCKET = "training-library";

async function uploadTrainingFile(
  organizationId: string,
  documentId: string,
  file: File,
): Promise<string | null> {
  const supabase = await createClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${organizationId}/${documentId}/${safeName}`;

  const { error } = await supabase.storage
    .from(TRAINING_LIBRARY_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    console.error("Failed to upload training document:", error.message);
    return null;
  }

  return path;
}

export async function upsertAiProfile(
  organizationId: string,
  input: OrganizationAiProfileInput,
): Promise<OrganizationAiProfile | null> {
  const supabase = await createClient();
  const payload = toAiProfileUpsert(organizationId, input);

  const { data: existing } = await supabase
    .from("organization_ai_profile")
    .select("id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("organization_ai_profile")
      .update(payload)
      .eq("organization_id", organizationId)
      .select("*")
      .single();

    if (error || !data) {
      console.error("Failed to update AI profile:", error?.message);
      return null;
    }

    return mapAiProfileRow(data as OrganizationAiProfileRow);
  }

  const { data, error } = await supabase
    .from("organization_ai_profile")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to create AI profile:", error?.message);
    return null;
  }

  return mapAiProfileRow(data as OrganizationAiProfileRow);
}

export async function registerTrainingDocument(
  organizationId: string,
  input: {
    title: string;
    documentType: TrainingDocumentType;
    notes: string | null;
  },
  file: File,
): Promise<{ document: OrganizationTrainingDocument | null; error?: string }> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const documentId = crypto.randomUUID();

  const storagePath = await uploadTrainingFile(organizationId, documentId, file);
  const uploadStatus = storagePath ? "uploaded" : "registered";

  const { data, error } = await supabase
    .from("organization_training_documents")
    .insert({
      id: documentId,
      organization_id: organizationId,
      title: input.title,
      document_type: input.documentType,
      filename: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      storage_path: storagePath,
      upload_status: uploadStatus,
      notes: input.notes,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to register training document:", error?.message);
    return {
      document: null,
      error: "Unable to save training document metadata. Run migration 007 first.",
    };
  }

  return { document: mapTrainingDocumentRow(data as OrganizationTrainingDocumentRow) };
}

export async function deleteTrainingDocument(
  organizationId: string,
  documentId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("organization_training_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!existing) {
    return false;
  }

  if (existing.storage_path) {
    await supabase.storage
      .from(TRAINING_LIBRARY_BUCKET)
      .remove([existing.storage_path as string]);
  }

  const { error } = await supabase
    .from("organization_training_documents")
    .delete()
    .eq("id", documentId)
    .eq("organization_id", organizationId);

  if (error) {
    console.error("Failed to delete training document:", error.message);
    return false;
  }

  return true;
}
