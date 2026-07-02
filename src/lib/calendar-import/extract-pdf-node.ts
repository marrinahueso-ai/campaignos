import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url);

/**
 * PDF extraction must run outside the webpack server-action bundle.
 * pdf-parse/pdfjs breaks when bundled (Object.defineProperty on non-object).
 */
export async function extractPdfTextFromBuffer(buffer: Buffer): Promise<string> {
  const { PDFParse } = nodeRequire("pdf-parse") as {
    PDFParse: new (options: { data: Uint8Array }) => {
      getText: () => Promise<{ text?: string }>;
      destroy: () => Promise<void>;
    };
  };

  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText();
    return result.text?.trim() ?? "";
  } finally {
    await parser.destroy();
  }
}
