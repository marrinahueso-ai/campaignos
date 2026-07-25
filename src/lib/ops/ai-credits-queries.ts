import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import {
  type AiPlanTier,
  DEFAULT_PAID_PLAN_TIER,
  PLAN_MONTHLY_CREDITS,
  SOFT_WARN_REMAINING_CREDITS,
  monthlyAllowanceForTier,
  periodYmUtc,
} from "@/lib/ai/credit-constants";
import { ensurePeriodAllowance } from "@/lib/ai/credits";
import {
  AI_APIS_PINNED_ORGANIZATIONS,
  AI_APIS_TABLE_PAGE_SIZE,
} from "@/lib/ops/ai-apis-constants";

export type OwnerAiCreditsHealth =
  | "unlimited"
  | "ok"
  | "soft_warn"
  | "exhausted"
  | "no_balance";

export type OwnerAiCreditsOrgRow = {
  organizationId: string;
  organizationName: string;
  planTier: AiPlanTier;
  unlimited: boolean;
  periodYm: string;
  allowance: number;
  used: number;
  periodRemaining: number;
  reserveBalance: number;
  softWarn: boolean;
  openaiCostUsd: number;
  health: OwnerAiCreditsHealth;
};

export type OwnerAiCreditsLedgerEntry = {
  id: string;
  entryType: string;
  amount: number;
  bucket: string | null;
  periodYm: string | null;
  note: string | null;
  createdAt: string;
  aiUsageLogId: string | null;
};

export type OwnerAiCreditsSummary = {
  orgCount: number;
  softWarnCount: number;
  exhaustedCount: number;
  unlimitedCount: number;
  totalPeriodUsed: number;
  totalReserve: number;
  totalOpenaiCostUsd: number;
};

export type OwnerAiCreditsDashboard = {
  periodYm: string;
  summary: OwnerAiCreditsSummary;
  rows: OwnerAiCreditsOrgRow[];
  totalFiltered: number;
  page: number;
  pageSize: number;
  filterOptions: { organizations: { id: string; name: string }[] };
  selectedOrgId: string | null;
  ledger: OwnerAiCreditsLedgerEntry[];
};

function softWarnFor(
  tier: AiPlanTier,
  periodRemaining: number,
  allowance: number,
  unlimited: boolean,
): boolean {
  if (unlimited || allowance <= 0) return false;
  const floor =
    tier in SOFT_WARN_REMAINING_CREDITS
      ? SOFT_WARN_REMAINING_CREDITS[
          tier as keyof typeof SOFT_WARN_REMAINING_CREDITS
        ]
      : Math.ceil(allowance * 0.1);
  return periodRemaining <= floor || periodRemaining <= allowance * 0.1;
}

function healthFor(row: {
  unlimited: boolean;
  softWarn: boolean;
  periodRemaining: number;
  reserveBalance: number;
  hasBalance: boolean;
}): OwnerAiCreditsHealth {
  if (row.unlimited) return "unlimited";
  if (!row.hasBalance) return "no_balance";
  if (row.periodRemaining <= 0 && row.reserveBalance <= 0) return "exhausted";
  if (row.softWarn) return "soft_warn";
  return "ok";
}

function periodBoundsUtc(periodYm: string): { fromIso: string; toIso: string } {
  const [ys, ms] = periodYm.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const fromIso = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0)).toISOString();
  const toIso = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)).toISOString();
  return { fromIso, toIso };
}

async function openaiCostByOrgForPeriod(
  periodYm: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!isSupabaseAdminConfigured()) return map;
  const { fromIso, toIso } = periodBoundsUtc(periodYm);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_usage_log")
    .select("organization_id, estimated_cost_usd")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .limit(20_000);

  if (error) {
    if (error.code !== "42P01") {
      console.error("[ai-credits-ops] openai cost rollup failed:", error.message);
    }
    return map;
  }

  for (const row of data ?? []) {
    const orgId = row.organization_id as string | null;
    if (!orgId) continue;
    const cost = Number(row.estimated_cost_usd) || 0;
    map.set(orgId, (map.get(orgId) ?? 0) + cost);
  }
  return map;
}

