import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { MarketingCookieConsent } from "@/components/marketing-wow/MarketingCookieConsent";
import { Button } from "@/components/ui/Button";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path";
import { PAID_PLANS } from "@/lib/billing/plan-catalog";
import { cn } from "@/lib/utils/cn";

interface MarketingWowHomeProps {
  userEmail?: string | null;
  workspaceHref?: string;
}

/** Header nav — matches the approved homepage design (Pricing · Resources · About). */
const NAV_LINKS = [
  { href: "/pricing", label: "Pricing" },
  // No standalone /resources page yet — points to the closest shipped
  // equivalent (product tour) until Resources ships as its own page.
  { href: "/features", label: "Resources" },
  { href: "/about", label: "About" },
] as const;

const TOUR_ITEMS = [
  {
    title: "Create with AI",
    body: "Artwork, captions, and communication plans that sound like your school — ready for human approval.",
  },
  {
    title: "Approve & schedule",
    body: "Clear ownership before anything goes live on Facebook or Instagram.",
  },
  {
    title: "Calendar, volunteers, vendors",
    body: "The whole year in view — who is covering what, and what still needs a hand.",
  },
  {
    title: "Ask Ralli",
    body: "An ops coach that knows your events, posts, and what to do next today.",
  },
] as const;

export function MarketingWowHome({
  userEmail = null,
  workspaceHref = "/dashboard",
}: MarketingWowHomeProps) {
  const isSignedIn = Boolean(userEmail);
  const needsSchoolSetup = workspaceHref === ONBOARDING_PATH;
  const dashboardCtaLabel = needsSchoolSetup ? "Continue setup" : "Open your dashboard";
  const heroPrimaryHref = isSignedIn ? workspaceHref : "/signup";
  const heroPrimaryLabel = isSignedIn ? dashboardCtaLabel : "Get Started";

  return (
    <div className="bg-cos-bg">
      {/* ============ Header ============ */}
      <header className="relative z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-7 lg:px-10">
          <BrandLogo href="/" variant="full" size="nav" />

          <nav
            className="hidden items-center gap-9 text-[13px] font-semibold tracking-wide text-cos-muted uppercase md:flex"
            aria-label="Marketing"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-cos-text"
              >
                {link.label}
              </Link>
            ))}
            {!isSignedIn && (
              <Link href="/login" className="transition-colors hover:text-cos-text">
                Log in
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Button
                href={workspaceHref}
                variant="primary"
                className="h-auto rounded-full px-4 py-3 text-sm sm:px-6"
              >
                {dashboardCtaLabel}
              </Button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-[13px] font-semibold tracking-wide text-cos-muted uppercase transition-colors hover:text-cos-text sm:inline md:hidden"
                >
                  Log in
                </Link>
                <Button
                  href="/signup"
                  variant="primary"
                  className="h-auto rounded-full px-4 py-3 text-sm sm:px-6"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ============ Hero ============ */}
      <section className="relative overflow-hidden px-6 pt-10 pb-28 sm:pt-16 sm:pb-36">
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

        {/* Dashboard screenshot — real Hey Ralli product UI, no placeholder art. */}
        <div className="relative mx-auto mt-20 w-full max-w-6xl px-2 sm:mt-24">
          <div className="relative rounded-[28px] border border-cos-border/60 bg-cos-card p-3 shadow-[0_50px_100px_-25px_rgba(42,38,34,0.25)] sm:p-4">
            <div className="relative aspect-[1024/665] w-full overflow-hidden rounded-[18px] bg-cos-bg">
              <Image
                src="/images/marketing-home/home-screenshot-dashboard.png"
                alt="Hey Ralli dashboard showing today's schedule, volunteer status, and posts for Lincoln Elementary"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 1152px"
                className="object-contain"
              />
            </div>
          </div>

          <ScreenshotPeekCard
            src="/images/marketing-home/home-screenshot-calendar.png"
            alt="Hey Ralli calendar month view with events, scheduled posts, and published posts"
            label="One calendar for events and posts"
            className="-top-8 -left-4 hidden w-60 sm:-top-10 sm:-left-10 xl:block"
          />
          <ScreenshotPeekCard
            src="/images/marketing-home/home-screenshot-approvals.png"
            alt="Hey Ralli approval review panel with caption, schedule, and channel details"
            label="Approve before anything goes live"
            className="-right-4 -bottom-10 hidden w-64 sm:-right-10 sm:-bottom-12 xl:block"
          />
        </div>
      </section>

      {/* ============ Product tour ============ */}
      <section id="tour" className="scroll-mt-20 border-t border-cos-border px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <p className="studio-eyebrow">Product tour</p>
          <h2 className="font-display mt-3 max-w-xl text-3xl leading-tight text-cos-text sm:text-4xl lg:text-5xl">
            Built for the people who make school feel like home.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-cos-muted sm:text-lg">
            Not another parent Facebook group. A quiet ops studio for events,
            approvals, calendar, volunteers, vendors, and Meta — so your
            community hears the right thing at the right time.
          </p>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
            <div className="overflow-hidden rounded-[22px] border border-cos-border bg-cos-card p-2 shadow-sm">
              <div className="relative aspect-[1024/592] w-full overflow-hidden rounded-2xl bg-cos-bg">
                <Image
                  src="/images/marketing-home/home-screenshot-create-with-ai.png"
                  alt="Create with AI campaign editor showing a scheduled post preview and caption"
                  fill
                  sizes="(max-width: 1024px) 100vw, 600px"
                  className="object-contain"
                />
              </div>
            </div>
            <ol className="grid gap-0">
              {TOUR_ITEMS.map((item, index) => (
                <li
                  key={item.title}
                  className={cn(
                    "border-t border-cos-border py-6",
                    index === TOUR_ITEMS.length - 1 && "border-b",
                  )}
                >
                  <strong className="font-display block text-xl text-cos-text">
                    {item.title}
                  </strong>
                  <p className="mt-1.5 max-w-md text-sm leading-relaxed text-cos-muted sm:text-base">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

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
            up knowing exactly what&rsquo;s happening — because your team had
            a calm place to decide.
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
              Your president or admin sends a secure link. Open it to set
              your password and join the workspace — no founding code
              needed.
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

      {/* ============ Footer ============ */}
      <footer className="bg-cos-dark px-6 py-14 text-[#f6f2eb]/78 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl text-[#f6f2eb]">Hey Ralli</p>
            <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-cos-brand-sage uppercase">
              Organize · Create · Connect
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold tracking-[0.14em] text-cos-brand-sage uppercase">
              Product
            </h4>
            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              <a href="#tour" className="hover:text-[#f6f2eb]">
                Product tour
              </a>
              <Link href="/pricing" className="hover:text-[#f6f2eb]">
                Pricing
              </Link>
              <Link href="/signup" className="hover:text-[#f6f2eb]">
                Start organization
              </Link>
              <Link href="/login" className="hover:text-[#f6f2eb]">
                Log in
              </Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold tracking-[0.14em] text-cos-brand-sage uppercase">
              Legal &amp; help
            </h4>
            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              <Link href="/privacy" className="hover:text-[#f6f2eb]">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-[#f6f2eb]">
                Terms
              </Link>
              <a href="mailto:hello@heyralli.com" className="hover:text-[#f6f2eb]">
                Contact · hello@heyralli.com
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-[#f6f2eb]/12 pt-6 text-xs text-[#f6f2eb]/50">
          © {new Date().getFullYear()} Hey Ralli
        </div>
      </footer>

      <MarketingCookieConsent />
    </div>
  );
}

interface ScreenshotPeekCardProps {
  src: string;
  alt: string;
  label: string;
  className?: string;
}

/** Small "peek" of a real product screenshot — layered around the hero mockup. */
function ScreenshotPeekCard({ src, alt, label, className }: ScreenshotPeekCardProps) {
  return (
    <div
      className={cn(
        "absolute z-10 rounded-2xl border border-cos-border bg-cos-card p-2.5 shadow-xl",
        "motion-safe:animate-[marketing-home-float_8s_ease-in-out_infinite]",
        className,
      )}
    >
      <div className="relative h-28 w-full overflow-hidden rounded-xl bg-cos-bg sm:h-32">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="260px"
          className="object-cover object-top"
        />
      </div>
      <p className="mt-2 px-0.5 text-[11px] leading-snug font-semibold text-cos-muted">
        {label}
      </p>
    </div>
  );
}
