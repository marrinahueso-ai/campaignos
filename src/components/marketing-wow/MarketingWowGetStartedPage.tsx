import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  FolderOpen,
  Heart,
  MessageCircle,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { MarketingWowFooter } from "@/components/marketing-wow/MarketingWowFooter";
import { MarketingWowHeader } from "@/components/marketing-wow/MarketingWowHeader";
import { Button } from "@/components/ui/Button";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path-shared";

interface MarketingWowGetStartedPageProps {
  userEmail?: string | null;
  workspaceHref?: string;
}

const STEPS = [
  {
    n: "01",
    title: "Create your account",
    body: "Use Google or your preferred email address to begin.",
  },
  {
    n: "02",
    title: "Create or join your school",
    body: "Start a new school profile, accept a team invitation, or activate Founding School access.",
  },
  {
    n: "03",
    title: "Bring in your calendar",
    body: "Add or import the events your organization already has planned for the year.",
  },
  {
    n: "04",
    title: "Start running the year",
    body: "Hey Ralli becomes the workspace for events, communications, volunteers, and planning.",
  },
] as const;

const PATHS = [
  {
    eyebrow: "Start a School",
    title: "Leading the Way",
    body: "For PTO/PTA leaders bringing their organization to Hey Ralli for the first time.",
    href: "/signup/welcome?path=new",
    cta: "Create School",
  },
  {
    eyebrow: "Join Your Team",
    title: "Stepping In",
    body: "Already invited? Create your account and step directly into your organization’s workspace.",
    href: "/invite",
    cta: "Find Team",
  },
  {
    eyebrow: "Founding School",
    title: "Founding Member",
    body: "Have a Founding School code? You can activate your special access inside the app.",
    href: "/signup/welcome?path=founding",
    cta: "Redeem Access",
  },
] as const;

const TRIAL_FEATURES = [
  { label: "Event Workspace", icon: CalendarDays },
  { label: "Create with AI", icon: Sparkles },
  { label: "Volunteer Center", icon: Heart },
  { label: "Approvals", icon: CheckCircle2 },
  { label: "Communications", icon: Send },
  { label: "Ask Ralli AI", icon: MessageCircle },
  { label: "Files & Docs", icon: FolderOpen },
  { label: "600 AI Credits", icon: Zap },
] as const;

