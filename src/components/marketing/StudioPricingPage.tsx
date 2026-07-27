import Image from "next/image";
import { Check } from "lucide-react";
import {
  MarketingPlanCta,
  MarketingReserveCta,
} from "@/components/marketing/MarketingPricingCta";
import {
  StudioMarketingPageHeader,
  StudioMarketingShell,
} from "@/components/marketing/StudioMarketingShell";
import {
  BILLING_TRIAL,
  PAID_PLANS,
  RESERVE_CATALOG,
  type PaidPlanId,
} from "@/lib/billing/plan-catalog";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path";
import { cn } from "@/lib/utils/cn";

export type PricingCtaMode =
  | "checkout"
  | "signin"
  | "billing"
  | "founding"
  | "current";

interface StudioPricingPageProps {
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

export function StudioPricingPage({
  userEmail = null,
  workspaceHref = "/dashboard",
  stripeConfigured = false,
  ctaMode = "signin",
  currentPlanId = null,
  trialEligible = true,
  flash = null,
}: StudioPricingPageProps) {
  const isSignedIn = Boolean(userEmail);
  const setupHref = `/signup?next=${encodeURIComponent(ONBOARDING_PATH)}`;

  return (
    <StudioMarketingShell userEmail={userEmail} workspaceHref={workspaceHref}>
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
        <StudioMarketingPageHeader
          eyebrow="Pricing"
          title="Simple plans for busy school teams."
          description={`No corporate contracts. New schools get a ${BILLING_TRIAL.days}-day trial with ${BILLING_TRIAL.credits.toLocaleString()} AI credits, then pick the plan that fits — Premium is best for most PTOs.`}
        />

        {flash ? (
          <p
            className="mt-8 rounded-none border border-cos-border bg-cos-card px-4 py-3 text-sm text-cos-text"
            role="status"
          >
            {flash}
          </p>
        ) : null}

        <section className="mt-16 grid overflow-hidden border border-cos-border lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[280px] sm:min-h-[340px] lg:min-h-[420px]">
            <Image
              src="/images/pricing-community.png"
              alt="A PTO volunteer planning school communications at home"
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-[center_35%]"
              priority
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#f6f2eb]/90 via-transparent to-[#f6f2eb]/20 lg:bg-gradient-to-r lg:from-transparent lg:via-[#f6f2eb]/15 lg:to-[#f6f2eb]/75"
              aria-hidden
            />
          </div>

          <div className="flex flex-col justify-center bg-cos-card px-8 py-10 lg:px-12 lg:py-14">
            <p className="studio-eyebrow">Built for real life</p>
            <h2 className="font-display mt-4 text-3xl leading-tight text-cos-text sm:text-4xl">
              Plans that fit between carpools and committee meetings.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cos-muted sm:text-base">
              You&apos;re not buying enterprise software — you&apos;re buying back
              evenings. Every tier includes Create with AI; Professional and
              Premium add the assistants and capacity active PTOs need. Subscribe
              securely with Stripe{stripeConfigured ? "" : " once billing is enabled"}.
            </p>
          </div>
        </section>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {PAID_PLANS.map((plan) => {
            const mode = planCtaMode(ctaMode, plan.id, currentPlanId);
            return (
              <article
                key={plan.id}
                className={cn(
                  "flex flex-col border p-8",
                  plan.highlighted
                    ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
                    : "border-cos-border bg-cos-card",
                )}
              >
                {plan.badge ? (
                  <p
                    className={cn(
                      "studio-eyebrow mb-4",
                      plan.highlighted ? "text-cos-dark-muted" : "text-cos-muted",
                    )}
                  >
                    {plan.badge}
                  </p>
                ) : null}
                <h2
                  className={cn(
                    "font-display text-3xl",
                    plan.highlighted ? "text-[#f6f2eb]" : "text-cos-text",
                  )}
                >
                  {plan.displayName}
                </h2>
                <div className="mt-4 flex items-baseline gap-1">
                  <span
                    className={cn(
                      "font-display text-5xl",
                      plan.highlighted ? "text-[#f6f2eb]" : "text-cos-text",
                    )}
                  >
                    ${plan.priceUsd}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      plan.highlighted ? "text-cos-dark-muted" : "text-cos-muted",
                    )}
                  >
                    / month
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-4 text-sm leading-relaxed",
                    plan.highlighted ? "text-cos-dark-muted" : "text-cos-muted",
                  )}
                >
                  {plan.description}
                </p>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          plan.highlighted
                            ? "text-cos-accent"
                            : "text-cos-success",
                        )}
                        strokeWidth={1.5}
                      />
                      <span
                        className={
                          plan.highlighted ? "text-[#f6f2eb]/90" : "text-cos-text"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <MarketingPlanCta
                  planId={plan.id}
                  label={planCtaLabel(
                    mode,
                    plan.name,
                    plan.marketingCta,
                    trialEligible,
                  )}
                  highlighted={plan.highlighted}
                  mode={mode}
                  href={planCtaHref(mode, workspaceHref)}
                />
              </article>
            );
          })}
        </div>

        <section className="mt-16 border border-cos-border bg-cos-card px-8 py-10">
          <p className="studio-eyebrow">AI Reserve</p>
          <h3 className="font-display mt-3 text-2xl text-cos-text">
            Need more AI headroom mid-year?
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
            Monthly credits reset every month and any unused ones expire. AI
            Reserve never expires — it kicks in automatically once your
            monthly credits run out. Premium includes a $
            {RESERVE_CATALOG[0]!.priceUsd} Reserve each year; buy more anytime.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {RESERVE_CATALOG.map((sku) => (
              <li
                key={sku.id}
                className="flex flex-col border border-cos-border bg-cos-bg px-4 py-4 text-sm"
              >
                <p className="font-medium text-cos-text">{sku.label}</p>
                <p className="mt-1 font-display text-2xl text-cos-text">
                  ${sku.priceUsd}
                </p>
                <p className="mt-1 text-cos-muted">
                  {sku.credits.toLocaleString()} credits · one-time
                </p>
                <div className="mt-4">
                  <MarketingReserveCta
                    sku={sku.id}
                    label={
                      ctaMode === "checkout"
                        ? `Buy ${sku.label}`
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
              </li>
            ))}
          </ul>
        </section>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm leading-relaxed text-cos-muted">
          {isSignedIn ? (
            <>
              Pricing is per organization, billed monthly via Stripe. Manage
              payment methods anytime in Billing &amp; Plan.{" "}
            </>
          ) : (
            <>
              New to Hey Ralli?{" "}
              <a
                href={setupHref}
                className="text-cos-text underline-offset-2 hover:underline"
              >
                Start with a founding code
              </a>
              {" · "}
              Pricing is per organization, billed monthly.{" "}
            </>
          )}
          Questions?{" "}
          <a
            href="mailto:hello@heyralli.com"
            className="text-cos-text underline-offset-2 hover:underline"
          >
            Reach out anytime
          </a>
          .
        </p>
      </div>
    </StudioMarketingShell>
  );
}
