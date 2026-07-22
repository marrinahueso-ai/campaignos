import "server-only";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export type OwnerDashboardMetrics = {
  organizations: number;
  activeMembers: number;
  developers: number;
  events: number;
  agreementsAwaitingCompany: number;
  agreementsFullyExecuted: number;
  agreementsSignedTotal: number;
};

export type DeveloperSignedRow = {
  signatureId: string;
  developerName: string;
  developerEmail: string;
  documentTitle: string;
  versionLabel: string;
  status: "awaiting_company" | "fully_executed";
  signedAt: string;
  companySignedAt: string | null;
  companySignerName: string | null;
  canDownload: boolean;
};

function emptyMetrics(): OwnerDashboardMetrics {
  return {
    organizations: 0,
    activeMembers: 0,
    developers: 0,
    events: 0,
    agreementsAwaitingCompany: 0,
    agreementsFullyExecuted: 0,
    agreementsSignedTotal: 0,
  };
}

export async function getOwnerDashboardMetrics(): Promise<OwnerDashboardMetrics> {
  if (!isSupabaseAdminConfigured()) {
    return emptyMetrics();
  }

  const admin = createAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString();

  const [
    orgs,
    members,
    developers,
    events,
    awaiting,
    executed,
    signedTotal,
  ] = await Promise.all([
    admin.from("organizations").select("id", { count: "exact", head: true }),
    admin
      .from("organization_users")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("organization_users")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("campaign_role", "developer"),
    admin.from("events").select("id", { count: "exact", head: true }),
    admin
      .from("developer_agreement_signatures")
      .select("id", { count: "exact", head: true })
      .eq("status", "awaiting_company"),
    admin
      .from("developer_agreement_signatures")
      .select("id", { count: "exact", head: true })
      .eq("status", "fully_executed"),
    admin
      .from("developer_agreement_signatures")
      .select("id", { count: "exact", head: true }),
  ]);

  void since;

  return {
    organizations: orgs.count ?? 0,
    activeMembers: members.count ?? 0,
    developers: developers.count ?? 0,
    events: events.count ?? 0,
    agreementsAwaitingCompany: awaiting.count ?? 0,
    agreementsFullyExecuted: executed.count ?? 0,
    agreementsSignedTotal: signedTotal.count ?? 0,
  };
}

export async function listDevelopersSigned(limit = 50): Promise<DeveloperSignedRow[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("developer_agreement_signatures")
    .select(
      "id, status, typed_legal_name, signed_at, company_signed_at, company_typed_legal_name, executed_html_path, user_id, document_id, version_id",
    )
    .order("signed_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    return [];
  }

  const rows: DeveloperSignedRow[] = [];
  for (const row of data) {
    const [{ data: document }, { data: version }, { data: authUser }] =
      await Promise.all([
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
        admin.auth.admin.getUserById(row.user_id),
      ]);

    rows.push({
      signatureId: row.id,
      developerName: row.typed_legal_name,
      developerEmail: authUser.user?.email ?? "",
      documentTitle: document?.title ?? "Agreement",
      versionLabel: version?.version_label ?? "",
      status:
        row.status === "fully_executed" ? "fully_executed" : "awaiting_company",
      signedAt: row.signed_at,
      companySignedAt: row.company_signed_at,
      companySignerName: row.company_typed_legal_name,
      canDownload: Boolean(row.executed_html_path),
    });
  }

  return rows;
}

/** Simple 30-day org signup series for the overview chart. */
export async function getOrganizationSignupsLast30Days(): Promise<
  Array<{ date: string; count: number }>
> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const admin = createAdminClient();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const { data, error } = await admin
    .from("organizations")
    .select("created_at")
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: true });

  const byDay = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    byDay.set(day.toISOString().slice(0, 10), 0);
  }

  if (!error && data) {
    for (const row of data) {
      const key = String(row.created_at).slice(0, 10);
      if (byDay.has(key)) {
        byDay.set(key, (byDay.get(key) ?? 0) + 1);
      }
    }
  }

  return [...byDay.entries()].map(([date, count]) => ({ date, count }));
}
