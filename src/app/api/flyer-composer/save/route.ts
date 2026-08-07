import { NextResponse } from "next/server";
import { requireFlyerComposerGenerateAccess } from "@/lib/flyer-composer/api-auth";
import {
  flyerSaveBodySchema,
  parseJsonBody,
} from "@/lib/flyer-composer/request-schemas";
import { saveFlyerComposerToFiles } from "@/lib/flyer-composer/save-to-files";
import { isSameOriginRequest } from "@/lib/security/verify-same-origin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "Forbidden.",
        fileId: null,
        fileName: null,
        filesHref: null,
      },
      { status: 403 },
    );
  }

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

  const parsed = parseJsonBody(flyerSaveBodySchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error,
        fileId: null,
        fileName: null,
        filesHref: null,
      },
      { status: 400 },
    );
  }

  const { eventId, imageUrl, headline, title, versionId } = parsed.data;
  const result = await saveFlyerComposerToFiles({
    eventId,
    imageUrl,
    headline: headline?.trim() || null,
    title: title?.trim() || null,
    versionId: versionId?.trim() || null,
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
