function extractPlainText(buffer: Buffer): string {
  return buffer.toString("utf-8").trim();
}

function extractCsvText(buffer: Buffer): string {
  return buffer.toString("utf-8").trim();
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

function extensionFromFilename(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export async function extractRosterFileText(
  buffer: Buffer,
  filename: string,
): Promise<{ text: string | null; error: string | null }> {
  const extension = extensionFromFilename(filename);

  try {
    switch (extension) {
      case "txt":
      case "tsv":
        return { text: extractPlainText(buffer), error: null };
      case "csv":
        return { text: extractCsvText(buffer), error: null };
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
      case "pdf": {
        const text = await extractPdfText(buffer);
        if (!text) {
          return {
            text: null,
            error:
              "No readable text found in the PDF. Try a .docx, .csv, or .txt roster export.",
          };
        }
        return { text, error: null };
      }
      default:
        return {
          text: null,
          error:
            "Upload a .xlsx, .docx, .csv, .txt, .tsv, or .pdf roster file.",
        };
    }
  } catch (error) {
    console.error("Roster text extraction failed:", error);
    return {
      text: null,
      error: "We couldn't read that file. Try pasting the roster instead.",
    };
  }
}
