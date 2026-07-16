"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getAuthUser } from "@/lib/auth/queries";
import { MAX_VENDOR_DOCUMENT_BYTES, MAX_VENDOR_LOGO_BYTES } from "@/lib/vendors/constants";
import {
  addVendorNote,
  archiveVendor,
  assignVendorToEvent,
  createVendor,
  getVendorDocumentSignedUrl,
  getVendorRowById,
  removeVendorFromEvent,
  setVendorFavorite,
  updateVendor,
  uploadVendorDocument,
  uploadVendorLogo,
} from "@/lib/vendors/mutations";
import { canManageVendors, canWriteVendors } from "@/lib/vendors/permissions";
import type {
  CreateVendorInput,
  UpdateVendorInput,
  VendorAssignmentStatus,
  VendorDocumentType,
  VendorStatus,
} from "@/types/vendors";

function revalidateVendorPaths(vendorId?: string, eventId?: string | null) {
  revalidatePath("/vendors");
  if (vendorId) {
    revalidatePath(`/vendors/${vendorId}`);
  }
  if (eventId) {
    revalidatePath(`/events/${eventId}`);
  }
}

function resolveUploaderName(
  authUser: Awaited<ReturnType<typeof getAuthUser>>,
): string {
  if (authUser?.displayName?.trim()) {
    return authUser.displayName.trim();
  }
  if (authUser?.email) {
    return authUser.email.split("@")[0] ?? "You";
  }
  return "You";
}

async function requireWritableOrg(): Promise<
  { organizationId: string } | { error: string }
> {
  const organization = await getCurrentOrganization();
  const role = await getCurrentCampaignRole();

  if (!organization) {
    return { error: "Complete School Setup before managing vendors." };
  }

  if (!canWriteVendors(role)) {
    return { error: "You do not have permission to modify vendors." };
  }

  return { organizationId: organization.id };
}

export async function createVendorAction(
  input: CreateVendorInput,
): Promise<{
  success: boolean;
  vendorId: string | null;
  error: string | null;
  existingVendorId?: string | null;
}> {
  const access = await requireWritableOrg();
  if ("error" in access) {
    return { success: false, vendorId: null, error: access.error };
  }

  if (!input.name?.trim()) {
    return { success: false, vendorId: null, error: "Vendor name is required." };
  }

  const result = await createVendor(access.organizationId, input);
  if (!result.id) {
    return {
      success: false,
      vendorId: null,
      error: result.error,
      existingVendorId: result.existingVendorId ?? null,
    };
  }

  revalidateVendorPaths(result.id, input.eventId);
  return { success: true, vendorId: result.id, error: result.error };
}

export async function updateVendorAction(
  vendorId: string,
  input: UpdateVendorInput,
): Promise<{ success: boolean; error: string | null }> {
  const access = await requireWritableOrg();
  if ("error" in access) {
    return { success: false, error: access.error };
  }

  const vendor = await getVendorRowById(vendorId);
  if (!vendor || vendor.organizationId !== access.organizationId) {
    return { success: false, error: "Vendor not found." };
  }

  const result = await updateVendor(vendorId, access.organizationId, input);
  if (result.success) {
    revalidateVendorPaths(vendorId);
  }

  return result;
}

export async function toggleVendorFavoriteAction(
  vendorId: string,
  isFavorite: boolean,
): Promise<{ success: boolean; error: string | null }> {
  const access = await requireWritableOrg();
  if ("error" in access) {
    return { success: false, error: access.error };
  }

  const vendor = await getVendorRowById(vendorId);
  if (!vendor || vendor.organizationId !== access.organizationId) {
    return { success: false, error: "Vendor not found." };
  }

  const success = await setVendorFavorite(vendorId, access.organizationId, isFavorite);
  if (success) {
    revalidateVendorPaths(vendorId);
  }

  return {
    success,
    error: success ? null : "Unable to update favorite status.",
  };
}

export async function archiveVendorAction(
  vendorId: string,
): Promise<{ success: boolean; error: string | null }> {
  const organization = await getCurrentOrganization();
  const role = await getCurrentCampaignRole();

  if (!organization) {
    return { success: false, error: "Complete School Setup before managing vendors." };
  }

  if (!canManageVendors(role)) {
    return { success: false, error: "Only admins can archive vendors." };
  }

  const vendor = await getVendorRowById(vendorId);
  if (!vendor || vendor.organizationId !== organization.id) {
    return { success: false, error: "Vendor not found." };
  }

  const success = await archiveVendor(vendorId, organization.id);
  if (success) {
    revalidateVendorPaths(vendorId);
  }

  return { success, error: success ? null : "Unable to archive vendor." };
}

