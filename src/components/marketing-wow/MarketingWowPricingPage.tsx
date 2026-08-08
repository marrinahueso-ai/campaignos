import { Fragment } from "react";
import { Check } from "lucide-react";
import {
  MarketingPlanCta,
  MarketingReserveCta,
} from "@/components/marketing/MarketingPricingCta";
import { MarketingWowFooter } from "@/components/marketing-wow/MarketingWowFooter";
import { MarketingWowHeader } from "@/components/marketing-wow/MarketingWowHeader";
import { Button } from "@/components/ui/Button";
import { ARTWORK_REGEN_CAPS, PLAN_MONTHLY_CREDITS } from "@/lib/ai/credit-constants";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path-shared";
import { entitlementsForEffectiveTier } from "@/lib/billing/entitlements";
import {
  BILLING_TRIAL,
  PAID_PLANS,
  RESERVE_CATALOG,
  type PaidPlanId,
} from "@/lib/billing/plan-catalog";
import { cn } from "@/lib/utils/cn";

export type PricingCtaMode =
  | "checkout"
  | "signin"
  | "billing"
  | "founding"
  | "current";

interface MarketingWowPricingPageProps {
  userEmail?: string | null;
  workspaceHref?: string;
  stripeConfigured?: boolean;
  ctaMode?: PricingCtaMode;
  currentPlanId?: PaidPlanId | null;
  /** When true, Checkout CTAs advertise the 14-day Stripe trial. */
  trialEligible?: boolean;
  flash?: string | null;
}

function planCtaMode(
  base: PricingCtaMode,
  planId: PaidPlanId,
  currentPlanId: PaidPlanId | null | undefined,
): PricingCtaMode {
  if (base === "checkout" && currentPlanId === planId) return "current";
  return base;
}

function planCtaLabel(
  mode: PricingCtaMode,
  planName: string,
  marketingCta: string,
  trialEligible: boolean,
): string {
  if (mode === "checkout") {
    return trialEligible
      ? `Start 14-day free trial · ${planName}`
      : `Subscribe to ${planName}`;
  }
  if (mode === "billing") return "Go to Billing";
  if (mode === "founding") return "Open workspace";
  if (mode === "current") return "Current plan";
  return marketingCta;
}

function planCtaHref(
  mode: PricingCtaMode,
  workspaceHref: string,
): string | undefined {
  if (mode === "signin") {
    return `/login?next=${encodeURIComponent("/settings/billing-plan?view=plans")}`;
  }
  if (mode === "billing") return "/settings/billing-plan?view=plans";
  if (mode === "founding") return workspaceHref;
  return undefined;
}

/** Short taglines from the approved reference design — cosmetic copy only (not feature data). */
const PLAN_TAGLINES: Record<PaidPlanId, string> = {
  starter: "A comfortable place to begin.",
  professional: "What you need to run your PTO.",
  premium: "Everything is taken care of.",
};

type ComparisonValue = boolean | string;

interface ComparisonRow {
  label: string;
  values: readonly [ComparisonValue, ComparisonValue, ComparisonValue];
}

interface ComparisonGroup {
  title: string;
  rows: readonly ComparisonRow[];
}

function capacityValue(value: number | null): string {
  return value === null ? "Unlimited" : value.toLocaleString();
}

const TIER_ENTITLEMENTS = {
  starter: entitlementsForEffectiveTier("starter"),
  professional: entitlementsForEffectiveTier("professional"),
  premium: entitlementsForEffectiveTier("premium"),
} as const;

/**
 * Full approved plan matrix (docs/ops/billing-and-access.md §5). Rows backed by a
 * `src/lib/billing/entitlements.ts` key are derived from it so this table can't drift;
 * rows with no independent code gate yet (Approval Routing, Two-Level Approval Chains,
 * Advanced Permission Controls, the numeric Custom Roles cap) are documented policy only
 * — see entitlements.ts "Known gaps" — and are transcribed verbatim from that doc.
 * File Storage / File History are intentionally omitted: allowances aren't finalized.
 */
