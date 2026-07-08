"use server";

import { revalidatePath } from "next/cache";
import {
  ALLOWED_CAMPAIGN_FILE_EXTENSIONS,
  MAX_CAMPAIGN_FILE_BYTES,
} from "@/lib/campaign-files/constants";
import {
  deleteCampaignFile,
  updateCampaignFile,
  uploadCampaignFile,
} from "@/lib/campaign-files/mutations";
import { isAllowedCampaignFile } from "@/lib/campaign-files/storage";
import { getEventById } from "@/lib/events/queries";
import { getAuthUser } from "@/lib/auth/queries";
import type {
  CampaignFileCategory,
  CampaignFilePlatform,
} from "@/types/campaign-files";

function revalidateFilesPaths(eventId: string) {
  revalidatePath("/files");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
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

export async function uploadCampaignFileAction(
  formData: FormData,
): Promise<{ success: boolean; error: string | null }> {
  const eventId = String(formData.get("eventId") ?? "").trim();
  const category = String(formData.get("category") ?? "other").trim() as CampaignFileCategory;
  const platformsRaw = String(formData.get("platforms") ?? "");
  const file = formData.get("file");

  if (!eventId) {
    return { success: false, error: "Select an event before uploading." };
  }

  const event = await getEventById(eventId);
  if (!event) {
    return { success: false, error: "Selected event was not found." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a file to upload." };
  }

  if (file.size > MAX_CAMPAIGN_FILE_BYTES) {
    return { success: false, error: "File must be 25 MB or smaller." };
  }

  if (!isAllowedCampaignFile(file)) {
    const allowed = Array.from(ALLOWED_CAMPAIGN_FILE_EXTENSIONS).join(", ");
    return {
      success: false,
      error: `Upload PDF, Word, Excel, PNG, or JPG files only (${allowed}).`,
    };
  }

  const platforms = platformsRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as CampaignFilePlatform[];

  const authUser = await getAuthUser();
  const result = await uploadCampaignFile({
    eventId,
    file,
    category,
    platforms,
    uploaderName: resolveUploaderName(authUser),
  });

  if (!result.id) {
    return { success: false, error: result.error ?? "Unable to upload file." };
  }

  revalidateFilesPaths(eventId);
  return { success: true, error: null };
}

export async function updateCampaignFileAction(
  fileId: string,
  eventId: string,
  input: {
    name?: string;
    category?: CampaignFileCategory;
    platforms?: CampaignFilePlatform[];
    status?: "active" | "pending" | "archived";
  },
): Promise<{ success: boolean; error: string | null }> {
  const trimmedName = input.name?.trim();
  if (input.name !== undefined && !trimmedName) {
    return { success: false, error: "File name is required." };
  }

  const success = await updateCampaignFile(fileId, {
    ...input,
    name: trimmedName,
  });

  if (!success) {
    return { success: false, error: "Unable to update file." };
  }

  revalidateFilesPaths(eventId);
  return { success: true, error: null };
}

export async function deleteCampaignFileAction(
  fileId: string,
  eventId: string,
): Promise<{ success: boolean; error: string | null }> {
  const success = await deleteCampaignFile(fileId);

  if (!success) {
    return { success: false, error: "Unable to remove file." };
  }

  revalidateFilesPaths(eventId);
  return { success: true, error: null };
}