export async function assignVendorToEventAction(
  vendorId: string,
  eventId: string,
  assignmentStatus: VendorAssignmentStatus = "pending",
): Promise<{ success: boolean; error: string | null }> {
  const access = await requireWritableOrg();
  if ("error" in access) {
    return { success: false, error: access.error };
  }

  const vendor = await getVendorRowById(vendorId);
  if (!vendor || vendor.organizationId !== access.organizationId) {
    return { success: false, error: "Vendor not found." };
  }

  const result = await assignVendorToEvent(
    access.organizationId,
    vendorId,
    eventId,
    assignmentStatus,
  );

  if (result.success) {
    revalidateVendorPaths(vendorId, eventId);
  }

  return { success: result.success, error: result.error };
}

export async function removeVendorFromEventAction(
  assignmentId: string,
  eventId: string,
): Promise<{ success: boolean; error: string | null }> {
  const access = await requireWritableOrg();
  if ("error" in access) {
    return { success: false, error: access.error };
  }

  const success = await removeVendorFromEvent(assignmentId, access.organizationId);
  if (success) {
    revalidateVendorPaths(undefined, eventId);
    revalidatePath("/vendors");
  }

  return { success, error: success ? null : "Unable to remove vendor from event." };
}

export async function addVendorNoteAction(
  vendorId: string,
  content: string,
): Promise<{ success: boolean; error: string | null }> {
  const access = await requireWritableOrg();
  if ("error" in access) {
    return { success: false, error: access.error };
  }

  if (!content.trim()) {
    return { success: false, error: "Note cannot be empty." };
  }

  const vendor = await getVendorRowById(vendorId);
  if (!vendor || vendor.organizationId !== access.organizationId) {
    return { success: false, error: "Vendor not found." };
  }

  const success = await addVendorNote(access.organizationId, vendorId, content);
  if (success) {
    revalidateVendorPaths(vendorId);
  }

  return { success, error: success ? null : "Unable to save note." };
}

export async function updateVendorStatusAction(
  vendorId: string,
  status: VendorStatus,
): Promise<{ success: boolean; error: string | null }> {
  return updateVendorAction(vendorId, { status });
}

export async function uploadVendorDocumentAction(
  formData: FormData,
): Promise<{ success: boolean; error: string | null; downloadUrl?: string | null }> {
  const access = await requireWritableOrg();
  if ("error" in access) {
    return { success: false, error: access.error };
  }

  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "").trim() || null;
  const documentType = String(formData.get("documentType") ?? "other").trim() as VendorDocumentType;
  const file = formData.get("file");

  if (!vendorId) {
    return { success: false, error: "Vendor is required." };
  }

  const vendor = await getVendorRowById(vendorId);
  if (!vendor || vendor.organizationId !== access.organizationId) {
    return { success: false, error: "Vendor not found." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a file to upload." };
  }

  if (file.size > MAX_VENDOR_DOCUMENT_BYTES) {
    return { success: false, error: "File must be 25 MB or smaller." };
  }

  const authUser = await getAuthUser();
  const result = await uploadVendorDocument({
    organizationId: access.organizationId,
    vendorId,
    eventId,
    file,
    documentType,
    uploadedByName: resolveUploaderName(authUser),
  });

  if (!result.id) {
    return { success: false, error: result.error };
  }

  revalidateVendorPaths(vendorId, eventId);
  return { success: true, error: null };
}

export async function uploadVendorLogoAction(
  formData: FormData,
): Promise<{ success: boolean; error: string | null }> {
  const access = await requireWritableOrg();
  if ("error" in access) {
    return { success: false, error: access.error };
  }

  const vendorId = String(formData.get("vendorId") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "").trim() || null;
  const file = formData.get("file");

  if (!vendorId) {
    return { success: false, error: "Vendor is required." };
  }

  const vendor = await getVendorRowById(vendorId);
  if (!vendor || vendor.organizationId !== access.organizationId) {
    return { success: false, error: "Vendor not found." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a logo image to upload." };
  }

  if (file.size > MAX_VENDOR_LOGO_BYTES) {
    return { success: false, error: "Logo must be 5 MB or smaller." };
  }

  const result = await uploadVendorLogo({
    organizationId: access.organizationId,
    vendorId,
    file,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateVendorPaths(vendorId, eventId);
  return { success: true, error: null };
}

export async function downloadVendorDocumentAction(
  documentId: string,
): Promise<{ success: boolean; url: string | null; error: string | null }> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { success: false, url: null, error: "Organization not found." };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_documents")
    .select("storage_path, organization_id")
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data || data.organization_id !== organization.id) {
    return { success: false, url: null, error: "Document not found." };
  }

  const url = await getVendorDocumentSignedUrl(data.storage_path as string);
  if (!url) {
    return { success: false, url: null, error: "Unable to generate download link." };
  }

  return { success: true, url, error: null };
}
