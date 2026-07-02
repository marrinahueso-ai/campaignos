import { createClient } from "@/lib/supabase/server";
import {
  mapAiProfileRow,
  mapTrainingDocumentRow,
} from "@/lib/organization-intelligence/mappers";
import type {
  OrganizationAiProfile,
  OrganizationAiProfileRow,
  OrganizationIntelligenceData,
  OrganizationTrainingDocument,
  OrganizationTrainingDocumentRow,
} from "@/types/organization-intelligence";

export async function getAiProfileByOrganizationId(
  organizationId: string,
): Promise<OrganizationAiProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_ai_profile")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error?.code === "42P01") {
    return null;
  }

  if (error || !data) {
    return null;
  }

  return mapAiProfileRow(data as OrganizationAiProfileRow);
}

export async function getTrainingDocumentsByOrganizationId(
  organizationId: string,
): Promise<OrganizationTrainingDocument[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_training_documents")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error?.code === "42P01") {
    return [];
  }

  if (error || !data) {
    return [];
  }

  return (data as OrganizationTrainingDocumentRow[]).map(mapTrainingDocumentRow);
}

export async function getOrganizationIntelligence(
  organizationId: string,
): Promise<OrganizationIntelligenceData> {
  const [profile, trainingDocuments] = await Promise.all([
    getAiProfileByOrganizationId(organizationId),
    getTrainingDocumentsByOrganizationId(organizationId),
  ]);

  return { profile, trainingDocuments };
}

export async function getTrainingDocumentById(
  documentId: string,
  organizationId: string,
): Promise<OrganizationTrainingDocument | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_training_documents")
    .select("*")
    .eq("id", documentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapTrainingDocumentRow(data as OrganizationTrainingDocumentRow);
}
