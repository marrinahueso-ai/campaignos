import "server-only";

import { cache } from "react";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import type { AiActionType } from "@/lib/ai/types";
import {
  type AiPlanTier,
  type AiReserveSkuId,
  AI_RESERVE_SKUS,
  DEFAULT_PAID_PLAN_TIER,
  creditCostForAction,
  monthlyAllowanceForTier,
  periodYmUtc,
  SOFT_WARN_REMAINING_CREDITS,
} from "@/lib/ai/credit-constants";
import { splitBurnAcrossBuckets } from "@/lib/ai/credits-pure";
import { toAiCreditsWidgetData } from "@/lib/ai/ai-credits-widget-data";
import type { AiCreditsWidgetData } from "@/lib/ai/ai-credits-widget-data";

export {
  creditCostForAction,
  periodYmUtc,
  PLAN_MONTHLY_CREDITS,
  AI_RESERVE_SKUS,
  DEFAULT_PAID_PLAN_TIER,
} from "@/lib/ai/credit-constants";
export { splitBurnAcrossBuckets } from "@/lib/ai/credits-pure";
export type { BurnBucketSplit } from "@/lib/ai/credits-pure";

export type AiCreditSnapshot = {
  organizationId: string;
  periodYm: string;
  planTier: AiPlanTier;
  unlimited: boolean;
  allowance: number;
  used: number;
  periodRemaining: number;
  reserveBalance: number;
  totalRemaining: number;
  softWarn: boolean;
};

function softWarnForTier(
  tier: AiPlanTier,
  periodRemaining: number,
  allowance: number,
): boolean {
  if (tier === "founding" || allowance <= 0) return false;
  const floor =
    tier in SOFT_WARN_REMAINING_CREDITS
      ? SOFT_WARN_REMAINING_CREDITS[
          tier as keyof typeof SOFT_WARN_REMAINING_CREDITS
        ]
      : Math.ceil(allowance * 0.1);
  return periodRemaining <= floor || periodRemaining <= allowance * 0.1;
}

async function resolvePlanTier(organizationId: string): Promise<{
  tier: AiPlanTier;
  unlimited: boolean;
}> {
  try {
    const { getOrgBillingSnapshot, creditTierFromSnapshot } = await import(
      "@/lib/billing/org-billing"
    );
    const snapshot = await getOrgBillingSnapshot(organizationId);
    if (snapshot) {
      return {
        tier: creditTierFromSnapshot(snapshot),
        unlimited: snapshot.unlimitedCredits,
      };
    }
  } catch (error) {
    console.error("[ai-credits] billing snapshot failed:", error);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("billing_exempt_at")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("[ai-credits] org lookup failed:", error.message);
  }

  if (data?.billing_exempt_at) {
    return { tier: "founding", unlimited: true };
  }

  return { tier: DEFAULT_PAID_PLAN_TIER, unlimited: false };
}

type BalanceRow = {
  organization_id: string;
  period_ym: string;
  allowance: number;
  used: number;
  reserve_balance: number;
  unlimited: boolean;
  plan_tier: string;
  updated_at: string;
};

/**
 * Ensure the org has a balance row for the current UTC month.
 * Rolls period (resets used, new allowance) without touching reserve_balance.
 */
