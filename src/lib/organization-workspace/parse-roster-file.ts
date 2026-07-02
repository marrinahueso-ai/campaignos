import { extractRosterFileText } from "@/lib/organization-workspace/extract-roster-text";
import { mergeCommitteeCoChairs } from "@/lib/organization-workspace/merge-committee-chairs";
import {
  countRosterImport,
  parseRosterText,
  type ParsedRosterRole,
} from "@/lib/organization-workspace/parse-roster";
import { parseRosterXlsx } from "@/lib/organization-workspace/parse-roster-xlsx";

function finalizeRoster(roles: ParsedRosterRole[]): ParsedRosterRole[] {
  return mergeCommitteeCoChairs(roles);
}

function extensionFromFilename(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export async function parseRosterFromFile(
  buffer: Buffer,
  filename: string,
): Promise<{ roles: ParsedRosterRole[]; error: string | null }> {
  const extension = extensionFromFilename(filename);

  if (extension === "xlsx" || extension === "xls") {
    try {
      const roles = finalizeRoster(await parseRosterXlsx(buffer));
      const counts = countRosterImport(roles);

      if (counts.roleCount === 0) {
        return {
          roles: [],
          error:
            "No leadership roles found. Bold rows in column A should be VP titles; committees go in column B below each VP.",
        };
      }

      return { roles, error: null };
    } catch (error) {
      console.error("Excel roster parse failed:", error);
      return {
        roles: [],
        error: "Unable to read the Excel file. Save as .xlsx and try again.",
      };
    }
  }

  const extracted = await extractRosterFileText(buffer, filename);
  if (extracted.error || !extracted.text) {
    return {
      roles: [],
      error: extracted.error ?? "Unable to read roster file.",
    };
  }

  const roles = finalizeRoster(parseRosterText(extracted.text));
  const counts = countRosterImport(roles);

  if (counts.roleCount === 0) {
    return {
      roles: [],
      error:
        "No leadership roles found. Upload the original .xlsx file, or use a roster where bold rows are VPs and committees stack below.",
    };
  }

  return { roles, error: null };
}
