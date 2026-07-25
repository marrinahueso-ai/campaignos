import Image from "next/image";
import { Check } from "lucide-react";
import {
  StudioMarketingPageHeader,
  StudioMarketingShell,
} from "@/components/marketing/StudioMarketingShell";
import { Button } from "@/components/ui/Button";
import {
  BILLING_TRIAL,
  CHECKOUT_COMING_SOON,
  PAID_PLANS,
  RESERVE_CATALOG,
} from "@/lib/billing/plan-catalog";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path";
import { cn } from "@/lib/utils/cn";

interface StudioPricingPageProps {
  userEmail?: string | null;
  workspaceHref?: string;
}

export function StudioPricingPage({
  userEmail = null,
  workspaceHref = "/dashboard",
}: StudioPricingPageProps) {
  const isSignedIn = Boolean(userEmail);
  const ctaHref = isSignedIn
    ? workspaceHref
    : `/login?intent=setup&next=${encodeURIComponent(ONBOARDING_PATH)}`;

  return (
    <StudioMarketingShell userEmail={userEmail} workspaceHref={workspaceHref}>
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
        <StudioMarketingPageHeader
          eyebrow="Pricing"
          title="Simple plans for busy school teams."
          description={`No corporate contracts. Start with a ${BILLING_TRIAL.days}-day trial (${BILLING_TRIAL.credits.toLocaleString()} AI credits) when checkout ships — or join early with a founding code.`}
        />

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
              Premium add the assistants and capacity active PTOs need. Premium is
              the destination for most schools.
            </p>
          </div>
        </section>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {PAID_PLANS.map((plan) => (
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
                        plan.highlighted ? "text-cos-accent" : "text-cos-success",
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

              <Button
                href={ctaHref}
                size="lg"
                variant={plan.highlighted ? "secondary" : "primary"}
                className={cn(
                  "mt-10 w-full",
                  plan.highlighted &&
                    "border-cos-dark-muted/30 bg-[#f6f2eb] text-cos-text hover:bg-white",
                )}
              >
                {isSignedIn ? "Open workspace" : plan.marketingCta}
              </Button>
            </article>
          ))}
        </div>

        <section className="mt-16 rounded-none border border-cos-border bg-cos-card px-8 py-10">
          <p className="studio-eyebrow">AI Reserve</p>
          <h3 className="font-display mt-3 text-2xl text-cos-text">
            Need more AI headroom mid-year?
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
            Monthly plan credits reset each month and do not roll over. AI Reserve
            stacks and rolls over until used. Purchase options will ship with
            checkout; Premium includes a ${RESERVE_CATALOG[0]!.priceUsd} Reserve
            each year.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {RESERVE_CATALOG.map((sku) => (
              <li
                key={sku.id}
                className="border border-cos-border bg-cos-bg px-4 py-3 text-sm"
              >
                <p className="font-medium text-cos-text">{sku.label}</p>
                <p className="mt-1 text-cos-muted">
                  ${sku.priceUsd} · {sku.credits.toLocaleString()} credits
                </p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm leading-relaxed text-cos-muted">
          {CHECKOUT_COMING_SOON} Pricing is per organization, billed monthly.
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