export async function ensurePeriodAllowance(
  organizationId: string,
  now: Date = new Date(),
): Promise<BalanceRow | null> {
  if (!isSupabaseAdminConfigured()) {
    console.warn("[ai-credits] admin client not configured; skip ensure");
    return null;
  }

  const orgId = organizationId.trim();
  if (!orgId) return null;

  const periodYm = periodYmUtc(now);
  const { tier, unlimited } = await resolvePlanTier(orgId);
  const allowance = unlimited ? 0 : (monthlyAllowanceForTier(tier) ?? 0);
  const admin = createAdminClient();

  const { data: existing, error: readError } = await admin
    .from("organization_ai_credit_balances")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (readError?.code === "42P01") {
    console.warn("[ai-credits] balances table missing; apply migration");
    return null;
  }
  if (readError) {
    console.error("[ai-credits] balance read failed:", readError.message);
    return null;
  }

  if (!existing) {
    const insertRow = {
      organization_id: orgId,
      period_ym: periodYm,
      allowance,
      used: 0,
      reserve_balance: 0,
      unlimited,
      plan_tier: tier,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await admin
      .from("organization_ai_credit_balances")
      .insert(insertRow)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[ai-credits] balance insert failed:", error.message);
      return null;
    }
    if (!unlimited && allowance > 0) {
      await admin.from("organization_ai_credit_ledger").insert({
        organization_id: orgId,
        entry_type: "period_grant",
        amount: allowance,
        bucket: "period",
        period_ym: periodYm,
        note: `Monthly grant (${tier})`,
      });
    }
    return data as BalanceRow;
  }

  const row = existing as BalanceRow;
  if (row.period_ym === periodYm) {
    if (row.unlimited !== unlimited || row.plan_tier !== tier) {
      const { data, error } = await admin
        .from("organization_ai_credit_balances")
        .update({
          unlimited,
          plan_tier: tier,
          allowance: unlimited ? 0 : allowance,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", orgId)
        .select("*")
        .maybeSingle();
      if (error) {
        console.error("[ai-credits] balance sync failed:", error.message);
        return row;
      }
      return (data as BalanceRow) ?? row;
    }
    return row;
  }

  // Trial pool is 600 for the whole 14-day window — do not reset used on month roll.
  const trialCarry = tier === "trial" && row.plan_tier === "trial";

  // New period: reset used (unless active trial); keep reserve; grant new allowance.
  const { data: rolled, error: rollError } = await admin
    .from("organization_ai_credit_balances")
    .update({
      period_ym: periodYm,
      allowance: unlimited ? 0 : allowance,
      used: trialCarry ? row.used : 0,
      unlimited,
      plan_tier: tier,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId)
    .select("*")
    .maybeSingle();

  if (rollError) {
    console.error("[ai-credits] period roll failed:", rollError.message);
    return row;
  }

  if (!unlimited && allowance > 0 && !trialCarry) {
    await admin.from("organization_ai_credit_ledger").insert({
      organization_id: orgId,
      entry_type: "period_grant",
      amount: allowance,
      bucket: "period",
      period_ym: periodYm,
      note: `Monthly grant (${tier})`,
    });
  }

  return (rolled as BalanceRow) ?? row;
}

function snapshotFromRow(
  row: BalanceRow,
  organizationId: string,
): AiCreditSnapshot {
  const planTier = (row.plan_tier || DEFAULT_PAID_PLAN_TIER) as AiPlanTier;
  const unlimited = Boolean(row.unlimited);
  const allowance = row.allowance ?? 0;
  const used = row.used ?? 0;
  const reserveBalance = row.reserve_balance ?? 0;
  const periodRemaining = unlimited
    ? Number.POSITIVE_INFINITY
    : Math.max(0, allowance - used);
  const totalRemaining = unlimited
    ? Number.POSITIVE_INFINITY
    : periodRemaining + reserveBalance;

  return {
    organizationId,
    periodYm: row.period_ym,
    planTier: unlimited ? "founding" : planTier,
    unlimited,
    allowance,
    used,
    periodRemaining: unlimited ? Number.POSITIVE_INFINITY : periodRemaining,
    reserveBalance,
    totalRemaining,
    softWarn: unlimited
      ? false
      : softWarnForTier(planTier, periodRemaining, allowance),
  };
}

export const getOrgAiCreditSnapshot = cache(
  async (organizationId: string): Promise<AiCreditSnapshot | null> => {
    const orgId = organizationId?.trim();
    if (!orgId || !isSupabaseAdminConfigured()) return null;
    const row = await ensurePeriodAllowance(orgId);
    if (!row) return null;
    return snapshotFromRow(row, orgId);
  },
);

/** Client-safe widget payload for layouts / Sidebar. */
export const getOrgAiCreditsWidgetData = cache(
  async (
    organizationId: string | null | undefined,
  ): Promise<AiCreditsWidgetData | null> => {
    const orgId = organizationId?.trim();
    if (!orgId) return null;
    const snap = await getOrgAiCreditSnapshot(orgId);
    if (!snap) return null;
    return toAiCreditsWidgetData({
      unlimited: snap.unlimited,
      used: snap.used,
      allowance: snap.allowance,
      reserveBalance: snap.reserveBalance,
      softWarn: snap.softWarn,
      periodYm: snap.periodYm,
    });
  },
);

/**
 * Idempotent burn keyed by ai_usage_log_id. Period first, then reserve.
 * Soft Phase 1: does not block when balance is insufficient (still records partial).
 */
export async function recordAiCreditBurn(input: {
  organizationId: string | null | undefined;
  aiUsageLogId: string;
  actionType: AiActionType;
  success: boolean;
  actorUserId?: string | null;
}): Promise<void> {
  const orgId = input.organizationId?.trim();
  if (!orgId || !isSupabaseAdminConfigured()) return;

  const cost = creditCostForAction(input.actionType, input.success);
  if (cost <= 0) return;

  const row = await ensurePeriodAllowance(orgId);
  if (!row) return;

  if (row.unlimited) {
    const { error: unlimitedLedgerError } = await createAdminClient()
      .from("organization_ai_credit_ledger")
      .insert({
        organization_id: orgId,
        entry_type: "burn",
        amount: 0,
        bucket: null,
        period_ym: row.period_ym,
        ai_usage_log_id: input.aiUsageLogId,
        note: `Unlimited org — no burn (${input.actionType}, would be ${cost})`,
        actor_user_id: input.actorUserId?.trim() || null,
      });
    if (
      unlimitedLedgerError &&
      unlimitedLedgerError.code !== "23505"
    ) {
      console.error(
        "[ai-credits] unlimited ledger note failed:",
        unlimitedLedgerError.message,
      );
    }
    return;
  }

  const split = splitBurnAcrossBuckets({
    allowance: row.allowance,
    used: row.used,
    reserveBalance: row.reserve_balance,
    cost,
  });

  const admin = createAdminClient();
  const { error: ledgerError } = await admin
    .from("organization_ai_credit_ledger")
    .insert({
      organization_id: orgId,
      entry_type: "burn",
      amount: -(split.periodBurn + split.reserveBurn),
      bucket:
        split.reserveBurn > 0 && split.periodBurn > 0
          ? "period"
          : split.reserveBurn > 0
            ? "reserve"
            : "period",
      period_ym: row.period_ym,
      ai_usage_log_id: input.aiUsageLogId,
      note:
        split.periodBurn + split.reserveBurn < cost
          ? `Partial burn ${split.periodBurn + split.reserveBurn}/${cost} (${input.actionType})`
          : `${input.actionType}: ${split.periodBurn} period + ${split.reserveBurn} reserve`,
      actor_user_id: input.actorUserId?.trim() || null,
    });

  if (ledgerError?.code === "23505") {
    // Unique ai_usage_log_id — already burned.
    return;
  }
  if (ledgerError) {
    console.error("[ai-credits] ledger burn failed:", ledgerError.message);
    return;
  }

  const { error: updateError } = await admin
    .from("organization_ai_credit_balances")
    .update({
      used: split.usedAfter,
      reserve_balance: split.reserveAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId);

  if (updateError) {
    console.error("[ai-credits] balance update failed:", updateError.message);
  }
}

/** Max absolute credits for a single Owner custom bonus / adjustment. */
export const OWNER_CREDIT_GRANT_MAX = 100_000;

type ReserveLedgerEntryType = "reserve_grant" | "bonus_grant" | "adjustment";

async function applyReserveDelta(input: {
  organizationId: string;
  delta: number;
  entryType: ReserveLedgerEntryType;
  actorUserId?: string | null;
  note?: string | null;
}): Promise<{ ok: boolean; creditsGranted: number; error?: string }> {
  const orgId = input.organizationId.trim();
  if (!orgId || !isSupabaseAdminConfigured()) {
    return { ok: false, creditsGranted: 0, error: "not_configured" };
  }
  if (!Number.isFinite(input.delta) || input.delta === 0) {
    return { ok: false, creditsGranted: 0, error: "invalid_amount" };
  }
  if (Math.abs(input.delta) > OWNER_CREDIT_GRANT_MAX) {
    return { ok: false, creditsGranted: 0, error: "amount_too_large" };
  }

  const row = await ensurePeriodAllowance(orgId);
  if (!row) {
    return { ok: false, creditsGranted: 0, error: "balance_missing" };
  }

  const nextReserve = row.reserve_balance + input.delta;
  if (nextReserve < 0) {
    return { ok: false, creditsGranted: 0, error: "insufficient_reserve" };
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("organization_ai_credit_balances")
    .update({
      reserve_balance: nextReserve,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId);

  if (updateError) {
    return { ok: false, creditsGranted: 0, error: updateError.message };
  }

  const { error: ledgerError } = await admin
    .from("organization_ai_credit_ledger")
    .insert({
      organization_id: orgId,
      entry_type: input.entryType,
      amount: input.delta,
      bucket: "reserve",
      period_ym: row.period_ym,
      note: input.note?.trim() || null,
      actor_user_id: input.actorUserId?.trim() || null,
    });

  if (ledgerError) {
    console.error("[ai-credits] reserve ledger failed:", ledgerError.message);
  }

  return { ok: true, creditsGranted: input.delta };
}

/** Grant a priced AI Reserve SKU (stacks into reserve_balance). */
export async function grantAiReserve(input: {
  organizationId: string;
  sku: AiReserveSkuId;
  actorUserId?: string | null;
  note?: string | null;
}): Promise<{ ok: boolean; creditsGranted: number; error?: string }> {
  const sku = AI_RESERVE_SKUS[input.sku];
  if (!sku) {
    return { ok: false, creditsGranted: 0, error: "unknown_sku" };
  }

  return applyReserveDelta({
    organizationId: input.organizationId,
    delta: sku.credits,
    entryType: "reserve_grant",
    actorUserId: input.actorUserId,
    note: input.note?.trim() || `${sku.label} (+${sku.credits.toLocaleString()})`,
  });
}

/** Owner custom positive bonus into Reserve (comp / support). */
export async function grantAiBonusCredits(input: {
  organizationId: string;
  credits: number;
  actorUserId?: string | null;
  note?: string | null;
}): Promise<{ ok: boolean; creditsGranted: number; error?: string }> {
  const credits = Math.trunc(input.credits);
  if (credits <= 0) {
    return { ok: false, creditsGranted: 0, error: "invalid_amount" };
  }

  return applyReserveDelta({
    organizationId: input.organizationId,
    delta: credits,
    entryType: "bonus_grant",
    actorUserId: input.actorUserId,
    note:
      input.note?.trim() ||
      `Owner bonus (+${credits.toLocaleString()} credits)`,
  });
}

/**
 * Owner signed Reserve adjustment (positive or negative).
 * Cannot drive reserve_balance below 0.
 */
export async function adjustAiReserveCredits(input: {
  organizationId: string;
  delta: number;
  actorUserId?: string | null;
  note?: string | null;
}): Promise<{ ok: boolean; creditsGranted: number; error?: string }> {
  const delta = Math.trunc(input.delta);
  if (delta === 0) {
    return { ok: false, creditsGranted: 0, error: "invalid_amount" };
  }
  if (!input.note?.trim()) {
    return { ok: false, creditsGranted: 0, error: "note_required" };
  }

  return applyReserveDelta({
    organizationId: input.organizationId,
    delta,
    entryType: "adjustment",
    actorUserId: input.actorUserId,
    note: input.note.trim(),
  });
}