export async function getOwnerAiCreditsDashboard(input: {
  search?: string | null;
  organizationId?: string | null;
  health?: string | null;
  page?: number;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  selectedOrgId?: string | null;
  pageSize?: number;
}): Promise<OwnerAiCreditsDashboard> {
  const periodYm = periodYmUtc();
  const pageSize = input.pageSize ?? AI_APIS_TABLE_PAGE_SIZE;
  const page = Math.max(1, input.page ?? 1);
  const sortDir = input.sortDir === "asc" ? "asc" : "desc";
  const sortKey = input.sortKey ?? "used";

  const empty: OwnerAiCreditsDashboard = {
    periodYm,
    summary: {
      orgCount: 0,
      softWarnCount: 0,
      exhaustedCount: 0,
      unlimitedCount: 0,
      totalPeriodUsed: 0,
      totalReserve: 0,
      totalOpenaiCostUsd: 0,
    },
    rows: [],
    totalFiltered: 0,
    page: 1,
    pageSize,
    filterOptions: { organizations: [] },
    selectedOrgId: null,
    ledger: [],
  };

  if (!isSupabaseAdminConfigured()) return empty;

  const admin = createAdminClient();

  // Refresh balances for pinned orgs so Owner always sees current period.
  await Promise.all(
    AI_APIS_PINNED_ORGANIZATIONS.map((org) =>
      ensurePeriodAllowance(org.id).catch(() => null),
    ),
  );

  const [{ data: orgs, error: orgError }, { data: balances, error: balError }, costByOrg] =
    await Promise.all([
      admin
        .from("organizations")
        .select("id, name, billing_exempt_at")
        .order("name", { ascending: true })
        .limit(500),
      admin.from("organization_ai_credit_balances").select("*").limit(500),
      openaiCostByOrgForPeriod(periodYm),
    ]);

  if (orgError) {
    console.error("[ai-credits-ops] orgs list failed:", orgError.message);
  }
  if (balError?.code === "42P01") {
    console.warn("[ai-credits-ops] balances table missing");
    return empty;
  }
  if (balError) {
    console.error("[ai-credits-ops] balances read failed:", balError.message);
  }

  const balanceByOrg = new Map(
    (balances ?? []).map((row) => [row.organization_id as string, row]),
  );

  const orgList = orgs ?? [];
  for (const pinned of AI_APIS_PINNED_ORGANIZATIONS) {
    if (!orgList.some((o) => o.id === pinned.id)) {
      orgList.push({
        id: pinned.id,
        name: pinned.name,
        billing_exempt_at: null,
      });
    }
  }

  const built: OwnerAiCreditsOrgRow[] = orgList.map((org) => {
    const id = org.id as string;
    const name =
      (org.name as string) ||
      AI_APIS_PINNED_ORGANIZATIONS.find((p) => p.id === id)?.name ||
      "Organization";
    const exempt = Boolean(org.billing_exempt_at);
    const bal = balanceByOrg.get(id);

    const planTier: AiPlanTier = exempt
      ? "founding"
      : ((bal?.plan_tier as AiPlanTier) || DEFAULT_PAID_PLAN_TIER);
    const unlimited = exempt || Boolean(bal?.unlimited);
    const allowance = unlimited
      ? 0
      : bal && bal.period_ym === periodYm
        ? Number(bal.allowance) || 0
        : monthlyAllowanceForTier(
            planTier === "founding" ? "professional" : planTier,
          ) ?? PLAN_MONTHLY_CREDITS.professional;
    const used =
      bal && bal.period_ym === periodYm && !unlimited ? Number(bal.used) || 0 : 0;
    const reserveBalance = bal ? Number(bal.reserve_balance) || 0 : 0;
    const periodRemaining = unlimited
      ? Number.POSITIVE_INFINITY
      : Math.max(0, allowance - used);
    const softWarn = softWarnFor(
      planTier,
      unlimited ? allowance : periodRemaining,
      allowance,
      unlimited,
    );
    const health = healthFor({
      unlimited,
      softWarn,
      periodRemaining: unlimited ? 1 : periodRemaining,
      reserveBalance,
      hasBalance: Boolean(bal) || unlimited,
    });

    return {
      organizationId: id,
      organizationName: name,
      planTier,
      unlimited,
      periodYm: bal?.period_ym === periodYm ? periodYm : bal?.period_ym || periodYm,
      allowance,
      used,
      periodRemaining: unlimited ? 0 : periodRemaining,
      reserveBalance,
      softWarn,
      openaiCostUsd: costByOrg.get(id) ?? 0,
      health,
    };
  });

  const search = input.search?.trim().toLowerCase() ?? "";
  let filtered = built;
  if (input.organizationId) {
    filtered = filtered.filter((r) => r.organizationId === input.organizationId);
  }
  if (search) {
    filtered = filtered.filter(
      (r) =>
        r.organizationName.toLowerCase().includes(search) ||
        r.planTier.includes(search) ||
        r.organizationId.toLowerCase().includes(search),
    );
  }
  if (
    input.health === "soft_warn" ||
    input.health === "exhausted" ||
    input.health === "unlimited" ||
    input.health === "ok" ||
    input.health === "no_balance"
  ) {
    filtered = filtered.filter((r) => r.health === input.health);
  }

  filtered = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const av =
      sortKey === "openaiCostUsd"
        ? a.openaiCostUsd
        : sortKey === "reserveBalance"
          ? a.reserveBalance
          : sortKey === "periodRemaining"
            ? a.periodRemaining
            : sortKey === "name"
              ? a.organizationName.toLowerCase()
              : a.used;
    const bv =
      sortKey === "openaiCostUsd"
        ? b.openaiCostUsd
        : sortKey === "reserveBalance"
          ? b.reserveBalance
          : sortKey === "periodRemaining"
            ? b.periodRemaining
            : sortKey === "name"
              ? b.organizationName.toLowerCase()
              : b.used;
    if (typeof av === "string" && typeof bv === "string") {
      return av.localeCompare(bv) * dir;
    }
    return ((av as number) - (bv as number)) * dir;
  });

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const summary: OwnerAiCreditsSummary = {
    orgCount: built.length,
    softWarnCount: built.filter((r) => r.health === "soft_warn").length,
    exhaustedCount: built.filter((r) => r.health === "exhausted").length,
    unlimitedCount: built.filter((r) => r.health === "unlimited").length,
    totalPeriodUsed: built.reduce((s, r) => s + (r.unlimited ? 0 : r.used), 0),
    totalReserve: built.reduce((s, r) => s + r.reserveBalance, 0),
    totalOpenaiCostUsd: built.reduce((s, r) => s + r.openaiCostUsd, 0),
  };

  const selectedOrgId =
    input.selectedOrgId &&
    built.some((r) => r.organizationId === input.selectedOrgId)
      ? input.selectedOrgId
      : pageRows[0]?.organizationId ?? null;

  let ledger: OwnerAiCreditsLedgerEntry[] = [];
  if (selectedOrgId) {
    const { data: ledgerRows, error: ledgerError } = await admin
      .from("organization_ai_credit_ledger")
      .select(
        "id, entry_type, amount, bucket, period_ym, note, created_at, ai_usage_log_id",
      )
      .eq("organization_id", selectedOrgId)
      .order("created_at", { ascending: false })
      .limit(40);

    if (ledgerError && ledgerError.code !== "42P01") {
      console.error("[ai-credits-ops] ledger read failed:", ledgerError.message);
    }
    ledger = (ledgerRows ?? []).map((row) => ({
      id: row.id as string,
      entryType: row.entry_type as string,
      amount: Number(row.amount) || 0,
      bucket: (row.bucket as string | null) ?? null,
      periodYm: (row.period_ym as string | null) ?? null,
      note: (row.note as string | null) ?? null,
      createdAt: row.created_at as string,
      aiUsageLogId: (row.ai_usage_log_id as string | null) ?? null,
    }));
  }

  return {
    periodYm,
    summary,
    rows: pageRows,
    totalFiltered,
    page: safePage,
    pageSize,
    filterOptions: {
      organizations: built.map((r) => ({
        id: r.organizationId,
        name: r.organizationName,
      })),
    },
    selectedOrgId,
    ledger,
  };
}
