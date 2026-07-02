import { createClient } from "@/lib/supabase/server";

const CALENDAR_UPLOADS_BUCKET = "calendar-uploads";

async function downloadCalendarFile(storagePath: string): Promise<Buffer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CALENDAR_UPLOADS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    console.error("Failed to download calendar file:", error?.message);
    return null;
  }

  return Buffer.from(await data.arrayBuffer());
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const { extractDocxTextFromBuffer } = await import(
    "@/lib/calendar-import/extract-docx-node"
  );
  return extractDocxTextFromBuffer(buffer);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractPdfTextFromBuffer } = await import(
    "@/lib/calendar-import/extract-pdf-node"
  );
  return extractPdfTextFromBuffer(buffer);
}

function extractCsvText(buffer: Buffer): string {
  return buffer.toString("utf-8").trim();
}

function extractIcsText(buffer: Buffer): string {
  return buffer.toString("utf-8").trim();
}

export async function extractCalendarFileText(
  fileType: string,
  storagePath: string,
): Promise<{ text: string | null; error: string | null }> {
  const buffer = await downloadCalendarFile(storagePath);

  if (!buffer) {
    return { text: null, error: "Unable to read the uploaded calendar file." };
  }

  try {
    switch (fileType) {
      case "pdf": {
        const text = await extractPdfText(buffer);
        if (!text) {
          return {
            text: null,
            error:
              "No readable text found in the PDF. If you have the original Word file, upload the .docx instead.",
          };
        }
        return { text, error: null };
      }
      case "docx": {
        const text = await extractDocxText(buffer);
        if (!text) {
          return {
            text: null,
            error: "No readable text found in the Word document.",
          };
        }
        return { text, error: null };
      }
      case "csv":
        return { text: extractCsvText(buffer), error: null };
      case "ics":
        return { text: extractIcsText(buffer), error: null };
      default:
        return {
          text: null,
          error: "Only PDF, Word (.docx), CSV, and ICS files can be parsed right now.",
        };
    }
  } catch (error) {
    console.error("Calendar text extraction failed:", error);
    return {
      text: null,
      error: "We couldn't read that calendar file. Try uploading a different format.",
    };
  }
}
