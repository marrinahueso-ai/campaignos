import { NextResponse } from "next/server";
import { buildInsightsExportRows, getInsightsPageData } from "@/lib/insights/queries";

export const dynamic = "force-dynamic";

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell.replace(/"/g, '""');
          return /[",\n]/.test(value) ? `"${value}"` : value;
        })
        .join(","),
    )
    .join("\n");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const data = await getInsightsPageData({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    range: url.searchParams.get("range"),
  });

  if (!data) {
    return NextResponse.json({ error: "Organization not found." }, { status: 401 });
  }

  const csv = toCsv(buildInsightsExportRows(data));
  const filename = `insights-${data.dateRange.from}-to-${data.dateRange.to}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
