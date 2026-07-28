"use server";

import { revalidatePath } from "next/cache";
import {
  createFileFolder,
  deleteFileFolder,
  moveCampaignFileToFolder,
  renameFileFolder,
  reorderFileFolders,
} from "@/lib/campaign-files/folder-mutations";
import { getFileFolderById } from "@/lib/campaign-files/folder-queries";
import { getCampaignFileById } from "@/lib/campaign-files/queries";
import { getEventPlaybookEvents } from "@/lib/event-playbooks/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";

function revalidateFilesPaths(eventId?: string) {
  revalidatePath("/files");
  if (eventId) {
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
  }
}

async function assertEventInActiveOrg(
  eventId: string,
): Promise<{ ok: true; organizationId: string } | { ok: false; error: string }> {
  const organization = await getLatestOrganization();
  if (!organization?.id) {
    return { ok: false, error: "No active organization." };
  }

  const orgEvents = await getEventPlaybookEvents(organization.id);
  if (!orgEvents.some((event) => event.id === eventId)) {
    return { ok: false, error: "Event not found." };
  }

  return { ok: true, organizationId: organization.id };
}

async function assertFolderInEvent(
  folderId: string,
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const folder = await getFileFolderById(folderId);
  if (!folder) {
    return { ok: false, error: "Folder not found." };
  }

  if (folder.eventId !== eventId) {
    return { ok: false, error: "Folder not found." };
  }

  const check = await assertEventInActiveOrg(eventId);
  if (!check.ok) {
    return check;
  }

  if (folder.organizationId !== check.organizationId) {
    return { ok: false, error: "Folder not found." };
  }

  return { ok: true };
}

export async function createFileFolderAction(
  eventId: string,
  name: string,
): Promise<{ success: boolean; folderId: string | null; error: string | null }> {
  const check = await assertEventInActiveOrg(eventId);
  if (!check.ok) {
    return { success: false, folderId: null, error: check.error };
  }

  const result = await createFileFolder({
    eventId,
    organizationId: check.organizationId,
    name,
  });

  if (!result.id) {
    return { success: false, folderId: null, error: result.error };
  }

  revalidateFilesPaths(eventId);
  return { success: true, folderId: result.id, error: null };
}

export async function renameFileFolderAction(
  eventId: string,
  folderId: string,
  name: string,
): Promise<{ success: boolean; error: string | null }> {
  const check = await assertFolderInEvent(folderId, eventId);
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const result = await renameFileFolder(folderId, name);
  if (!result.success) {
    return result;
  }

  revalidateFilesPaths(eventId);
  return { success: true, error: null };
}

export async function deleteFileFolderAction(
  eventId: string,
  folderId: string,
): Promise<{ success: boolean; error: string | null }> {
  const check = await assertFolderInEvent(folderId, eventId);
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const result = await deleteFileFolder(folderId);
  if (!result.success) {
    return result;
  }

  revalidateFilesPaths(eventId);
  return { success: true, error: null };
}

export async function reorderFileFoldersAction(
  eventId: string,
  orderedFolderIds: string[],
): Promise<{ success: boolean; error: string | null }> {
  const check = await assertEventInActiveOrg(eventId);
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const result = await reorderFileFolders({ eventId, orderedFolderIds });
  if (!result.success) {
    return result;
  }

  revalidateFilesPaths(eventId);
  return { success: true, error: null };
}

export async function moveCampaignFileToFolderAction(
  fileId: string,
  folderId: string | null,
): Promise<{ success: boolean; error: string | null }> {
  const file = await getCampaignFileById(fileId);
  if (!file) {
    return { success: false, error: "File not found." };
  }

  if (folderId) {
    const check = await assertFolderInEvent(folderId, file.eventId);
    if (!check.ok) {
      return { success: false, error: check.error };
    }
  }

  const result = await moveCampaignFileToFolder(fileId, folderId);
  if (!result.success) {
    return result;
  }

  revalidateFilesPaths(file.eventId);
  return { success: true, error: null };
}