const COMPARISON_GROUPS: readonly ComparisonGroup[] = [
  {
    title: "Core Capabilities",
    rows: [
      { label: "Calendar & Planning", values: [true, true, true] },
      { label: "Event Workspace", values: [true, true, true] },
      { label: "Create with AI", values: [true, true, true] },
      {
        label: "Ask Ralli AI Assistant",
        values: [
          TIER_ENTITLEMENTS.starter.features.ask_ralli,
          TIER_ENTITLEMENTS.professional.features.ask_ralli,
          TIER_ENTITLEMENTS.premium.features.ask_ralli,
        ],
      },
      {
        label: "Volunteer Center",
        values: [
          TIER_ENTITLEMENTS.starter.features.volunteer_center,
          TIER_ENTITLEMENTS.professional.features.volunteer_center,
          TIER_ENTITLEMENTS.premium.features.volunteer_center,
        ],
      },
      { label: "Files & Documents", values: [true, true, true] },
      { label: "Vendor Directory", values: [true, true, true] },
      { label: "Notes & Activity", values: [true, true, true] },
      { label: "Dashboard Widgets", values: [true, true, true] },
      {
        label: "Custom Dashboard",
        values: [
          TIER_ENTITLEMENTS.starter.features.custom_dashboard,
          TIER_ENTITLEMENTS.professional.features.custom_dashboard,
          TIER_ENTITLEMENTS.premium.features.custom_dashboard,
        ],
      },
      { label: "Standard Analytics / Social Analytics", values: [true, true, true] },
      { label: "Basic Approval Workflow", values: [true, true, true] },
      {
        label: "Communication Hub",
        values: [
          TIER_ENTITLEMENTS.starter.features.communication_hub,
          TIER_ENTITLEMENTS.professional.features.communication_hub,
          TIER_ENTITLEMENTS.premium.features.communication_hub,
        ],
      },
      {
        label: "Meta Publishing",
        values: [
          `${capacityValue(TIER_ENTITLEMENTS.starter.capacity.metaPostsPerMonth)} posts/mo`,
          `${capacityValue(TIER_ENTITLEMENTS.professional.capacity.metaPostsPerMonth)} posts/mo`,
          "Unlimited",
        ],
      },
      {
        label: "AI Inbox Replies",
        values: [
          TIER_ENTITLEMENTS.starter.features.inbox_ai,
          TIER_ENTITLEMENTS.professional.features.inbox_ai,
          TIER_ENTITLEMENTS.premium.features.inbox_ai,
        ],
      },
      {
        label: "Change Requests & Reapproval",
        values: [
          TIER_ENTITLEMENTS.starter.features.change_requests,
          TIER_ENTITLEMENTS.professional.features.change_requests,
          TIER_ENTITLEMENTS.premium.features.change_requests,
        ],
      },
      {
        label: "Custom Roles & Permissions",
        values: [
          TIER_ENTITLEMENTS.starter.features.custom_roles,
          TIER_ENTITLEMENTS.professional.features.custom_roles,
          TIER_ENTITLEMENTS.premium.features.custom_roles,
        ],
      },
      // Documented policy rows without an independent code gate yet (see note above).
      { label: "Approval Routing", values: [false, true, true] },
      { label: "Two-Level Approval Chains", values: [false, true, true] },
      { label: "Advanced Permission Controls", values: [false, true, true] },
      {
        label: "Priority Support",
        values: [
          TIER_ENTITLEMENTS.starter.features.priority_support,
          TIER_ENTITLEMENTS.professional.features.priority_support,
          TIER_ENTITLEMENTS.premium.features.priority_support,
        ],
      },
    ],
  },
  {
    title: "Limits & Capacity",
    rows: [
      {
        label: "Events / School Year",
        values: [
          capacityValue(TIER_ENTITLEMENTS.starter.capacity.eventsPerSchoolYear),
          capacityValue(TIER_ENTITLEMENTS.professional.capacity.eventsPerSchoolYear),
          capacityValue(TIER_ENTITLEMENTS.premium.capacity.eventsPerSchoolYear),
        ],
      },
      {
        label: "Team Members",
        values: [
          capacityValue(TIER_ENTITLEMENTS.starter.capacity.teamMembers),
          capacityValue(TIER_ENTITLEMENTS.professional.capacity.teamMembers),
          capacityValue(TIER_ENTITLEMENTS.premium.capacity.teamMembers),
        ],
      },
      {
        label: "Committee Chairs",
        values: [
          capacityValue(TIER_ENTITLEMENTS.starter.capacity.committeeChairs),
          capacityValue(TIER_ENTITLEMENTS.professional.capacity.committeeChairs),
          capacityValue(TIER_ENTITLEMENTS.premium.capacity.committeeChairs),
        ],
      },
      // Documented policy cap — no PlanCapacityKey / enforcement yet (see note above).
      { label: "Custom Roles", values: ["—", "8", "Unlimited"] },
      {
        label: "Social Accounts",
        values: [
          capacityValue(TIER_ENTITLEMENTS.starter.capacity.socialAccounts),
          capacityValue(TIER_ENTITLEMENTS.professional.capacity.socialAccounts),
          capacityValue(TIER_ENTITLEMENTS.premium.capacity.socialAccounts),
        ],
      },
      {
        label: "Scheduled Posts / Month",
        values: [
          capacityValue(TIER_ENTITLEMENTS.starter.capacity.metaPostsPerMonth),
          capacityValue(TIER_ENTITLEMENTS.professional.capacity.metaPostsPerMonth),
          capacityValue(TIER_ENTITLEMENTS.premium.capacity.metaPostsPerMonth),
        ],
      },
      {
        label: "AI Credits",
        values: [
          PLAN_MONTHLY_CREDITS.starter.toLocaleString(),
          PLAN_MONTHLY_CREDITS.professional.toLocaleString(),
          PLAN_MONTHLY_CREDITS.premium.toLocaleString(),
        ],
      },
      {
        label: "Artwork regens / milestone",
        values: [
          String(ARTWORK_REGEN_CAPS.starter.perMilestone),
          String(ARTWORK_REGEN_CAPS.professional.perMilestone),
          String(ARTWORK_REGEN_CAPS.premium.perMilestone),
        ],
      },
      {
        label: "Generate-all / event / 24h",
        values: [
          String(ARTWORK_REGEN_CAPS.starter.generateAllPerEventPerDay),
          String(ARTWORK_REGEN_CAPS.professional.generateAllPerEventPerDay),
          String(ARTWORK_REGEN_CAPS.premium.generateAllPerEventPerDay),
        ],
      },
      { label: "AI Reserve Purchase", values: [true, true, true] },
    ],
  },
] as const;

