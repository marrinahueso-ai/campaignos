import Image from "next/image";
import { ArrowRight, Check, Minus } from "lucide-react";
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
    name: "Early Access",
    priceLabel: "Free",
    priceDetail: "through the 2026–27 school year",
    description:
      "Full workspace for founding PTOs while we refine CampaignOS with real schools like Oak Ridge Elementary.",
    badge: "Available now",
    features: [
      "Unlimited campaigns and team invites",
      "School setup, calendar import, and roster",
      "Artwork studio, approvals, and Meta publishing",
      "Posting heatmap and publishing queue",
      "Product updates as we ship",
    ],
    cta: "Start free",
    highlighted: true,
  },
  {
    name: "Founding PTO",
    priceLabel: "$799",
    priceDetail: "/ year per school · ≈ $67/mo · billing opens later",
    description:
      "Same full workspace at our founding rate. Join during early access and lock $799/year before public launch at $999/year.",
    badge: "Lock in your rate",
    features: [
      "Everything in Early Access",
      "One price for your whole PTO — not per seat",
      "Founding rate held for life — public launch at $999/year",
      "Priority email support from our team",
      "Help shape what we build next",
    ],
    cta: "Join as a founding school",
    highlighted: false,
  },
];

const diyStackEstimate = [
  { tool: "Later or Buffer (scheduling only)", cost: "$300–540/yr" },
  { tool: "Canva Pro (one comms lead)", cost: "$120/yr" },
  { tool: "Spreadsheets + group chat coordination", cost: "Volunteer hours" },
  { tool: "CampaignOS (plan → approve → publish)", cost: "$799/yr founding" },
];

const includedToday = [
  {
    title: "Plan & organize",
    items: [
      "Dashboard with Next Up and week-at-a-glance",
      "Campaign planning hub with communication playbooks",
      "School-year calendar with layer toggles",
      "Calendar import and review during setup",
    ],
  },
  {
    title: "Create & approve",
    items: [
      "Artwork studio for feed and story pairs",
      "Brand-aware AI captions and Canva import",
      "Board roster import and approval routing",
      "Approval center for captions and posts",
    ],
  },
  {
    title: "Publish & schedule",
    items: [
      "Schedule to Facebook and Instagram",
      "Publishing queue, history, and milestones",
      "Posting-time heatmap for smarter scheduling",
      "Team invites with Google, Facebook, or email sign-in",
    ],
  },
];

type ComparisonValue = boolean | "partial" | "included";

const comparisonRows: {
  label: string;
  campaignos: ComparisonValue;
  diy: ComparisonValue;
}[] = [
  {
    label: "One workspace for the whole school year",
    campaignos: true,
    diy: false,
  },
  {
    label: "Campaign timelines tied to each event",
    campaignos: true,
    diy: false,
  },
  {
    label: "Artwork + captions + approvals in one flow",
    campaignos: true,
    diy: false,
  },
  {
    label: "Schedule Meta posts from the same calendar",
    campaignos: true,
    diy: "partial",
  },
  {
    label: "Posting-time heatmap from your history",
    campaignos: true,
    diy: false,
  },
  {
    label: "Free design tools (Canva, Google Docs)",
    campaignos: "included",
    diy: true,
  },
];

