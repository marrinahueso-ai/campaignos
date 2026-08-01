import "server-only";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getAuthUser } from "@/lib/auth/queries";
import { uploadCampaignFile } from "@/lib/campaign-files/mutations";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { isPersistableFlyerApprovalImageUrl } from "@/lib/flyer-composer/approval";

export type SaveFlyerComposerToFilesInput = {
  eventId: string;
  imageUrl: string;
  headline?: string | null;
  versionId?: string | null;
};

export type SaveFlyerComposerToFilesResult = {
  success: boolean;
  message: string;
  fileId: string | null;
  fileName: string | null;
  filesHref: string | null;
};

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

function slugPart(value: string, max = 40): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

async function bytesFromImageUrl(
  imageUrl: string,
): Promise<
  | { ok: true; bytes: Buffer; contentType: string; ext: string }
  | { ok: false; error: string }
> {
  const trimmed = imageUrl.trim();
  if (!isPersistableFlyerApprovalImageUrl(trimmed)) {
    return { ok: false, error: "Flyer image must be a hosted URL or image data URL." };
  }

  const dataMatch = trimmed.match(/^data:image\/([\w+.-]+);base64,(.+)$/i);
  if (dataMatch?.[2]) {
    try {
      const bytes = Buffer.from(dataMatch[2], "base64");
      if (!bytes.length) {
        return { ok: false, error: "Flyer image data is empty." };
      }
      const ext =
        (dataMatch[1] || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      return {
        ok: true,
        bytes,
        contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
        ext: ext === "jpeg" ? "jpg" : ext,
      };
    } catch {
      return { ok: false, error: "Could not read flyer image data." };
    }
  }

  try {
    const response = await fetch(trimmed);
    if (!response.ok) {
      return { ok: false, error: "Could not download flyer image." };
    }
    const contentType = (response.headers.get("content-type") || "image/png")
      .split(";")[0]
      ?.trim()
      .toLowerCase();
    if (!contentType?.startsWith("image/")) {
      return { ok: false, error: "Flyer file is not an image." };
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) {
      return { ok: false, error: "Flyer image is empty." };
    }
    let ext = contentType.replace("image/", "").replace("jpeg", "jpg");
    if (!["png", "jpg", "webp", "gif"].includes(ext)) {
      ext = "png";
    }
    return {
      ok: true,
      bytes,
      contentType: contentType === "image/jpg" ? "image/jpeg" : contentType,
      ext,
    };
  } catch {
    return { ok: false, error: "Could not download flyer image." };
  }
}

export async function saveFlyerComposerToFiles(
  input: SaveFlyerComposerToFilesInput,
): Promise<SaveFlyerComposerToFilesResult> {
  if (!(await hasPermission("upload_artwork"))) {
    return {
      success: false,
      message: "You do not have permission to save flyers to Files.",
      fileId: null,
      fileName: null,
      filesHref: null,
    };
  }

  if (!(await getLatestOrganization())?.id) {
    return {
      success: false,
      message: "Sign in with an active organization to save.",
      fileId: null,
      fileName: null,
      filesHref: null,
    };
  }

  const eventId = input.eventId.trim();
  if (!eventId) {
    return {
      success: false,
      message: "Choose a campaign before saving to Files.",
      fileId: null,
      fileName: null,
      filesHref: null,
    };
  }

  const event = await getEventById(eventId);
  if (!event) {
    return {
      success: false,
      message: "Selected event was not found.",
      fileId: null,
      fileName: null,
      filesHref: null,
    };
  }

  const image = await bytesFromImageUrl(input.imageUrl);
  if (!image.ok) {
    return {
      success: false,
      message: image.error,
      fileId: null,
      fileName: null,
      filesHref: null,
    };
  }

  const titleBit =
    slugPart(input.headline || "") ||
    slugPart(event.title) ||
    "flyer";
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `Flyer-${titleBit}-${stamp}.${image.ext}`;
  const file = new File([new Uint8Array(image.bytes)], fileName, {
    type: image.contentType,
  });

  const authUser = await getAuthUser();
  const uploaded = await uploadCampaignFile({
    eventId,
    file,
    category: "flyer",
    documentCategory: "general_document",
    platforms: [],
    uploaderName: resolveUploaderName(authUser),
  });

  if (!uploaded.id) {
    return {
      success: false,
      message: uploaded.error ?? "Unable to save flyer to Files.",
      fileId: null,
      fileName: null,
      filesHref: null,
    };
  }

  const filesHref = `/events/${eventId}?tab=files`;
  revalidatePath("/files");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");

  return {
    success: true,
    message: `Saved to ${event.title} · Files.`,
    fileId: uploaded.id,
    fileName,
    filesHref,
  };
}
