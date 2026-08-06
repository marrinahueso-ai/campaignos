import { NextResponse } from "next/server";
import { requireFlyerComposerGenerateAccess } from "@/lib/flyer-composer/api-auth";
import { saveFlyerComposerToFiles } from "@/lib/flyer-composer/save-to-files";

export const dynamic = "force-dynamic";

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const access = await requireFlyerComposerGenerateAccess();
  if (!access.ok) {
    return NextResponse.json(
      {
        success: false,
        error: access.error,
        fileId: null,
        fileName: null,
        filesHref: null,
      },
      { status: access.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body.",
        fileId: null,
        fileName: null,
        filesHref: null,
      },
      { status: 400 },
    );
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  if (!raw) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body.",
        fileId: null,
        fileName: null,
        filesHref: null,
      },
      { status: 400 },
    );
  }

  const eventId = readString(raw.eventId).trim();
  const imageUrl = readString(raw.imageUrl).trim();
  if (!eventId || !imageUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "eventId and imageUrl are required.",
        fileId: null,
        fileName: null,
        filesHref: null,
      },
      { status: 400 },
    );
  }

  const result = await saveFlyerComposerToFiles({
    eventId,
    imageUrl,
    headline: readString(raw.headline).trim() || null,
    title: readString(raw.title).trim() || null,
    versionId: readString(raw.versionId).trim() || null,
  });

  return NextResponse.json(
    {
      success: result.success,
      error: result.success ? null : result.message,
      message: result.message,
      fileId: result.fileId,
      fileName: result.fileName,
      filesHref: result.filesHref,
      imageUrl: result.success ? imageUrl : null,
    },
    { status: result.success ? 200 : 400 },
  );
}
