import "server-only";

import { randomUUID } from "node:crypto";
import { getAuthUser } from "@/lib/auth/queries";
import {
  ORGANIZATION_STICKER_MAX_BYTES,
  ORGANIZATION_STICKER_MAX_COUNT,
  ORGANIZATION_STICKERS_BUCKET,
  buildOrganizationStickerStoragePath,
  isOrganizationStickerMimeType,
} from "@/lib/inbox/sticker-constants";
import { createClient } from "@/lib/supabase/server";
import type {
  OrganizationSticker,
  OrganizationStickerRow,
} from "@/types/organization-stickers";

export function mapOrganizationStickerRow(
  row: OrganizationStickerRow,
): OrganizationSticker {
  return {
    id: row.id,
    organizationId: row.organization_id,
    label: row.label,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeStickerLabel(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "Sticker";
  const withoutExt = base.replace(/\.[^.]+$/, "").trim();
  const cleaned = withoutExt.replace(/[^\w\s.-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 48) || "Sticker";
}

export async function listOrganizationStickers(
  organizationId: string,
): Promise<OrganizationSticker[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_stickers")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error?.code === "42P01") {
    return [];
  }

  if (error) {
    console.error(
      `Failed to load organization stickers for org ${organizationId}:`,
      error.message,
    );
    return [];
  }

  return ((data ?? []) as OrganizationStickerRow[]).map(mapOrganizationStickerRow);
}

export async function getOrganizationStickerById(input: {
  organizationId: string;
  stickerId: string;
}): Promise<OrganizationSticker | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_stickers")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.stickerId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapOrganizationStickerRow(data as OrganizationStickerRow);
}

export async function uploadOrganizationSticker(input: {
  organizationId: string;
  file: File;
}): Promise<{ sticker: OrganizationSticker | null; error: string | null }> {
  const mimeType = input.file.type || "";
  if (!isOrganizationStickerMimeType(mimeType)) {
    return {
      sticker: null,
      error: "Upload PNG, WebP, GIF, or JPEG stickers only.",
    };
  }

  if (input.file.size <= 0 || input.file.size > ORGANIZATION_STICKER_MAX_BYTES) {
    return {
      sticker: null,
      error: "Stickers must be 2 MB or smaller.",
    };
  }

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("organization_stickers")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId);

  if (countError && countError.code !== "42P01") {
    return { sticker: null, error: "Could not check sticker library." };
  }

  if ((count ?? 0) >= ORGANIZATION_STICKER_MAX_COUNT) {
    return {
      sticker: null,
      error: `This organization already has ${ORGANIZATION_STICKER_MAX_COUNT} stickers. Delete one to add another.`,
    };
  }

  const user = await getAuthUser();
  const stickerId = randomUUID();
  const storagePath = buildOrganizationStickerStoragePath({
    organizationId: input.organizationId,
    stickerId,
    mimeType,
  });
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const label = sanitizeStickerLabel(input.file.name);
  const now = new Date().toISOString();

  const { error: uploadError } = await supabase.storage
    .from(ORGANIZATION_STICKERS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload organization sticker:", uploadError.message);
    return { sticker: null, error: "Unable to upload sticker." };
  }

  const { data: publicData } = supabase.storage
    .from(ORGANIZATION_STICKERS_BUCKET)
    .getPublicUrl(storagePath);
  const publicUrl = publicData.publicUrl;

  const { data, error } = await supabase
    .from("organization_stickers")
    .insert({
      id: stickerId,
      organization_id: input.organizationId,
      label,
      storage_path: storagePath,
      public_url: publicUrl,
      mime_type: mimeType,
      size_bytes: input.file.size,
      created_by: user?.id ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    await supabase.storage.from(ORGANIZATION_STICKERS_BUCKET).remove([storagePath]);
    console.error("Failed to save organization sticker row:", error?.message);
    return { sticker: null, error: "Unable to save sticker." };
  }

  return {
    sticker: mapOrganizationStickerRow(data as OrganizationStickerRow),
    error: null,
  };
}

export async function deleteOrganizationSticker(input: {
  organizationId: string;
  stickerId: string;
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();
  const existing = await getOrganizationStickerById(input);
  if (!existing) {
    return { success: false, error: "Sticker not found." };
  }

  const { error } = await supabase
    .from("organization_stickers")
    .delete()
    .eq("organization_id", input.organizationId)
    .eq("id", input.stickerId);

  if (error) {
    return { success: false, error: "Unable to delete sticker." };
  }

  await supabase.storage
    .from(ORGANIZATION_STICKERS_BUCKET)
    .remove([existing.storagePath]);

  return { success: true, error: null };
}
