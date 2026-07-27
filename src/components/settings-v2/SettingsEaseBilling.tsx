"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AiCreditsWidgetData } from "@/lib/ai/ai-credits-widget-data";
import {
  AI_RESERVE_SKUS,
  SOFT_WARN_REMAINING_CREDITS,
  type AiReserveSkuId,
} from "@/lib/ai/credit-constants";
import type {
  AiUsageCategoryKey,
  CategoryUsageEntry,
} from "@/lib/ai/usage-breakdown-pure";
import {
  createBillingPortalSession,
  createPlanCheckoutSession,
  createReserveCheckoutSession,
} from "@/lib/billing/actions";
import type { CapacityUsageEntry } from "@/lib/billing/capacity-usage-pure";
import { paidPlanIdFromTier } from "@/lib/billing/entitlements";
import {
  formatTrialRemaining,
  type OrgBillingSnapshot,
} from "@/lib/billing/org-billing-pure";
import {
  formatPlanPrice,
  PAID_PLANS,
  planById,
  PRE_STRIPE_DEFAULT_PLAN_ID,
  RESERVE_CATALOG,
  type PaidPlanId,
} from "@/lib/billing/plan-catalog";
import type { DisplayInvoice } from "@/lib/billing/stripe-invoices-pure";
import {
  formatInvoiceAmount,
  invoiceStatusLabel,
} from "@/lib/billing/stripe-invoices-pure";
import type { OrgStripeBillingDisplay } from "@/lib/billing/stripe-payment-summary-pure";
import {
  billingEaseViewFromParam,
  type SettingsEaseBillingView,
} from "@/lib/billing/settings-ease-billing-view";
import {
  isDeploySkewError,
  reloadOnceForDeploySkew,
} from "@/lib/next/deploy-skew";
import { formatDateTime } from "@/lib/utils/dates";

export type { SettingsEaseBillingView };
export { billingEaseViewFromParam };

const VIEWS: SettingsEaseBillingView[] = ["usage", "plans", "payment"];

interface SettingsEaseBillingProps {
  view: SettingsEaseBillingView;
  planLabel: string;
  isFoundingPartner: boolean;
  aiCredits: AiCreditsWidgetData | null;
  billing: OrgBillingSnapshot | null;
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
  currentPlanId: PaidPlanId | null;
  trialEligible: boolean;
  checkoutFlash: string | null;
  capacityUsage: CapacityUsageEntry[];
  aiUsageBreakdown: {
    periodYm: string;
    byCategory: CategoryUsageEntry[];
  } | null;
  stripeInvoices: DisplayInvoice[];
  stripeDisplay: OrgStripeBillingDisplay;
}

const btnPrimaryClassName =
  "inline-flex items-center justify-center gap-1.5 rounded-full border-none bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnSecondaryClassName =
  "inline-flex items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[18px] py-[11px] text-[13px] font-bold text-[#2a2622] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const btnGhostClassName =
  "inline-flex items-center justify-center gap-1.5 rounded-full border-[1.5px] border-transparent bg-transparent px-3 py-2 text-[13px] font-bold text-[#5c554c] transition-colors duration-100 hover:text-[#2a2622] disabled:cursor-not-allowed disabled:opacity-60";

const btnMustardClassName =
  "inline-flex items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[rgba(196,146,46,0.28)] bg-[rgba(196,146,46,0.16)] px-[18px] py-[11px] text-[13px] font-bold text-[#7a5a12] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const softCardClassName =
  "rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]";

const frauncesStyle = {
  fontFamily: "var(--font-fraunces), Georgia, serif",
} as const;

const CATEGORY_DISPLAY: Partial<
  Record<AiUsageCategoryKey, string>
> = {
  artwork_generation: "Artwork generation",
  artwork_regeneration: "Artwork regeneration",
  meta_social_caption: "Captions",
  ask_ralli: "Ask Ralli",
  inbox_ai: "Inbox AI",
};

const BUNDLED_CATEGORY_KEYS = new Set<AiUsageCategoryKey>([
  "calendar_import_parse",
  "tasks_generate",
  "generate_event_brief",
  "generate_creative_brief",
  "draft_communication",
  "playbook_insights",
  "other",
]);

function percentUsed(used: number, limit: number | null | undefined): number {
  if (limit == null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function replaceBillingView(view: SettingsEaseBillingView) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  url.searchParams.delete("tab");
  window.history.replaceState(window.history.state, "", url.toString());
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-[rgba(42,38,34,0.1)] py-[11px] text-sm last:border-b-0">
      <span className="text-[#7a7166]">{label}</span>
      <span className="text-right font-semibold text-[#2a2622]">{value}</span>
    </div>
  );
}