function ComparisonCell({ value }: { value: ComparisonValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto h-4 w-4 text-cos-brand-sage" strokeWidth={2} aria-label="Included" />
    ) : (
      <span className="text-cos-border" aria-label="Not included">
        —
      </span>
    );
  }
  return <span>{value}</span>;
}

export function MarketingWowPricingPage({
  userEmail = null,
  workspaceHref = "/dashboard",
  ctaMode = "signin",
  currentPlanId = null,
  trialEligible = true,
  flash = null,
}: MarketingWowPricingPageProps) {
  const isSignedIn = Boolean(userEmail);
  const needsSchoolSetup = workspaceHref === ONBOARDING_PATH;
  const dashboardCtaLabel = needsSchoolSetup ? "Continue setup" : "Open your dashboard";
  const setupHref = `/get-started`;

  return (
    <div className="bg-cos-bg">
      <MarketingWowHeader userEmail={userEmail} workspaceHref={workspaceHref} />

      {/* ============ Hero ============ */}
      <section className="px-6 pt-10 pb-16 text-center sm:pt-14 sm:pb-20">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-[2.5rem] leading-[1.08] tracking-tight text-cos-text italic sm:text-6xl md:text-[3.75rem]">
            Simple plans for
            <br className="hidden sm:block" /> busy{" "}
            <span className="text-cos-brand-sage">school leaders.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-cos-muted sm:text-xl">
            Whether you&rsquo;re just starting your term or leading a
            thriving PTA, we have a place for you to work with calm and
            confidence.
          </p>
        </div>

        {flash ? (
          <p
            className="mx-auto mt-8 max-w-2xl rounded-2xl border border-cos-border bg-cos-card px-4 py-3 text-sm text-cos-text"
            role="status"
          >
            {flash}
          </p>
        ) : null}

        {/* ============ Plan cards ============ */}
        <div className="mx-auto mt-14 grid max-w-6xl items-stretch gap-6 text-left sm:mt-16 lg:grid-cols-3">
          {PAID_PLANS.map((plan) => {
            const mode = planCtaMode(ctaMode, plan.id, currentPlanId);
            const label = planCtaLabel(mode, plan.name, plan.marketingCta, trialEligible);
            const href = planCtaHref(mode, workspaceHref);

            return (
              <article
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-[28px] border bg-cos-card p-8 sm:p-9",
                  plan.highlighted
                    ? "border-2 border-cos-primary shadow-[0_45px_90px_-20px_rgba(42,38,34,0.22)]"
                    : "border-cos-border shadow-sm",
                )}
              >
                {plan.badge ? (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-cos-primary px-4 py-1.5 text-[10px] font-bold tracking-widest text-[#f6f2eb] uppercase">
                    Recommended
                  </span>
                ) : null}

                <h2 className="font-display text-2xl text-cos-text italic">{plan.name}</h2>
                <p className="mt-2 text-sm font-medium text-cos-muted">
                  {PLAN_TAGLINES[plan.id]}
                </p>

                <p className="mt-8 flex items-baseline gap-1">
                  <span className="font-display text-4xl text-cos-text italic">
                    ${plan.priceUsd}
                  </span>
                  <span className="text-sm text-cos-muted">/month</span>
                </p>

                <ul className="mt-9 flex-1 space-y-3.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-cos-text">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-cos-brand-sage"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <MarketingPlanCta
                    planId={plan.id}
                    label={label}
                    highlighted={plan.highlighted}
                    mode={mode}
                    href={href}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ============ AI usage + Reserve ============ */}
      <section className="border-t border-cos-border bg-cos-bg-alt/40 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl text-cos-text italic sm:text-4xl lg:text-5xl">
              Built for your busiest seasons.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-cos-muted italic sm:text-lg">
              Need more AI during a busy month? Add Reserve credits at any
              time without changing your subscription plan.
            </p>
          </div>

          <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Included monthly credits */}
            <div>
              <h3 className="border-b border-cos-border pb-2 text-[11px] font-bold tracking-[0.2em] text-cos-text uppercase">
                Included Monthly Credits
              </h3>
              <div className="mt-6 space-y-4">
                {PAID_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between rounded-2xl border border-cos-border bg-cos-card px-5 py-4 shadow-sm"
                  >
                    <span className="font-semibold text-cos-text">{plan.name}</span>
                    <div className="text-right">
                      <span className="font-display block text-xl leading-none text-cos-text italic">
                        {plan.monthlyCredits.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold tracking-wider text-cos-muted uppercase">
                        Credits / Month
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-cos-border bg-cos-card/70 p-6">
                <h4 className="flex items-center gap-2 text-sm font-bold text-cos-text">
                  The Simple Rule
                </h4>
                <p className="mt-3 text-sm leading-relaxed text-cos-muted">
                  Your monthly plan credits are always spent first. If you
                  exhaust them, your Reserve credits automatically fill the
                  gap. Monthly credits reset on your billing date and do not
                  roll over — Reserve credits roll over and stack until they
                  are used.
                </p>
              </div>
            </div>

            {/* AI Reserve add-ons */}
            <div>
              <h3 className="border-b border-cos-border pb-2 text-[11px] font-bold tracking-[0.2em] text-cos-text uppercase">
                Optional AI Reserve Add-ons
              </h3>
              <div className="mt-6 grid gap-4">
                {RESERVE_CATALOG.map((sku, index) => (
                  <div
                    key={sku.id}
                    className={cn(
                      "relative flex items-center justify-between rounded-2xl border bg-cos-card p-6",
                      index === 1
                        ? "border-2 border-cos-brand-sage shadow-md"
                        : "border-cos-border shadow-sm",
                    )}
                  >
                    {index === 1 ? (
                      <span className="absolute -top-3 right-6 rounded-full bg-cos-brand-sage px-3 py-1 text-[9px] font-bold tracking-widest text-white uppercase">
                        Best Value
                      </span>
                    ) : null}
                    <div>
                      <h5 className="text-lg font-bold text-cos-text">{sku.label}</h5>
                      <p className="mt-1 text-xs text-cos-muted">
                        {sku.credits.toLocaleString()} Reserve credits
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <div>
                        <span className="font-display text-2xl text-cos-text italic">
                          ${sku.priceUsd}
                        </span>
                        <span className="mt-1 block text-[10px] font-bold text-cos-muted">
                          One-time purchase
                        </span>
                      </div>
                      <MarketingReserveCta
                        sku={sku.id}
                        label={
                          ctaMode === "checkout"
                            ? "Buy"
                            : ctaMode === "billing"
                              ? "Go to Billing"
                              : ctaMode === "founding"
                                ? "Unlimited"
                                : "Sign in to buy"
                        }
                        mode={
                          ctaMode === "checkout"
                            ? "checkout"
                            : ctaMode === "founding"
                              ? "founding"
                              : ctaMode === "billing"
                                ? "billing"
                                : "signin"
                        }
                        href={
                          ctaMode === "signin"
                            ? `/login?next=${encodeURIComponent("/settings/billing-plan?view=plans")}`
                            : "/settings/billing-plan?view=plans"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-relaxed text-cos-muted">
                Reserve credits are optional prepaid purchases — they are
                separate from, and not automatically included with, any
                monthly plan (Premium includes one ${RESERVE_CATALOG[0]!.priceUsd}{" "}
                Reserve each year on top of this).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Detailed comparison ============ */}
      <section className="overflow-x-auto px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-display text-3xl text-cos-text italic sm:text-4xl">
            Detailed Comparison
          </h2>

          <table className="mt-14 w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="text-left">
                <th className="w-1/4 px-4 py-4 text-xs font-bold tracking-widest text-cos-muted uppercase">
                  Features
                </th>
                {PAID_PLANS.map((plan) => (
                  <th
                    key={plan.id}
                    className="px-4 py-4 text-center text-sm font-bold text-cos-text"
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_GROUPS.map((group) => (
                <Fragment key={group.title}>
                  <tr className="bg-cos-bg-alt/50">
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-[10px] font-bold tracking-widest text-cos-muted uppercase"
                    >
                      {group.title}
                    </td>
                  </tr>
                  {group.rows.map((row, index) => (
                    <tr
                      key={row.label}
                      className={index % 2 === 1 ? "bg-cos-bg-alt/25" : undefined}
                    >
                      <td className="px-4 py-4 font-medium text-cos-text">{row.label}</td>
                      {row.values.map((value, valueIndex) => (
                        <td key={valueIndex} className="px-4 py-4 text-center text-cos-text">
                          <ComparisonCell value={value} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============ Final CTA ============ */}
      <section className="px-6 py-20 text-center sm:py-28">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-3xl text-cos-text italic sm:text-4xl lg:text-5xl">
            Try it for {BILLING_TRIAL.days} days, free.
          </h2>
          <p className="mt-6 leading-relaxed text-cos-muted">
            Experience all Professional features for two weeks —{" "}
            {BILLING_TRIAL.credits.toLocaleString()} AI credits included, no
            long-term contracts. Just a calmer school year.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row sm:gap-6">
            <Button
              href={isSignedIn ? workspaceHref : setupHref}
              variant="primary"
              className="h-auto rounded-full px-10 py-4 text-sm"
            >
              {isSignedIn ? dashboardCtaLabel : "Start your free trial"}
            </Button>
            <a
              href="mailto:hello@heyralli.com"
              className="px-10 py-4 text-sm font-bold text-cos-muted transition-colors hover:text-cos-text"
            >
              Contact sales
            </a>
          </div>
        </div>
      </section>

      <MarketingWowFooter />
    </div>
  );
}
