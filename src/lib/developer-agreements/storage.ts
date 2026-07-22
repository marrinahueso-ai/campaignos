import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "developer-agreements";

export async function uploadAgreementBytes(input: {
  path: string;
  bytes: Uint8Array | Buffer;
  contentType: string;
}): Promise<{ path: string } | { error: string }> {
  const admin = createAdminClient();
  // Prefer an explicit MIME from the caller (executed packets use
  // text/html; charset=utf-8). Upsert refreshes Storage metadata so
  // regenerating a packet corrects a previously wrong content type.
  const { error } = await admin.storage.from(BUCKET).upload(input.path, input.bytes, {
    contentType: input.contentType,
    upsert: true,
    cacheControl: "private, no-store",
  });
  if (error) {
    return { error: error.message };
  }
  return { path: input.path };
}

export async function downloadAgreementBytes(
  path: string,
): Promise<{ bytes: Buffer; contentType: string | null } | { error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !data) {
    return { error: error?.message ?? "File not found." };
  }
  const bytes = Buffer.from(await data.arrayBuffer());
  return { bytes, contentType: data.type || null };
}

export async function signaturePathToDataUrl(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const file = await downloadAgreementBytes(path);
  if ("error" in file) return null;
  const contentType = file.contentType || "image/png";
  return `data:${contentType};base64,${file.bytes.toString("base64")}`;
}