function UsageBar({
  label,
  valueLabel,
  percent,
  hint,
  tone = "forest",
}: {
  label: string;
  valueLabel: string;
  percent: number;
  hint?: string;
  tone?: "forest" | "mustard" | "warn";
}) {
  const background =
    tone === "warn" ? "#a65a3a" : tone === "mustard" ? "#c4922e" : "#2f4a3c";
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-3 text-[13px] font-bold text-[#2a2622]">
        <span>{label}</span>
        <span className="tabular-nums font-semibold text-[#5c554c]">
          {valueLabel}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#ebe4d9]">
        <i
          className="block h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, percent))}%`,
            background,
          }}
          aria-hidden
        />
      </div>
      {hint ? (
        <p className="mt-1.5 text-xs leading-snug text-[#7a7166]">{hint}</p>
      ) : null}
    </div>
  );
}

function EaseActionButton({
  label,
  pendingLabel,
  className,
  disabled,
  onAction,
}: {
  label: string;
  pendingLabel: string;
  className: string;
  disabled?: boolean;
  onAction: () => Promise<
    { success: true; url: string } | { success: false; error: string }
  >;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <button
        type="button"
        className={className}
        disabled={disabled || pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const result = await onAction();
              if (!result.success) {
                setError(result.error);
                return;
              }
              router.push(result.url);
            } catch (caught) {
              // Post-deploy stale Server Action IDs throw before the action
              // body runs — reload once instead of blowing the page boundary.
              if (isDeploySkewError(caught) && reloadOnceForDeploySkew()) {
                return;
              }
              setError(
                caught instanceof Error
                  ? caught.message
                  : "Something went wrong. Refresh the page and try again.",
              );
            }
          });
        }}
      >
        {pending ? pendingLabel : label}
      </button>
      {error ? (
        <p className="text-xs text-[#a65a3a]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function resolvePaidPlanId(
  currentPlanId: PaidPlanId | null,
  billing: OrgBillingSnapshot | null,
): PaidPlanId {
  if (currentPlanId) return currentPlanId;
  if (!billing) return PRE_STRIPE_DEFAULT_PLAN_ID;
  return (
    paidPlanIdFromTier(
      billing.trialActive
        ? "trial"
        : billing.planTier === "starter" ||
            billing.planTier === "professional" ||
            billing.planTier === "premium"
          ? billing.planTier
          : PRE_STRIPE_DEFAULT_PLAN_ID,
    ) ?? PRE_STRIPE_DEFAULT_PLAN_ID
  );
}

function planPriceForDisplay(
  currentPlanId: PaidPlanId | null,
  billing: OrgBillingSnapshot | null,
): { dollars: string; suffix: string } {
  // Always show catalog list price so founding/exempt orgs still see the
  // real plan chrome (waived status lives in the meta line / badge).
  const plan = planById(resolvePaidPlanId(currentPlanId, billing));
  return {
    dollars: formatPlanPrice(plan.priceUsd),
    suffix: "/ month",
  };
}

function planMetaLine(input: {
  planLabel: string;
  isFoundingPartner: boolean;
  billing: OrgBillingSnapshot | null;
  renewsOnLabel: string | null;
}): string {
  if (input.isFoundingPartner) {
    return `${input.planLabel} · Billing waived`;
  }
  if (input.billing?.trialActive) {
    const remaining = formatTrialRemaining(input.billing.trialEndsAt);
    return remaining
      ? `${input.planLabel} · ${remaining}`
      : `${input.planLabel} · Trial`;
  }
  if (input.billing?.trialExpired) {
    return `${input.planLabel} · Choose a plan to restore access`;
  }
  if (input.renewsOnLabel) {
    return `${input.planLabel} · Renews ${input.renewsOnLabel}`;
  }
  if (input.billing?.subscriptionStatus === "active") {
    return `${input.planLabel} · Active`;
  }
  return `${input.planLabel} · Not subscribed yet`;
}

function periodSnapshotLabel(periodYm: string | null | undefined): string {
  if (!periodYm) return "Current UTC period";
  const match = /^(\d{4})-(\d{2})$/.exec(periodYm.trim());
  if (!match) return "Current UTC period";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  const monthYear = date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${monthYear} UTC`;
}

function capacityByKey(
  capacityUsage: CapacityUsageEntry[],
  key: CapacityUsageEntry["key"],
): CapacityUsageEntry | undefined {
  return capacityUsage.find((entry) => entry.key === key);
}

function capacityValueLabel(entry: CapacityUsageEntry | undefined): string {
  if (!entry) return "—";
  if (entry.limit == null) {
    return entry.used > 0
      ? `${entry.used.toLocaleString()} · Unlimited`
      : "Unlimited";
  }
  return `${entry.used.toLocaleString()} / ${entry.limit.toLocaleString()}`;
}

function capacityHint(entry: CapacityUsageEntry | undefined): string | undefined {
  if (!entry) return undefined;
  if (entry.key === "teamMembers" && entry.limit != null) {
    return `Invite blocked at ${entry.limit} — upgrade for unlimited seats (Premium)`;
  }
  if (entry.key === "eventsPerSchoolYear" && entry.limit == null) {
    return "Starter caps at 15 events / year";
  }
  if (entry.key === "socialAccounts" && entry.limit === 1) {
    return "Premium unlocks unlimited Meta accounts";
  }
  return undefined;
}

function softWarnThresholdLabel(
  currentPlanId: PaidPlanId | null,
  billing: OrgBillingSnapshot | null,
  allowance: number,
): string {
  const paidId = resolvePaidPlanId(currentPlanId, billing);
  const tierKey =
    billing?.trialActive
      ? "trial"
      : paidId === "starter" || paidId === "premium"
        ? paidId
        : "professional";
  const fixed =
    SOFT_WARN_REMAINING_CREDITS[
      tierKey as keyof typeof SOFT_WARN_REMAINING_CREDITS
    ] ?? Math.round(allowance * 0.1);
  return `${fixed.toLocaleString()} credits left`;
}

function categoryRows(
  breakdown: {
    periodYm: string;
    byCategory: CategoryUsageEntry[];
  } | null,
) {
  if (!breakdown) return [];
  let bundledCredits = 0;
  const rows: { label: string; credits: number }[] = [];

  for (const entry of breakdown.byCategory) {
    if (entry.credits <= 0) continue;
    if (BUNDLED_CATEGORY_KEYS.has(entry.key)) {
      bundledCredits += entry.credits;
      continue;
    }
    rows.push({
      label: CATEGORY_DISPLAY[entry.key] ?? entry.label,
      credits: entry.credits,
    });
  }
  if (bundledCredits > 0) {
    rows.push({
      label: "Calendar import · tasks · briefs",
      credits: bundledCredits,
    });
  }
  return rows;
}

function planAllowanceSummary(
  planId: PaidPlanId,
  seats: CapacityUsageEntry | undefined,
  metaPosts: CapacityUsageEntry | undefined,
): string {
  const plan = planById(planId);
  const seatsPart =
    seats?.limit == null
      ? "Unlimited team seats"
      : `${seats.limit.toLocaleString()} team seats`;
  const metaPart =
    metaPosts?.limit == null
      ? "Unlimited Meta posts / month"
      : `${metaPosts.limit.toLocaleString()} Meta posts / month`;
  return `${plan.monthlyCredits.toLocaleString()} AI credits / month · ${seatsPart} · ${metaPart}`;
}

function reserveCtaLabel(skuId: AiReserveSkuId): string {
  if (skuId === "reserve_star") return "Buy Reserve ⭐";
  if (skuId === "reserve_max") return "Buy Max";
  return "Buy Reserve";
}

export function SettingsEaseBilling({
  view: initialView,
  planLabel,
  isFoundingPartner,
  aiCredits,
  billing,
  stripeConfigured,
  hasStripeCustomer,
  currentPlanId,
  trialEligible,
  checkoutFlash,
  capacityUsage,
  aiUsageBreakdown,
  stripeInvoices,
  stripeDisplay,
}: SettingsEaseBillingProps) {
  const [view, setView] = useState<SettingsEaseBillingView>(initialView);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const setBillingView = (next: SettingsEaseBillingView) => {
    setView(next);
    replaceBillingView(next);
  };

  const scrollToReserve = () => {
    setBillingView("usage");
    requestAnimationFrame(() => {
      document
        .getElementById("reserve")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const paidId = resolvePaidPlanId(currentPlanId, billing);
  const price = planPriceForDisplay(currentPlanId, billing);
  const metaLine = planMetaLine({
    planLabel,
    isFoundingPartner,
    billing,
    renewsOnLabel: stripeDisplay.renewsOnLabel,
  });

  const seats = capacityByKey(capacityUsage, "teamMembers");
  const metaPosts = capacityByKey(capacityUsage, "metaPostsPerMonth");
  const committeeChairs = capacityByKey(capacityUsage, "committeeChairs");
  const events = capacityByKey(capacityUsage, "eventsPerSchoolYear");
  const socialAccounts = capacityByKey(capacityUsage, "socialAccounts");

  const remainingPeriod =
    aiCredits && !aiCredits.unlimited
      ? Math.max(0, aiCredits.allowance - aiCredits.used)
      : null;
  const creditsPercent =
    aiCredits && !aiCredits.unlimited
      ? percentUsed(aiCredits.used, aiCredits.allowance)
      : 0;
  const creditsTone =
    aiCredits?.exhausted || (aiCredits?.softWarn && creditsPercent >= 90)
      ? "warn"
      : "forest";
  const reserveBalance = aiCredits?.reserveBalance ?? 0;
  const reserveVisualMax = AI_RESERVE_SKUS.reserve.credits;
  const reservePercent = aiCredits?.unlimited
    ? 100
    : Math.min(100, Math.round((reserveBalance / reserveVisualMax) * 100));
  const categoryBreakdown = categoryRows(aiUsageBreakdown);
  // Founding/exempt must NOT hide portal/manage CTAs — billing_exempt is an
  // entitlement flag (unlimited credits / waived invoice), not a UI permission.
  const portalDisabled = !stripeConfigured || !hasStripeCustomer;
  const periodDesc = [
    periodSnapshotLabel(aiCredits?.periodYm ?? aiUsageBreakdown?.periodYm),
    aiCredits?.unlimited ? null : aiCredits?.resetLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  const renewalValue = (() => {
    if (isFoundingPartner) return "Billing waived";
    if (!stripeDisplay.renewsOnLabel) {
      return billing?.subscriptionStatus === "active"
        ? "Active"
        : "—";
    }
    const amount = isFoundingPartner
      ? null
      : `${formatPlanPrice(planById(paidId).priceUsd)}.00`;
    return amount
      ? `${stripeDisplay.renewsOnLabel} · ${amount}`
      : stripeDisplay.renewsOnLabel;
  })();

  return (
    <section data-settings-ease="billing">
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1
            className="text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2a2622]"
            style={frauncesStyle}
          >
            Billing &amp; Plan
          </h1>
          <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-[#5c554c]">
            Usage this period, what happens when you run low, and a calm path to
            upgrade — real catalog numbers, no metric theater.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isFoundingPartner ? (
            <span className="inline-flex items-center rounded-full bg-[rgba(47,74,60,0.1)] px-3 py-2 text-[13px] font-bold text-[#2f4a3c]">
              Founding partner — billing waived
            </span>
          ) : null}
          {stripeConfigured && hasStripeCustomer ? (
            <EaseActionButton
              label="Open Stripe portal"
              pendingLabel="Opening…"
              className={btnSecondaryClassName}
              disabled={portalDisabled}
              onAction={() => createBillingPortalSession()}
            />
          ) : (
            <button
              type="button"
              className={btnSecondaryClassName}
              onClick={() => setBillingView("payment")}
            >
              Open Stripe portal
            </button>
          )}
        </div>
      </div>

      {checkoutFlash ? (
        <p
          className={`${softCardClassName} mb-3.5 text-sm text-[#2a2622]`}
          role="status"
        >
          {checkoutFlash}
        </p>
      ) : null}

      <div
        className="mb-[18px] flex flex-wrap gap-2"
        role="tablist"
        aria-label="Billing views"
      >
        {VIEWS.map((id) => {
          const active = view === id;
          const label =
            id === "usage" ? "Usage" : id === "plans" ? "Plans" : "Payment";
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={
                active
                  ? "rounded-full border-[1.5px] border-[#2f4a3c] bg-[#2f4a3c] px-4 py-2 text-[13px] font-bold text-[#f6f2eb] transition-transform duration-100 hover:-translate-y-px"
                  : "rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.7)] px-4 py-2 text-[13px] font-bold text-[#5c554c] transition-transform duration-100 hover:-translate-y-px hover:text-[#2a2622]"
              }
              onClick={() => setBillingView(id)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {view === "usage" ? (
        <div className="space-y-3.5" data-panel="usage">
          {aiCredits?.exhausted && !isFoundingPartner ? (
            <div className="mb-3.5 rounded-[18px] border border-[rgba(166,90,58,0.28)] bg-[rgba(166,90,58,0.1)] px-[18px] py-4">
              <h4 className="m-0 mb-1.5 text-sm font-extrabold text-[#2a2622]">
                Hard stop — AI paused
              </h4>
              <p className="m-0 text-[13px] leading-relaxed text-[#5c554c]">
                Period credits and Reserve can&apos;t cover the next action. Create
                with AI / Ask Ralli / artwork pause until you buy Reserve or
                upgrade — nothing is billed as surprise overage.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnMustardClassName}
                  onClick={() => setBillingView("plans")}
                >
                  Compare plans
                </button>
                <button
                  type="button"
                  className={btnSecondaryClassName}
                  onClick={scrollToReserve}
                >
                  Buy AI Reserve
                </button>
              </div>
            </div>
          ) : aiCredits?.softWarn && !isFoundingPartner ? (
            <div className="mb-3.5 rounded-[18px] border border-[rgba(196,146,46,0.28)] bg-[rgba(196,146,46,0.12)] px-[18px] py-4">
              <h4 className="m-0 mb-1.5 text-sm font-extrabold text-[#2a2622]">
                Soft warn — AI credits getting low
              </h4>
              <p className="m-0 text-[13px] leading-relaxed text-[#5c554c]">
                Soft-warns around{" "}
                <strong>
                  {softWarnThresholdLabel(
                    currentPlanId,
                    billing,
                    aiCredits.allowance,
                  )}
                </strong>{" "}
                (or 10% of the monthly allowance). This is a heads-up only —
                nothing is billed extra. When period credits and Reserve
                can&apos;t cover the next action, AI generation pauses until you
                buy Reserve or upgrade.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnMustardClassName}
                  onClick={() => setBillingView("plans")}
                >
                  Compare plans
                </button>
                <button
                  type="button"
                  className={btnSecondaryClassName}
                  onClick={scrollToReserve}
                >
                  Buy AI Reserve
                </button>
              </div>
            </div>
          ) : null}

          <div className="mb-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-[1.15fr_1fr]">
            <div className={softCardClassName}>
              <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-[5px] text-xs font-extrabold text-[#2f4a3c]">
                Current plan
              </div>
              <div
                className="text-[36px] font-semibold leading-none tracking-[-0.02em] text-[#2a2622]"
                style={frauncesStyle}
              >
                {price.dollars}{" "}
                <span className="font-sans text-sm font-semibold text-[#7a7166]">
                  {price.suffix}
                </span>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-[#5c554c]">
                {metaLine}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#5c554c]">
                {isFoundingPartner
                  ? "Unlimited AI credits · seats · Meta posts"
                  : planAllowanceSummary(paidId, seats, metaPosts)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnPrimaryClassName}
                  onClick={() => setBillingView("plans")}
                >
                  Change plan
                </button>
                <button
                  type="button"
                  className={btnGhostClassName}
                  onClick={() => setBillingView("payment")}
                >
                  View invoices
                </button>
              </div>
            </div>

            <div className={softCardClassName}>
              <div className="mb-3.5">
                <h3
                  className="text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
                  style={frauncesStyle}
                >
                  Period snapshot
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5c554c]">
                  {periodDesc || "Resets with your billing cycle"}
                </p>
              </div>
              <div className="flex flex-col gap-3.5">
                <UsageBar
                  label="AI credits"
                  valueLabel={
                    aiCredits?.unlimited
                      ? "Unlimited"
                      : aiCredits
                        ? `${aiCredits.used.toLocaleString()} / ${aiCredits.allowance.toLocaleString()}`
                        : "—"
                  }
                  percent={aiCredits?.unlimited ? 100 : creditsPercent}
                  tone={creditsTone}
                  hint={
                    aiCredits?.unlimited
                      ? undefined
                      : remainingPeriod != null
                        ? aiCredits?.softWarn
                          ? `${remainingPeriod.toLocaleString()} left · soft warn active`
                          : aiCredits?.exhausted
                            ? "0 left · hard stop"
                            : `${remainingPeriod.toLocaleString()} left`
                        : undefined
                  }
                />
                <UsageBar
                  label="AI Reserve"
                  valueLabel={
                    aiCredits?.unlimited
                      ? "Unlimited"
                      : `${reserveBalance.toLocaleString()} left`
                  }
                  percent={reservePercent}
                  tone="mustard"
                  hint="Rolls over · burns after monthly credits"
                />
                <UsageBar
                  label="Active seats"
                  valueLabel={capacityValueLabel(seats)}
                  percent={
                    seats?.limit == null ? (seats ? 30 : 0) : percentUsed(seats.used, seats.limit)
                  }
                />
                {metaPosts ? (
                  <UsageBar
                    label="Meta posts this month"
                    valueLabel={capacityValueLabel(metaPosts)}
                    percent={
                      metaPosts.limit == null
                        ? 28
                        : percentUsed(metaPosts.used, metaPosts.limit)
                    }
                  />
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnSecondaryClassName}
                  onClick={scrollToReserve}
                >
                  Buy more Reserve
                </button>
              </div>
            </div>
          </div>

          <div className={`${softCardClassName} mb-3.5`}>
            <div className="mb-3.5">
              <h3
                className="text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
                style={frauncesStyle}
              >
                When you hit the limit
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#5c554c]">
                Honest rules — no surprise overage invoices.
              </p>
            </div>
            <div className="rounded-[18px] border border-[rgba(47,74,60,0.14)] bg-[rgba(47,74,60,0.07)] px-[18px] py-4">
              <h4 className="m-0 mb-1.5 text-sm font-extrabold text-[#2a2622]">
                No soft overage billing
              </h4>
              <p className="m-0 text-[13px] leading-relaxed text-[#5c554c]">
                Hey Ralli does <strong>not</strong> auto-charge for going over.
                Monthly plan credits reset on the 1st (UTC) with no rollover.
                Burn order is <strong>period allowance → Reserve</strong>. If
                both can&apos;t cover the action cost, Create with AI / Ask Ralli /
                artwork pause with a clear CTA to Billing — that&apos;s the hard
                stop.
              </p>
            </div>
            <div className="mt-3.5 grid grid-cols-1 gap-2.5 md:grid-cols-3">
              {[
                {
                  n: "1",
                  title: "Soft warn",
                  body: "Sidebar + Billing note when remaining period credits get low. Keep working — Reserve still covers you.",
                },
                {
                  n: "2",
                  title: "Reserve covers peaks",
                  body: "Prepaid Reserve stacks and rolls over. Buy $250 / $500 / $1,000 packs anytime.",
                },
                {
                  n: "3",
                  title: "Or upgrade",
                  body: "Premium adds 2,500 credits/mo plus $250 Reserve (18k) included each year — best for busy PTOs.",
                },
              ].map((step) => (
                <div
                  key={step.n}
                  className="rounded-2xl bg-[rgba(246,242,235,0.7)] p-3.5"
                >
                  <div
                    className="text-[22px] font-semibold leading-none text-[#2f4a3c]"
                    style={frauncesStyle}
                  >
                    {step.n}
                  </div>
                  <h5 className="mb-1 mt-2 text-[13px] font-extrabold text-[#2a2622]">
                    {step.title}
                  </h5>
                  <p className="m-0 text-xs leading-snug text-[#5c554c]">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <div className={softCardClassName}>
              <div className="mb-2">
                <h3
                  className="text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
                  style={frauncesStyle}
                >
                  Usage by category
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5c554c]">
                  Credit-weighted this period — not raw action counts.
                </p>
              </div>
              {categoryBreakdown.length === 0 ? (
                <p className="text-[13px] text-[#5c554c]">
                  No AI usage logged this period yet.
                </p>
              ) : (
                <div className="flex flex-col">
                  {categoryBreakdown.map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between gap-3 border-b border-[rgba(42,38,34,0.1)] py-2.5 text-[13px] last:border-b-0"
                    >
                      <span className="font-semibold text-[#5c554c]">
                        {row.label}
                      </span>
                      <span className="tabular-nums font-bold text-[#2a2622]">
                        {row.credits.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2.5 text-xs leading-snug text-[#7a7166]">
                Artwork = 8 credits · text AI = 1 credit. Failed AI = 0.
              </p>
            </div>

            <div className={softCardClassName}>
              <div className="mb-2">
                <h3
                  className="text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
                  style={frauncesStyle}
                >
                  Capacity limits
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5c554c]">
                  Hard caps from the {planLabel} plan — invite / publish blocked
                  at the limit, not billed over.
                </p>
              </div>
              <div className="flex flex-col gap-3.5">
                <UsageBar
                  label="Team members"
                  valueLabel={capacityValueLabel(seats)}
                  percent={
                    seats?.limit == null
                      ? seats
                        ? 30
                        : 0
                      : percentUsed(seats.used, seats.limit)
                  }
                  hint={capacityHint(seats)}
                />
                <UsageBar
                  label="Committee chairs"
                  valueLabel={capacityValueLabel(committeeChairs)}
                  percent={
                    committeeChairs?.limit == null
                      ? committeeChairs
                        ? 30
                        : 0
                      : percentUsed(committeeChairs.used, committeeChairs.limit)
                  }
                />
                <UsageBar
                  label="Events / school year"
                  valueLabel={capacityValueLabel(events)}
                  percent={
                    events?.limit == null
                      ? 28
                      : percentUsed(events.used, events.limit)
                  }
                  hint={capacityHint(events)}
                />
                <UsageBar
                  label="Social accounts"
                  valueLabel={capacityValueLabel(socialAccounts)}
                  percent={
                    socialAccounts?.limit == null
                      ? 30
                      : percentUsed(socialAccounts.used, socialAccounts.limit)
                  }
                  hint={capacityHint(socialAccounts)}
                />
              </div>
            </div>
          </div>

          <div className={softCardClassName} id="reserve">
            <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2.5">
              <div>
                <h3
                  className="text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
                  style={frauncesStyle}
                >
                  AI Reserve
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5c554c]">
                  Prepaid peak buffer. Rolls over and stacks. Not a monthly
                  overage line item.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-[5px] text-xs font-extrabold text-[#2f4a3c]">
                {aiCredits?.unlimited
                  ? "Unlimited"
                  : `${reserveBalance.toLocaleString()} credits left`}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
              {RESERVE_CATALOG.map((sku) => (
                <div
                  key={sku.id}
                  className="rounded-2xl border border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.7)] p-3.5 text-left"
                >
                  <div className="text-[13px] font-extrabold text-[#2a2622]">
                    {sku.label}
                  </div>
                  <div
                    className="my-1.5 text-[22px] font-semibold text-[#2a2622]"
                    style={frauncesStyle}
                  >
                    {formatPlanPrice(sku.priceUsd)}
                  </div>
                  <div className="mb-2.5 text-xs text-[#7a7166]">
                    {sku.credits.toLocaleString()} credits · one-time
                  </div>
                  {stripeConfigured ? (
                    <EaseActionButton
                      label={reserveCtaLabel(sku.id)}
                      pendingLabel="Redirecting…"
                      className={btnSecondaryClassName}
                      onAction={() =>
                        createReserveCheckoutSession(sku.id, {
                          returnPath: "/settings/billing-plan?view=usage",
                        })
                      }
                    />
                  ) : (
                    <button type="button" className={btnSecondaryClassName} disabled>
                      Coming soon
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {view === "plans" ? (
        <div className="space-y-3.5" data-panel="plans">
          <div className={softCardClassName}>
            <div className="mb-2">
              <h3
                className="text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
                style={frauncesStyle}
              >
                Compare plans
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#5c554c]">
                Locked catalog — Starter $49 · Professional $79 · Premium $129.
                Drive most active PTOs to Premium.
              </p>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
              {PAID_PLANS.map((plan) => {
                // Prefer Stripe-subscribed plan; fall back to org plan_tier so
                // founding/exempt orgs still highlight the right catalog card.
                const isCurrent = paidId === plan.id;
                const isDowngrade =
                  PAID_PLANS.findIndex((p) => p.id === plan.id) <
                  PAID_PLANS.findIndex((p) => p.id === paidId);
                return (
                  <article
                    key={plan.id}
                    className={
                      plan.highlighted
                        ? "relative flex flex-col rounded-[18px] border-[1.5px] border-[rgba(47,74,60,0.35)] bg-[#fffcf7] p-[18px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                        : "relative flex flex-col rounded-[18px] border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.55)] p-[18px]"
                    }
                  >
                    {plan.badge ? (
                      <span className="absolute -top-2.5 left-4 rounded-full bg-[#2f4a3c] px-2.5 py-1 text-[11px] font-extrabold text-[#f6f2eb]">
                        {plan.badge}
                      </span>
                    ) : null}
                    <h4
                      className="m-0 text-xl font-semibold text-[#2a2622]"
                      style={frauncesStyle}
                    >
                      {plan.displayName}
                    </h4>
                    <div
                      className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.02em] text-[#2a2622]"
                      style={frauncesStyle}
                    >
                      {formatPlanPrice(plan.priceUsd)}{" "}
                      <span className="font-sans text-[13px] font-semibold text-[#7a7166]">
                        / mo
                      </span>
                    </div>
                    <p className="mt-2.5 flex-1 text-[13px] leading-snug text-[#5c554c]">
                      {plan.id === "starter"
                        ? "A capped school year to try the workflow."
                        : plan.id === "professional"
                          ? "Run the school year — capacity feels snug on a busy calendar."
                          : "Recommended destination — AI headroom, Inbox, Custom Dashboard."}
                    </p>
                    <ul className="mt-3.5 flex list-none flex-col gap-2 p-0">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="relative pl-[18px] text-xs leading-snug text-[#5c554c] before:absolute before:left-0 before:top-[5px] before:h-2 before:w-2 before:rounded-full before:bg-[#2f4a3c] before:opacity-55"
                        >
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      {isCurrent ? (
                        <button
                          type="button"
                          className={`${btnSecondaryClassName} w-full`}
                          disabled
                        >
                          Current plan
                        </button>
                      ) : stripeConfigured ? (
                        <EaseActionButton
                          label={
                            trialEligible
                              ? `Start free trial · ${plan.name}`
                              : isDowngrade
                                ? "Downgrade"
                                : plan.id === "premium"
                                  ? "Upgrade to Premium"
                                  : `Choose ${plan.name}`
                          }
                          pendingLabel="Redirecting…"
                          className={`${
                            plan.highlighted || !isDowngrade
                              ? btnPrimaryClassName
                              : btnSecondaryClassName
                          } w-full`}
                          onAction={() =>
                            createPlanCheckoutSession(plan.id, {
                              returnPath: "/settings/billing-plan?view=plans",
                            })
                          }
                        />
                      ) : (
                        <button
                          type="button"
                          className={`${btnSecondaryClassName} w-full`}
                          disabled
                        >
                          Coming soon
                        </button>
                      )}
                    </div>
                    {isCurrent ? (
                      <span className="mt-2.5 inline-flex rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-[5px] text-xs font-extrabold text-[#2f4a3c]">
                        You&apos;re here
                      </span>
                    ) : null}
                  </article>
                );
              })}
            </div>
            <p className="mt-3.5 text-[13px] leading-relaxed text-[#5c554c]">
              New orgs get a <strong>14-day trial</strong> (Professional features
              + 600 credit pool). Card collected at Checkout; billing starts when
              the trial ends. Founding / exempt orgs stay unlimited with billing
              waived — no plan change required.
            </p>
          </div>

          {paidId !== "premium" ? (
            <div className={softCardClassName}>
              <div className="mb-3.5">
                <h3
                  className="text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
                  style={frauncesStyle}
                >
                  Why upgrade from Professional?
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5c554c]">
                  Typical busy elementary PTO burns ~900 credits/month; peak
                  months tip over 1,200.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                {[
                  {
                    n: "+",
                    title: "2× credit headroom",
                    body: "2,500 / mo vs 1,200 — fewer mid-year Reserve top-ups for artwork-heavy seasons.",
                  },
                  {
                    n: "+",
                    title: "$250 Reserve included",
                    body: "18,000 rollover credits each year on Premium — covers peak months without a separate purchase.",
                  },
                  {
                    n: "+",
                    title: "Room to grow",
                    body: "Unlimited seats, Meta posts, and social accounts — plus AI Inbox and Custom Dashboard.",
                  },
                ].map((step) => (
                  <div
                    key={step.title}
                    className="rounded-2xl bg-[rgba(246,242,235,0.7)] p-3.5"
                  >
                    <div
                      className="text-[22px] font-semibold leading-none text-[#2f4a3c]"
                      style={frauncesStyle}
                    >
                      {step.n}
                    </div>
                    <h5 className="mb-1 mt-2 text-[13px] font-extrabold text-[#2a2622]">
                      {step.title}
                    </h5>
                    <p className="m-0 text-xs leading-snug text-[#5c554c]">
                      {step.body}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {stripeConfigured ? (
                  <EaseActionButton
                    label="Upgrade to Premium — $129/mo"
                    pendingLabel="Redirecting…"
                    className={btnPrimaryClassName}
                    onAction={() =>
                      createPlanCheckoutSession("premium", {
                        returnPath: "/settings/billing-plan?view=plans",
                      })
                    }
                  />
                ) : (
                  <button type="button" className={btnPrimaryClassName} disabled>
                    Upgrade to Premium — $129/mo
                  </button>
                )}
                <button
                  type="button"
                  className={btnGhostClassName}
                  onClick={() => setBillingView("usage")}
                >
                  Back to usage
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {view === "payment" ? (
        <div className="flex flex-col gap-3.5" data-panel="payment">
          <div className={softCardClassName}>
            <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2.5">
              <div>
                <h3
                  className="text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
                  style={frauncesStyle}
                >
                  Payment method
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5c554c]">
                  Managed securely in Stripe. Updates open the Customer Portal.
                </p>
              </div>
              {stripeConfigured && hasStripeCustomer ? (
                <EaseActionButton
                  label="Update"
                  pendingLabel="Opening…"
                  className={btnSecondaryClassName}
                  onAction={() => createBillingPortalSession()}
                />
              ) : (
                <button
                  type="button"
                  className={btnSecondaryClassName}
                  onClick={() => setBillingView("plans")}
                >
                  Update
                </button>
              )}
            </div>
            <DetailRow
              label="Card"
              value={
                stripeDisplay.cardLabel ??
                (isFoundingPartner
                  ? "Billing waived · no card required"
                  : hasStripeCustomer
                    ? "Managed in Stripe"
                    : "No card on file")
              }
            />
            <DetailRow
              label="Billing email"
              value={
                stripeDisplay.billingEmail ??
                (hasStripeCustomer ? "Set in Stripe portal" : "—")
              }
            />
            <DetailRow label="Next renewal" value={renewalValue} />
          </div>

          <div className={softCardClassName}>
            <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2.5">
              <div>
                <h3
                  className="text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
                  style={frauncesStyle}
                >
                  Invoices
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5c554c]">
                  Real Stripe invoices for this organization.
                </p>
              </div>
              {stripeConfigured && hasStripeCustomer ? (
                <EaseActionButton
                  label="Open Stripe portal"
                  pendingLabel="Opening…"
                  className={btnGhostClassName}
                  disabled={portalDisabled}
                  onAction={() => createBillingPortalSession()}
                />
              ) : null}
            </div>
            {stripeInvoices.length === 0 ? (
              <p className="text-sm text-[#5c554c]">
                {isFoundingPartner
                  ? "No invoices while billing is waived."
                  : hasStripeCustomer
                    ? "No invoices yet."
                    : "Subscribe to a plan to see invoices here."}
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-0 p-0">
                {stripeInvoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[rgba(42,38,34,0.1)] py-3 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#2a2622]">
                        {invoice.number ?? "Invoice"} ·{" "}
                        {formatInvoiceAmount(
                          invoice.amountCents,
                          invoice.currency,
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-[#7a7166]">
                        {formatDateTime(invoice.createdAt)}
                        {invoice.description
                          ? ` · ${invoice.description}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-1 text-[11px] font-extrabold text-[#2f4a3c]">
                        {invoiceStatusLabel(invoice.status)}
                      </span>
                      {invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={btnGhostClassName}
                        >
                          View
                        </a>
                      ) : null}
                      {invoice.invoicePdfUrl ? (
                        <a
                          href={invoice.invoicePdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={btnSecondaryClassName}
                        >
                          PDF
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={softCardClassName}>
            <div className="mb-0">
              <h3
                className="text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
                style={frauncesStyle}
              >
                Manage subscription
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#5c554c]">
                Cancel, change card, or download tax invoices in Stripe.
                Canceled paid orgs lock to resubscribe until Checkout succeeds
                again.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {stripeConfigured && hasStripeCustomer ? (
                <EaseActionButton
                  label="Open Stripe portal"
                  pendingLabel="Opening…"
                  className={btnSecondaryClassName}
                  onAction={() => createBillingPortalSession()}
                />
              ) : (
                <button
                  type="button"
                  className={btnSecondaryClassName}
                  disabled
                >
                  Open Stripe portal
                </button>
              )}
              <button
                type="button"
                className={btnPrimaryClassName}
                onClick={() => setBillingView("plans")}
              >
                Change plan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
