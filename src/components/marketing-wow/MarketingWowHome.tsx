import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingProductDemoVideo } from "@/components/marketing/MarketingProductDemoVideo";
import { MarketingCookieConsent } from "@/components/marketing-wow/MarketingCookieConsent";
import { MarketingProductTour } from "@/components/marketing-wow/MarketingProductTour";
import { MarketingWowFooter } from "@/components/marketing-wow/MarketingWowFooter";
import { MarketingWowHeader } from "@/components/marketing-wow/MarketingWowHeader";
import { Button } from "@/components/ui/Button";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path-shared";
import { PAID_PLANS } from "@/lib/billing/plan-catalog";
import { cn } from "@/lib/utils/cn";

interface MarketingWowHomeProps {
  userEmail?: string | null;
  workspaceHref?: string;
}

export function MarketingWowHome({
  userEmail = null,
  workspaceHref = "/dashboard",
}: MarketingWowHomeProps) {
  const isSignedIn = Boolean(userEmail);
  const needsSchoolSetup = workspaceHref === ONBOARDING_PATH;
  const dashboardCtaLabel = needsSchoolSetup
    ? "Continue setup"
    : "Open your dashboard";
  const heroPrimaryHref = isSignedIn ? workspaceHref : "/get-started";
  const heroPrimaryLabel = isSignedIn ? dashboardCtaLabel : "Get Started";

  return (
    <div className="bg-cos-bg">
      <MarketingWowHeader userEmail={userEmail} workspaceHref={workspaceHref} />

      {/* ============ Hero ============ */}
      <section className="relative overflow-hidden px-6 pt-10 pb-20 sm:pt-16 sm:pb-28">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-display text-[2.75rem] leading-[1.05] tracking-tight text-cos-text italic sm:text-6xl md:text-[4.75rem]">
            The calm behind every
            <br className="hidden sm:block" /> successful{" "}
            <span className="text-cos-brand-sage">school year.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-cos-muted sm:text-xl">
            Running a PTO shouldn&rsquo;t feel like a second full-time job. Hey
            Ralli brings your team, volunteers, and planning together in one
            quiet place, so you can focus on what matters most: your school
            community.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Button
              href={heroPrimaryHref}
              variant="primary"
              className="h-auto w-full rounded-full px-10 py-4 text-base shadow-[0_20px_45px_-15px_rgba(42,38,34,0.35)] sm:w-auto"
            >
              {heroPrimaryLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <a
              href="#tour"
              className="text-base font-semibold text-cos-muted transition-colors hover:text-cos-text"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Dashboard demo — contained preview (~max-w-5xl), full frame, no crop. */}
        <div className="relative mx-auto mt-16 w-full max-w-5xl sm:mt-20">
          <div className="overflow-hidden rounded-[16px] border border-cos-border/60 bg-cos-card shadow-[0_40px_90px_-30px_rgba(42,38,34,0.28)] sm:rounded-[20px]">
            <MarketingProductDemoVideo
              demoId="dashboard"
              priority
              objectFit="contain"
              preload="metadata"
              aspectClassName="aspect-[1960/1080]"
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
          </div>
        </div>
      </section>

      <MarketingProductTour />

      {/* ============ The feeling ============ */}
      <section className="bg-cos-primary px-6 py-20 text-[#f6f2eb] sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold tracking-[0.14em] text-cos-brand-sage uppercase">
            The feeling
          </p>
          <h2 className="font-display mt-3 max-w-lg text-3xl leading-tight sm:text-4xl lg:text-5xl">
            This is the future of school communications.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[#f6f2eb]/78 sm:text-lg">
            Fewer frantic group chats. Fewer late posts. More parents who show
            up knowing exactly what&rsquo;s happening — because your team had a
            calm place to decide.
          </p>
          <span
            className="mt-7 block h-0.5 w-16 bg-cos-brand-mustard"
            aria-hidden
          />
        </div>
      </section>

      {/* ============ Pricing teaser ============ */}
      <section className="border-b border-cos-border bg-cos-bg px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="studio-eyebrow">Pricing</p>
          <h2 className="font-display mt-3 max-w-lg text-3xl leading-tight text-cos-text sm:text-4xl lg:text-5xl">
            Plans that fit real PTA budgets.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-cos-muted sm:text-lg">
            14-day trial with AI credits included. No corporate contracts.
            Upgrade when the year gets bigger.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PAID_PLANS.map((plan) => (
              <article
                key={plan.id}
                className={cn(
                  "rounded-2xl border p-7",
                  plan.highlighted
                    ? "border-cos-primary bg-cos-primary text-[#f6f2eb]"
                    : "border-cos-border bg-cos-card text-cos-text",
                )}
              >
                <h3 className="font-display text-xl">{plan.name}</h3>
                <p className="font-display mt-3 text-4xl">
                  ${plan.priceUsd}
                  <span className="text-base font-sans font-medium opacity-70">
                    /mo
                  </span>
                </p>
                <p
                  className={cn(
                    "mt-3 text-sm leading-relaxed",
                    plan.highlighted ? "text-[#f6f2eb]/78" : "text-cos-muted",
                  )}
                >
                  {plan.description}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-7 text-sm text-cos-muted">
            Full feature comparison lives on the{" "}
            <Link
              href="/pricing"
              className="font-semibold text-cos-text underline decoration-cos-brand-sage decoration-2 underline-offset-4"
            >
              Pricing page
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ============ Team access ============ */}
      <section className="border-b border-cos-border bg-gradient-to-br from-cos-brand-sage-soft via-cos-bg to-cos-brand-mustard-soft px-6 py-16">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6">
          <div>
            <p className="studio-eyebrow">Team access</p>
            <h2 className="font-display mt-3 max-w-xs text-2xl leading-tight text-cos-text sm:text-3xl">
              Already have an invite?
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-cos-muted sm:text-base">
              Your president or admin sends a secure link. Open it to set your
              password and join the workspace — no founding code needed.
            </p>
          </div>
          <Button
            href="/login"
            variant="primary"
            className="h-auto rounded-full px-7 py-3.5 text-sm"
          >
            Log in to join
          </Button>
        </div>
      </section>

      <MarketingWowFooter />

      <MarketingCookieConsent />
    </div>
  );
}
