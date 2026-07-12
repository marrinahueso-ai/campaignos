import "server-only";

import { getAuthUser } from "@/lib/auth/queries";
import { isDuplicateKeyError } from "@/lib/creative-assets/schema-errors";
import {
  findVendorDuplicates,
  formatDuplicateWarning,
} from "@/lib/vendors/dedup";
import { mapVendorRow } from "@/lib/vendors/mappers";
import {
  buildVendorDocumentStoragePath,
  isAllowedVendorDocument,
  VENDOR_DOCUMENTS_BUCKET,
} from "@/lib/vendors/storage";
import { getAllOrgVendorsForDedup } from "@/lib/vendors/queries";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateVendorInput,
  UpdateVendorInput,
  VendorAssignmentStatus,
  VendorDocumentType,
  VendorRow,
} from "@/types/vendors";

async function resolveActorName(): Promise<string> {
  const authUser = await getAuthUser();
  if (authUser?.displayName?.trim()) {
    return authUser.displayName.trim();
  }
  if (authUser?.email) {
    return authUser.email.split("@")[0] ?? "You";
  }
  return "You";
}

export async function logVendorActivity(
  organizationId: string,
  vendorId: string,
  action: string,
  details?: string | null,
  eventId?: string | null,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("vendor_activity_logs").insert({
    organization_id: organizationId,
    vendor_id: vendorId,
    event_id: eventId ?? null,
    action,
    details: details ?? null,
    actor_name: await resolveActorName(),
  });
}

export async function createVendor(
  organizationId: string,
  input: CreateVendorInput,
): Promise<{ id: string | null; error: string | null }> {
  const existing = await getAllOrgVendorsForDedup(organizationId);
  const duplicates = findVendorDuplicates(existing, {
    name: input.name,
    email: input.email,
    phone: input.phone,
    website: input.website,
  });

  if (duplicates.length) {
    return { id: null, error: formatDuplicateWarning(duplicates) };
  }

  const supabase = await createClient();
  const authUser = await getAuthUser();

  const { data, error } = await supabase
    .from("vendors")
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      website: input.website?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      address_line1: input.addressLine1?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      postal_code: input.postalCode?.trim() || null,
      category_id: input.categoryId || null,
      status: input.status ?? "active",
      notes_summary: input.notes?.trim() || null,
      created_by_user_id: authUser?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create vendor:", error?.message);
    return { id: null, error: "Unable to create vendor." };
  }

  const vendorId = data.id as string;

  if (input.contactName?.trim()) {
    await supabase.from("vendor_contacts").insert({
      organization_id: organizationId,
      vendor_id: vendorId,
      name: input.contactName.trim(),
      title: input.contactTitle?.trim() || null,
      email: input.contactEmail?.trim() || input.email?.trim() || null,
      phone: input.contactPhone?.trim() || input.phone?.trim() || null,
      is_primary: true,
    });
  }

  if (input.notes?.trim()) {
    await supabase.from("vendor_notes").insert({
      organization_id: organizationId,
      vendor_id: vendorId,
      content: input.notes.trim(),
      created_by_name: await resolveActorName(),
    });
  }

  if (input.eventId) {
    const assignmentResult = await assignVendorToEvent(
      organizationId,
      vendorId,
      input.eventId,
      input.assignmentStatus ?? "pending",
    );
    if (!assignmentResult.success) {
      return { id: vendorId, error: assignmentResult.error };
    }
  }

  await logVendorActivity(organizationId, vendorId, "created", `Created vendor "${input.name.trim()}"`);

  return { id: vendorId, error: null };
}

export async function updateVendor(
  vendorId: string,
  organizationId: string,
  input: UpdateVendorInput,
): Promise<{ success: boolean; error: string | null }> {
  if (input.name) {
    const existing = await getAllOrgVendorsForDedup(organizationId);
    const duplicates = findVendorDuplicates(existing, {
      name: input.name,
      email: input.email,
      phone: input.phone,
      website: input.website,
      excludeVendorId: vendorId,
    });

    if (duplicates.length) {
      return { success: false, error: formatDuplicateWarning(duplicates) };
    }
  }

  const supabase = await createClient();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.website !== undefined) updates.website = input.website?.trim() || null;
  if (input.email !== undefined) updates.email = input.email?.trim() || null;
  if (input.phone !== undefined) updates.phone = input.phone?.trim() || null;
  if (input.addressLine1 !== undefined) {
    updates.address_line1 = input.addressLine1?.trim() || null;
  }
  if (input.addressLine2 !== undefined) {
    updates.address_line2 = input.addressLine2?.trim() || null;
  }
  if (input.city !== undefined) updates.city = input.city?.trim() || null;
  if (input.state !== undefined) updates.state = input.state?.trim() || null;
  if (input.postalCode !== undefined) {
    updates.postal_code = input.postalCode?.trim() || null;
  }
  if (input.categoryId !== undefined) updates.category_id = input.categoryId || null;
  if (input.status !== undefined) updates.status = input.status;
  if (input.notesSummary !== undefined) {
    updates.notes_summary = input.notesSummary?.trim() || null;
  }

  const { error } = await supabase
    .from("vendors")
    .update(updates)
    .eq("id", vendorId)
    .eq("organization_id", organizationId);

  if (error) {
    console.error("Failed to update vendor:", error.message);
    return { success: false, error: "Unable to update vendor." };
  }

  await logVendorActivity(organizationId, vendorId, "updated", "Vendor details updated");
  return { success: true, error: null };
}

