#!/usr/bin/env node
/**
 * Generates public/templates/board-roster-import.xlsx for board / team roster import.
 * Run: node scripts/generate-board-roster-template.mjs
 */
import ExcelJS from "exceljs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(
  __dirname,
  "../public/templates/board-roster-import.xlsx",
);

const PRIOR_YEAR = "2024-2025 Chair";
const CURRENT_YEAR = "2025-2026 Chair";

/** @type {Array<{ a: string; b?: string; c?: string; d?: string; bold?: boolean; note?: string }>} */
const rows = [
  {
    a: "Position",
    b: "Committee / Team",
    c: PRIOR_YEAR,
    d: CURRENT_YEAR,
    bold: true,
  },
  {
    a: "President",
    b: "Alex Morgan",
    bold: true,
    note: "Leadership row — bold column A; column B is the role holder (name or email).",
  },
  {
    a: "President Committees",
    b: "",
    note: "Section header — import skips this row.",
  },
  {
    a: "",
    b: "Annual Gala",
    c: "Jamie Lee",
    d: "Morgan Taylor",
    note: "Committee under President — name in column B; chairs in C/D.",
  },
  {
    a: "",
    b: "Member Welcome",
    d: "Open",
  },
  {
    a: "VP Events",
    b: "Sam Rivera",
    bold: true,
  },
  {
    a: "",
    b: "Community Festival",
    d: "Jordan Kim",
  },
  {
    a: "",
    b: "Fundraising Dinner",
    c: "Pat Nguyen",
    d: "Open",
  },
  {
    a: "VP Communications",
    b: "communications@example.org",
    bold: true,
    note: "Email in column B works for leadership contact.",
  },
  {
    a: "",
    b: "Newsletter",
    d: "Taylor Brooks",
  },
  {
    a: "",
    b: "Social media",
    d: "Open",
  },
  {
    a: "Treasurer",
    b: "Riley Chen",
    bold: true,
  },
  {
    a: "Secretary",
    b: "Open",
    bold: true,
  },
];

async function main() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hey Ralli";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Roster", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { key: "a", width: 28 },
    { key: "b", width: 32 },
    { key: "c", width: 22 },
    { key: "d", width: 22 },
  ];

  for (const row of rows) {
    const excelRow = sheet.addRow({
      a: row.a,
      b: row.b ?? "",
      c: row.c ?? "",
      d: row.d ?? "",
    });

    const bold = row.bold === true;
    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > 4) {
        return;
      }
      cell.font = { name: "Calibri", size: 11, bold };
      cell.alignment = { vertical: "top", wrapText: true };
      if (excelRow.number === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF6F2EB" },
        };
      }
    });
  }

  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [{ width: 92 }];
  const lines = [
    "Board / team roster import template",
    "",
    "How to fill this in:",
    "1. Bold rows in column A are leadership roles (President, VP, Treasurer, Secretary, etc.).",
    "2. Put the role holder in column B on those rows — a name or email.",
    "3. Committees and teams go in column B on rows below each leader until the next bold row.",
    "4. Chair names go in the current-year column (D). Prior-year (C) is optional.",
    "5. Leave a chair blank or write Open for unfilled slots.",
    "",
    "Upload the completed .xlsx on Team & Access → Import roster.",
  ];
  for (const line of lines) {
    const r = instructions.addRow([line]);
    r.getCell(1).font = {
      name: "Calibri",
      size: line === lines[0] ? 14 : 11,
      bold: line === lines[0],
    };
    r.getCell(1).alignment = { wrapText: true, vertical: "top" };
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  const buffer = await workbook.xlsx.writeBuffer();
  await writeFile(outputPath, buffer);
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