const faqs = [
  {
    question: "Is CampaignOS really free right now?",
    answer:
      "Yes. Early access schools get the full workspace at no cost while we learn from real PTO workflows. We will give plenty of notice before any billing starts.",
  },
  {
    question: "What does per-school pricing mean?",
    answer:
      "One subscription covers your entire PTO organization — communications chair, president, committee leads, and volunteers. We do not charge per seat because school teams rotate every year.",
  },
  {
    question: "Why $799/year — and not monthly plans?",
    answer:
      "CampaignOS replaces a DIY stack of scheduling tools, design subscriptions, and hours of volunteer coordination — not a single newsletter app. Most PTO software budgets run $500–2,000 per year; $799/year (about $67/month) keeps one predictable line item for treasurers while reflecting the full campaign workflow we ship today.",
  },
  {
    question: "What happens to the $999/year public price?",
    answer:
      "When billing opens after early access, new schools will pay $999/year for the same full workspace. Founding schools who join now keep $799/year for as long as they stay subscribed — our thank-you for helping shape the product with real teams.",
  },
  {
    question: "What if we already use Canva and Meta Business Suite?",
    answer:
      "Many teams do. CampaignOS does not replace free design tools — it connects planning, artwork, approvals, and publishing so you are not copying captions between five tabs.",
  },
  {
    question: "What about Insights and analytics?",
    answer:
      "Operational summaries and campaign readiness views are available today. Deeper engagement analytics are on the roadmap — we will not advertise them as finished until they are.",
  },
  {
    question: "How do we get started?",
    answer:
      "Sign in, run school setup once (name, brand, calendar, roster), and invite your board. Oak Ridge Elementary is our fictional example in demos — your school keeps its own workspace.",
  },
];

function ComparisonCell({ value }: { value: ComparisonValue }) {
  if (value === true) {
    return (
      <Check className="mx-auto h-4 w-4 text-cos-success" strokeWidth={1.5} aria-label="Included" />
    );
  }

  if (value === "partial") {
    return (
      <span className="text-xs tracking-wide text-cos-muted uppercase">Manual</span>
    );
  }

  if (value === "included") {
    return (
      <span className="text-xs tracking-wide text-cos-muted">Via import</span>
    );
  }

  return <Minus className="mx-auto h-4 w-4 text-cos-border" strokeWidth={1.5} aria-label="Not included" />;
}