export async function setVendorFavorite(
  vendorId: string,
  organizationId: string,
  isFavorite: boolean,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("vendors")
    .update({
      is_favorite: isFavorite,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vendorId)
    .eq("organization_id", organizationId);

  if (!error) {
    await logVendorActivity(
      organizationId,
      vendorId,
      isFavorite ? "favorited" : "unfavorited",
      isFavorite ? "Marked as favorite" : "Removed from favorites",
    );
  }

  return !error;
}

export async function archiveVendor(
  vendorId: string,
  organizationId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("vendors")
    .update({
      status: "archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", vendorId)
    .eq("organization_id", organizationId);

  if (!error) {
    await logVendorActivity(organizationId, vendorId, "archived", "Vendor archived");
  }

  return !error;
}

export async function assignVendorToEvent(
  organizationId: string,
  vendorId: string,
  eventId: string,
  assignmentStatus: VendorAssignmentStatus = "pending",
): Promise<{ success: boolean; error: string | null; assignmentId?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_event_assignments")
    .insert({
      organization_id: organizationId,
      vendor_id: vendorId,
      event_id: eventId,
      assignment_status: assignmentStatus,
    })
    .select("id")
    .single();

  if (error) {
    if (isDuplicateKeyError(error)) {
      const { data: existing } = await supabase
        .from("vendor_event_assignments")
        .select("id")
        .eq("vendor_id", vendorId)
        .eq("event_id", eventId)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("vendor_event_assignments")
          .update({
            deleted_at: null,
            assignment_status: assignmentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        await logVendorActivity(
          organizationId,
          vendorId,
          "linked_event",
          "Re-linked vendor to event",
          eventId,
        );

        return { success: true, error: null, assignmentId: existing.id as string };
      }
    }

    console.error("Failed to assign vendor to event:", error.message);
    return { success: false, error: "Unable to link vendor to event." };
  }

  await logVendorActivity(
    organizationId,
    vendorId,
    "linked_event",
    "Linked vendor to event",
    eventId,
  );

  return { success: true, error: null, assignmentId: data.id as string };
}

export async function removeVendorFromEvent(
  assignmentId: string,
  organizationId: string,
): Promise<boolean> {
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("vendor_event_assignments")
    .select("vendor_id, event_id")
    .eq("id", assignmentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const { error } = await supabase
    .from("vendor_event_assignments")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("organization_id", organizationId);

  if (!error && assignment) {
    await logVendorActivity(
      organizationId,
      assignment.vendor_id as string,
      "unlinked_event",
      "Removed vendor from event",
      assignment.event_id as string,
    );
  }

  return !error;
}

export async function addVendorNote(
  organizationId: string,
  vendorId: string,
  content: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_notes").insert({
    organization_id: organizationId,
    vendor_id: vendorId,
    content: content.trim(),
    created_by_name: await resolveActorName(),
  });

  if (!error) {
    await supabase
      .from("vendors")
      .update({
        notes_summary: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", vendorId);

    await logVendorActivity(organizationId, vendorId, "note_added", "Added vendor note");
  }

  return !error;
}

export async function uploadVendorDocument(input: {
  organizationId: string;
  vendorId: string;
  eventId?: string | null;
  file: File;
  documentType: VendorDocumentType;
  uploadedByName: string | null;
}): Promise<{ id: string | null; error: string | null }> {
  if (!isAllowedVendorDocument(input.file)) {
    return { id: null, error: "Upload PDF, Word, Excel, PNG, or JPG files only." };
  }

  const supabase = await createClient();
  const storagePath = buildVendorDocumentStoragePath(
    input.organizationId,
    input.vendorId,
    input.file.name,
    input.eventId,
  );
  const buffer = Buffer.from(await input.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(VENDOR_DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload vendor document:", uploadError.message);
    return { id: null, error: "Unable to upload document." };
  }

  const { data, error } = await supabase
    .from("vendor_documents")
    .insert({
      organization_id: input.organizationId,
      vendor_id: input.vendorId,
      event_id: input.eventId ?? null,
      document_type: input.documentType,
      name: input.file.name,
      storage_path: storagePath,
      mime_type: input.file.type || null,
      size_bytes: input.file.size,
      uploaded_by_name: input.uploadedByName,
    })
    .select("id")
    .single();

  if (error || !data) {
    await supabase.storage.from(VENDOR_DOCUMENTS_BUCKET).remove([storagePath]);
    return { id: null, error: "Unable to save document record." };
  }

  await logVendorActivity(
    input.organizationId,
    input.vendorId,
    "document_uploaded",
    `Uploaded "${input.file.name}"`,
    input.eventId,
  );

  return { id: data.id as string, error: null };
}

export async function getVendorDocumentSignedUrl(
  storagePath: string,
  expiresIn = 3600,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(VENDOR_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("Failed to create signed URL:", error?.message);
    return null;
  }

  return data.signedUrl;
}

export async function getVendorRowById(
  vendorId: string,
): Promise<import("@/types/vendors").Vendor | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return mapVendorRow(data as VendorRow);
}