export function MarketingWowGetStartedPage({
  userEmail = null,
  workspaceHref = "/dashboard",
}: MarketingWowGetStartedPageProps) {
  const isSignedIn = Boolean(userEmail);
  const primaryHref = isSignedIn
    ? workspaceHref
    : `/signup/welcome?next=${encodeURIComponent(ONBOARDING_PATH)}`;
  const primaryLabel = isSignedIn ? "Open your dashboard" : "Start your free trial";

  return (
    <div className="bg-cos-bg">
      <MarketingWowHeader userEmail={userEmail} workspaceHref={workspaceHref} />

      {/* Hero */}
      <section className="px-6 pt-14 pb-20 text-center sm:pt-16 sm:pb-24">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-[2.5rem] leading-[1.05] tracking-tight text-cos-text italic sm:text-6xl md:text-[5rem]">
            Your calmer school{" "}
            <span className="text-cos-brand-sage">year starts here.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-cos-muted sm:text-xl">
            Start with your school and the calendar you already have. Hey Ralli
            helps bring your events, communications, volunteers, approvals, and
            planning together from there.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row sm:gap-6">
              <Button
                href={primaryHref}
                variant="primary"
                className="h-auto w-full rounded-full px-12 py-5 text-lg sm:w-auto"
              >
                {primaryLabel}
              </Button>
              <Link
                href="/pricing"
                className="rounded-full px-12 py-5 text-lg font-bold text-cos-muted transition-colors hover:text-cos-text"
              >
                See pricing
              </Link>
            </div>
            <p className="text-sm font-medium text-cos-muted">
              14 days free · Professional features · 600 AI credits
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-cos-border bg-cos-bg-alt/50 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-16 max-w-xl text-center">
            <h2 className="font-display text-3xl text-cos-text italic sm:text-4xl lg:text-5xl">
              Start with what you already have.
            </h2>
            <p className="mt-5 text-cos-muted">
              Getting started is simple, safe, and takes less effort than you
              might think.
            </p>
          </div>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
            {STEPS.map((step) => (
              <div key={step.n}>
                <div className="mb-5 flex items-center gap-3">
                  <span className="font-display text-4xl leading-none text-cos-brand-sage/40 italic">
                    {step.n}
                  </span>
                  <div className="hidden h-px flex-1 bg-cos-border lg:block" />
                </div>
                <h3 className="text-lg font-bold text-cos-text">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cos-muted">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calm reassurance */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 lg:flex-row lg:gap-24">
          <div className="w-full lg:w-1/2">
            <h2 className="font-display text-4xl leading-tight text-cos-text italic sm:text-5xl">
              You don&rsquo;t need everything figured out.
            </h2>
            <div className="mt-7 space-y-5 text-lg leading-relaxed text-cos-muted">
              <p>
                Hey Ralli was built for volunteer-led school organizations. We
                know you&rsquo;re busy, and we know how much you&rsquo;re already
                doing.
              </p>
              <p>
                You do not need to reorganize your entire PTO before getting
                started. Begin with the school and calendar you already have.
                Hey Ralli helps your team organize the rest as you go.
              </p>
            </div>
            <div className="mt-8">
              <Button
                href={primaryHref}
                variant="primary"
                className="h-auto rounded-full px-10 py-4 text-sm"
              >
                Begin with calm
              </Button>
            </div>
          </div>
          <div className="w-full lg:w-1/2">
            <div className="rounded-[32px] border border-cos-border bg-cos-card p-8 shadow-sm sm:p-10">
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-cos-brand-sage-soft/70">
                <p className="max-w-[16rem] text-center font-display text-xl text-cos-text italic">
                  Designed for real school volunteers, not enterprise software
                  experts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ways in */}
      <section className="mx-6 mb-8 overflow-hidden rounded-[40px] bg-cos-dark px-6 py-20 text-[#f6f2eb] sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <h2 className="font-display text-3xl italic sm:text-4xl lg:text-5xl">
              There&rsquo;s more than one way in.
            </h2>
            <p className="mt-5 text-cos-dark-muted">
              Whether you&rsquo;re leading the charge or joining a team, we&rsquo;ve
              made the process seamless.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {PATHS.map((path) => (
              <Link
                key={path.eyebrow}
                href={isSignedIn ? workspaceHref : path.href}
                className="rounded-[28px] border border-white/10 bg-white/5 p-8 transition-colors hover:bg-white/10"
              >
                <p className="text-[11px] font-bold tracking-[0.2em] text-cos-brand-sage uppercase">
                  {path.eyebrow}
                </p>
                <h3 className="mt-3 text-xl font-bold">{path.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#f6f2eb]/70">
                  {path.body}
                </p>
                <span className="mt-8 inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
                  {path.cta} <span aria-hidden>→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trial preview */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-cos-brand-sage-soft px-4 py-1 text-xs font-bold tracking-widest text-cos-brand-sage uppercase">
            14 Days Free
          </span>
          <h2 className="font-display mt-6 text-3xl text-cos-text italic sm:text-4xl lg:text-5xl">
            Full access during your trial.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-cos-muted italic">
            Experience the actual Hey Ralli workflow before selecting your
            long-term plan. Billing begins only after your trial ends unless you
            cancel.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
            {TRIAL_FEATURES.map((feature) => (
              <div
                key={feature.label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-cos-border bg-cos-card p-4 shadow-sm"
              >
                <feature.icon className="h-4 w-4 text-cos-brand-sage" aria-hidden />
                <span className="text-xs font-bold text-cos-text">{feature.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-[28px] border border-cos-border bg-cos-bg-alt/40 p-8 sm:p-10">
            <p className="text-sm font-bold tracking-widest text-cos-muted uppercase">
              What happens after clicking start?
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-6 text-cos-muted sm:flex-row sm:gap-12">
              <span className="text-sm font-medium">Google</span>
              <span className="text-sm font-medium">Email + Password</span>
            </div>
            <div className="mt-8 border-t border-cos-border pt-6">
              <p className="text-xs text-cos-muted">
                Already have an account?{" "}
                <Link href="/login" className="font-bold text-cos-text hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-24 text-center sm:pb-32">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-4xl leading-tight text-cos-text italic sm:text-6xl">
            Bring a little calm{" "}
            <span className="text-cos-brand-sage">to your school year.</span>
          </h2>
          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row sm:gap-6">
              <Button
                href={primaryHref}
                variant="primary"
                className="h-auto w-full rounded-full px-12 py-5 text-lg sm:w-auto"
              >
                {primaryLabel}
              </Button>
              <Link
                href="/pricing"
                className="rounded-full px-12 py-5 text-lg font-bold text-cos-muted transition-colors hover:text-cos-text"
              >
                See pricing
              </Link>
            </div>
            <p className="text-sm font-medium text-cos-muted">
              14 days free · Professional features · 600 AI credits
            </p>
          </div>
        </div>
      </section>

      <MarketingWowFooter />
    </div>
  );
}