export function StudioPricingPage({
  userEmail = null,
  workspaceHref = "/dashboard",
}: StudioPricingPageProps) {
  const isSignedIn = Boolean(userEmail);
  const ctaHref = isSignedIn ? workspaceHref : "/login";
  const ctaLabel = isSignedIn ? "Go to workspace" : "Get started free";

  return (
    <StudioMarketingShell userEmail={userEmail} workspaceHref={workspaceHref}>
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
        <StudioMarketingPageHeader
          eyebrow="Pricing"
          title="Priced like the ops platform it is."
          description="CampaignOS is in early access with a small group of school teams. Use the full studio free today — founding schools lock in $799/year per school ($999/year at public launch) before billing opens."
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
            <p className="studio-eyebrow">Honest early access</p>
            <h2 className="font-display mt-4 text-3xl leading-tight text-cos-text sm:text-4xl">
              No fake tiers. No surprise seat fees.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-cos-muted sm:text-base">
              We are not selling three plans with arbitrary campaign limits — billing
              is not live yet. Early access gives your whole PTO one calm studio for
              artwork, captions, approvals, and Meta publishing. Founding schools
              lock in $799/year because this replaces scheduling tools, scattered
              docs, and 10+ volunteer hours a month — not a $15 newsletter add-on.
            </p>
          </div>
        </section>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "flex flex-col border p-8 lg:p-10",
                plan.highlighted
                  ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
                  : "border-cos-border bg-cos-card",
              )}
            >
              <p
                className={cn(
                  "studio-eyebrow",
                  plan.highlighted ? "text-cos-dark-muted" : "text-cos-muted",
                )}
              >
                {plan.badge}
              </p>
              <h2
                className={cn(
                  "font-display mt-4 text-3xl",
                  plan.highlighted ? "text-[#f6f2eb]" : "text-cos-text",
                )}
              >
                {plan.name}
              </h2>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={cn(
                    "font-display text-5xl",
                    plan.highlighted ? "text-[#f6f2eb]" : "text-cos-text",
                  )}
                >
                  {plan.priceLabel}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    plan.highlighted ? "text-cos-dark-muted" : "text-cos-muted",
                  )}
                >
                  {plan.priceDetail}
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
                {plan.highlighted && isSignedIn ? ctaLabel : plan.cta}
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </article>
          ))}
        </div>

        <section className="mt-20 border-t border-cos-border pt-16">
          <p className="studio-eyebrow">In your workspace today</p>
          <h2 className="font-display mt-4 text-3xl text-cos-text sm:text-4xl">
            Everything included — no upsells for core workflows.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-cos-muted sm:text-base">
            These are live product areas you can use now at Oak Ridge Elementary-style
            demos or in your own school setup — not roadmap placeholders dressed up as
            paid tiers.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            {includedToday.map((group) => (
              <div key={group.title} className="border border-cos-border bg-cos-card p-8">
                <h3 className="font-display text-xl text-cos-text">{group.title}</h3>
                <ul className="mt-6 space-y-3">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-cos-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cos-success" strokeWidth={1.5} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 overflow-hidden border border-cos-border">
          <div className="border-b border-cos-border bg-cos-card px-8 py-8 lg:px-10">
            <p className="studio-eyebrow">Why not DIY?</p>
            <h2 className="font-display mt-4 text-3xl text-cos-text sm:text-4xl">
              One studio vs. a patchwork stack.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
              Canva, Google Drive, and Meta Business Suite are free — but they do not
              connect your school-year plan to approvals and scheduled posts. Most
              teams still pay for scheduling tools or lose volunteer hours stitching
              it together.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:max-w-3xl">
              {diyStackEstimate.map((row) => (
                <li
                  key={row.tool}
                  className="flex items-baseline justify-between gap-4 border border-cos-border bg-cos-bg px-4 py-3 text-sm"
                >
                  <span className="text-cos-text">{row.tool}</span>
                  <span className="shrink-0 font-display text-cos-muted">{row.cost}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-cos-border bg-cos-bg">
                  <th scope="col" className="px-6 py-4 font-normal text-cos-muted lg:px-10">
                    Capability
                  </th>
                  <th scope="col" className="px-4 py-4 text-center font-display text-base text-cos-text">
                    CampaignOS
                  </th>
                  <th scope="col" className="px-6 py-4 text-center font-normal text-cos-muted lg:px-10">
                    Canva + Meta + spreadsheets
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-b border-cos-border last:border-b-0">
                    <td className="px-6 py-4 text-cos-text lg:px-10">{row.label}</td>
                    <td className="px-4 py-4 text-center">
                      <ComparisonCell value={row.campaignos} />
                    </td>
                    <td className="px-6 py-4 text-center lg:px-10">
                      <ComparisonCell value={row.diy} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-20">
          <p className="studio-eyebrow">Questions</p>
          <h2 className="font-display mt-4 text-3xl text-cos-text sm:text-4xl">
            FAQ for treasurers and comms chairs.
          </h2>
          <dl className="mt-10 divide-y divide-cos-border border-y border-cos-border">
            {faqs.map((faq) => (
              <div key={faq.question} className="px-1 py-6 sm:px-2">
                <dt className="font-display text-lg text-cos-text">{faq.question}</dt>
                <dd className="mt-3 text-sm leading-relaxed text-cos-muted">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-20 border border-cos-dark bg-cos-dark px-8 py-12 text-center lg:px-16">
          <p className="studio-eyebrow text-cos-dark-muted">Ready when you are</p>
          <h2 className="font-display mt-4 text-3xl text-[#f6f2eb] sm:text-4xl">
            Set up once. Run the whole year from one studio.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cos-dark-muted">
            Sign in, complete school setup, and invite your board. No credit card
            required during early access.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              href={ctaHref}
              size="lg"
              className="border-cos-dark-muted/30 bg-[#f6f2eb] text-cos-text hover:bg-white"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm leading-relaxed text-cos-muted">
          Pricing is per school organization, not per volunteer. Founding schools lock
          in $799/year ($999/year at public launch). Questions for your board meeting?{" "}
          <a
            href="mailto:hello@campaignos.app"
            className="text-cos-text underline-offset-2 hover:underline"
          >
            Email us anytime
          </a>
          .
        </p>
      </div>
    </StudioMarketingShell>
  );
}
