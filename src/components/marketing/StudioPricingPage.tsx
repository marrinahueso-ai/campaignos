import Image from "next/image";
import { Check } from "lucide-react";
import {
  StudioMarketingPageHeader,
  StudioMarketingShell,
} from "@/components/marketing/StudioMarketingShell";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface StudioPricingPageProps {
  userEmail?: string | null;
  workspaceHref?: string;
}

const plans = [
  {
    name: "Starter",
    price: 29,
    description: "For small PTOs getting organized without the overwhelm.",
    features: [
      "Up to 3 active campaigns",
      "School calendar & event planning",
      "Artwork studio (feed + story)",
      "Facebook publishing",
      "Email sign-in for your team",
    ],
    cta: "Start with Starter",
    highlighted: false,
  },
  {
    name: "Studio",
    price: 59,
    description: "Our most popular plan for busy volunteer teams all year long.",
    features: [
      "Unlimited campaigns",
      "Full artwork & caption workflow",
      "Facebook + Instagram publishing",
      "Approval routing for your board",
      "Publishing queue & schedule",
      "Priority email support",
    ],
    cta: "Choose Studio",
    highlighted: true,
  },
  {
    name: "Pro",
    price: 99,
    description: "For active schools managing multiple events and committees.",
    features: [
      "Everything in Studio",
      "Multiple admin seats",
      "School roster & role matrix",
      "Calendar import & review tools",
      "Insights & campaign history",
      "Dedicated onboarding call",
    ],
    cta: "Go Pro",
    highlighted: false,
  },
];

export function StudioPricingPage({
  userEmail = null,
  workspaceHref = "/dashboard",
}: StudioPricingPageProps) {
  const isSignedIn = Boolean(userEmail);
  const ctaHref = isSignedIn ? workspaceHref : "/login";

  return (
    <StudioMarketingShell userEmail={userEmail} workspaceHref={workspaceHref}>
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
        <StudioMarketingPageHeader
          eyebrow="Pricing"
          title="Simple plans for busy school teams."
          description="No corporate contracts. Pick the level that fits your PTO — upgrade anytime as your calendar fills up."
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
              evenings. Every tier gives your team one calm studio for artwork,
              captions, approvals, and publishing.
            </p>
          </div>
        </section>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "flex flex-col border p-8",
                plan.highlighted
                  ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
                  : "border-cos-border bg-cos-card",
              )}
            >
              {plan.highlighted && (
                <p className="studio-eyebrow mb-4 text-cos-dark-muted">Most popular</p>
              )}
              <h2
                className={cn(
                  "font-display text-3xl",
                  plan.highlighted ? "text-[#f6f2eb]" : "text-cos-text",
                )}
              >
                {plan.name}
              </h2>
              <div className="mt-4 flex items-baseline gap-1">
                <span
                  className={cn(
                    "font-display text-5xl",
                    plan.highlighted ? "text-[#f6f2eb]" : "text-cos-text",
                  )}
                >
                  ${plan.price}
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
                    <span className={plan.highlighted ? "text-[#f6f2eb]/90" : "text-cos-text"}>
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
                {plan.cta}
              </Button>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm leading-relaxed text-cos-muted">
          All plans include secure sign-in, your school&apos;s campaign workspace, and
          updates as we ship new features. Pricing shown is per organization, billed
          monthly. Questions?{" "}
          <a href="mailto:hello@heyralli.com" className="text-cos-text underline-offset-2 hover:underline">
            Reach out anytime
          </a>
          .
        </p>
      </div>
    </StudioMarketingShell>
  );
}
