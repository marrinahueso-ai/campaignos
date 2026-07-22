import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/queries";
import { canManageDeveloperAgreements } from "@/lib/developer-agreements/access";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { downloadAgreementBytes } from "@/lib/developer-agreements/storage";

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signatureId = request.nextUrl.searchParams.get("id")?.trim();
  if (!signatureId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("developer_agreement_signatures")
    .select("id, user_id, executed_html_path, document_id, version_id")
    .eq("id", signatureId)
    .maybeSingle();

  if (error || !row?.executed_html_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = await canManageDeveloperAgreements();
  if (row.user_id !== user.id && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ data: document }, { data: version }] = await Promise.all([
    admin
      .from("developer_agreement_documents")
      .select("title")
      .eq("id", row.document_id)
      .maybeSingle(),
    admin
      .from("developer_agreement_versions")
      .select("version_label")
      .eq("id", row.version_id)
      .maybeSingle(),
  ]);

  const file = await downloadAgreementBytes(row.executed_html_path);
  if ("error" in file) {
    return NextResponse.json({ error: file.error }, { status: 404 });
  }

  const safeTitle = (document?.title ?? "agreement")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const filename = `${safeTitle}-${version?.version_label ?? "signed"}.html`;

  return new NextResponse(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
