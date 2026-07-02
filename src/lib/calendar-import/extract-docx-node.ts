import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url);

export async function extractDocxTextFromBuffer(buffer: Buffer): Promise<string> {
  const mammoth = nodeRequire("mammoth") as {
    extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>;
  };

  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() ?? "";
}
