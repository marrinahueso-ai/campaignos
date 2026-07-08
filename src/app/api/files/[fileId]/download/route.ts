import { NextResponse } from "next/server";
import { CAMPAIGN_FILES_BUCKET } from "@/lib/campaign-files/constants";
import { detectFileType } from "@/lib/campaign-files/file-type";
import { getCampaignFileById } from "@/lib/campaign-files/queries";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await context.params;
  const { searchParams } = new URL(request.url);
  const asPdf = searchParams.get("format") === "pdf";

  const file = await getCampaignFileById(fileId);
  if (!file?.storagePath) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CAMPAIGN_FILES_BUCKET)
    .download(file.storagePath);

  if (error || !data) {
    return NextResponse.json({ error: "Unable to download file." }, { status: 500 });
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const fileType = file.fileType ?? detectFileType(file.name, file.mimeType);
  const safeName = file.name.replace(/[^\w.-]/g, "_");

  if (!asPdf) {
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.mimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  }

  if (fileType === "pdf") {
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName.replace(/\.[^.]+$/, "")}.pdf"`,
      },
    });
  }

  if (fileType === "png" || fileType === "jpg") {
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": file.mimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "X-Download-Fallback": "true",
        "X-Download-Fallback-Reason":
          "Image files download in their original format. PDF conversion uses the original PNG/JPG when a dedicated PDF export is unavailable.",
      },
    });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "X-Download-Fallback": "true",
      "X-Download-Fallback-Reason": `PDF conversion is not available for ${fileType.toUpperCase()} files. Downloaded original format instead.`,
    },
  });
}
