/**
 * Minimal RFC 4180-ish CSV parser (no external dependency) for the
 * newsletter contacts importer. Handles quoted fields, escaped quotes
 * (`""`), and both `\n` and `\r\n` line endings.
 */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      pushField();
      continue;
    }
    if (char === "\r") {
      continue;
    }
    if (char === "\n") {
      pushRow();
      continue;
    }
    field += char;
  }

  // Trailing field/row (files without a final newline).
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0]?.trim() !== ""));
}

export interface CsvContactColumnMapping {
  emailColumn: number;
  firstNameColumn: number | null;
  lastNameColumn: number | null;
}

/** Best-effort header guess — used to pre-select the mapping dropdowns. */
export function guessCsvContactColumns(header: string[]): CsvContactColumnMapping {
  const normalized = header.map((h) => h.trim().toLowerCase());
  const findIndex = (candidates: string[]): number | null => {
    for (const candidate of candidates) {
      const index = normalized.indexOf(candidate);
      if (index !== -1) return index;
    }
    return null;
  };

  return {
    emailColumn: findIndex(["email", "email address", "e-mail"]) ?? 0,
    firstNameColumn: findIndex(["first name", "firstname", "first"]),
    lastNameColumn: findIndex(["last name", "lastname", "last"]),
  };
}
