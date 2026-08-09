import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  CheckCheck,
  Folder,
  Link2,
  Mail,
  MessageCircle,
  Send,
  Sheet,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { MarketingProductDemoVideo } from "@/components/marketing/MarketingProductDemoVideo";
import { MarketingWowFooter } from "@/components/marketing-wow/MarketingWowFooter";
import { MarketingWowHeader } from "@/components/marketing-wow/MarketingWowHeader";
import { Button } from "@/components/ui/Button";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path-shared";
import { cn } from "@/lib/utils/cn";

interface MarketingWowWhyPageProps {
  userEmail?: string | null;
  workspaceHref?: string;
}

const FRAGMENTED_TOOLS = [
  { label: "Calendar", icon: CalendarDays },
  { label: "Spreadsheets", icon: Sheet },
  { label: "Signups", icon: Users },
  { label: "Email Threads", icon: Mail },
  { label: "Group Chats", icon: MessageCircle },
  { label: "File Storage", icon: Folder },
] as const;

/** PLAN → CREATE → COORDINATE → APPROVE → PUBLISH → MEASURE — the approved workflow story. */
const WORKFLOW_STEPS = [
  {
    label: "Plan",
    icon: CalendarPlus,
    body: "Add the event to the school calendar.",
  },
  {
    label: "Create",
    icon: Sparkles,
    body: "Draft artwork, captions, and communication plans with AI.",
  },
  {
    label: "Coordinate",
    icon: Users,
    body: "Manage volunteer needs and signups.",
  },
  {
    label: "Approve",
    icon: CheckCheck,
    body: "Review team communications from one queue.",
  },
  {
    label: "Publish",
    icon: Send,
    body: "Schedule to Facebook and Instagram.",
  },
  {
    label: "Measure",
    icon: TrendingUp,
    body: "See volunteer coverage and social engagement.",
  },
] as const;

const CONNECTED_HIGHLIGHTS = [
  "Event-centric workspaces",
  "Seamless content creation workflow",
  "Event and social insights without switching tools",
] as const;

/** Concise, audited against actual Hey Ralli functionality — not a full pricing feature matrix. */
const COMPARISON_ROWS = [
  {
    need: "Event Planning",
    typical: "Spreadsheets + shared calendar",
    connected: "Integrated Event Workspace",
  },
  {
    need: "Content Creation",
    typical: "Design tools + AI tools + copy/paste",
    connected: "In-workspace AI drafting",
  },
  {
    need: "Volunteer Coordination",
    typical: "Signup software + email threads",
    connected: "Native Volunteer Center",
  },
  {
    need: "Approvals",
    typical: "Texts + \u201Cdid you see my email?\u201D",
    connected: "One centralized queue",
  },
  {
    need: "Social Publishing",
    typical: "Standalone publishing tools",
    connected: "Direct publishing from the event",
  },
] as const;

export function MarketingWowWhyPage({
  userEmail = null,
  workspaceHref = "/dashboard",
}: MarketingWowWhyPageProps) {
  const isSignedIn = Boolean(userEmail);
  const needsSchoolSetup = workspaceHref === ONBOARDING_PATH;
  const dashboardCtaLabel = needsSchoolSetup ? "Continue setup" : "Open your dashboard";
  const setupHref = `/get-started`;
  const trialHref = isSignedIn ? workspaceHref : setupHref;
  const trialLabel = isSignedIn ? dashboardCtaLabel : "Start your 14-day trial";

  return (
    <div className="bg-cos-bg">
      <MarketingWowHeader userEmail={userEmail} workspaceHref={workspaceHref} />

      {/* ============ Hero ============ */}
      <section className="px-6 pt-10 pb-24 text-center sm:pt-14 sm:pb-32">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-[2.5rem] leading-[1.05] tracking-tight text-cos-text italic sm:text-6xl md:text-[4.25rem]">
            Your PTO doesn&rsquo;t need
            <br className="hidden sm:block" /> another tool.{" "}
            <span className="text-cos-brand-sage">It needs fewer of them.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-cos-muted sm:text-xl">
            Most PTO leaders are juggling several different apps to manage a
            single event. Hey Ralli brings your fragmented workflow together
            into one calm, connected workspace.
          </p>
          <div className="mt-9 flex justify-center">
            <Button
              href={trialHref}
              variant="primary"
              className="h-auto rounded-full px-10 py-4 text-base shadow-[0_20px_45px_-15px_rgba(42,38,34,0.35)]"
            >
              {trialLabel}
            </Button>
          </div>
        </div>
      </section>

      {/* ============ The problem: fragmentation ============ */}
      <section className="border-y border-cos-border bg-cos-bg-alt/60 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div>
              <span className="inline-flex items-center rounded-full bg-cos-brand-terracotta/10 px-4 py-1.5 text-[11px] font-bold tracking-widest text-cos-brand-terracotta uppercase">
                The Problem
              </span>
              <h2 className="font-display mt-6 text-3xl leading-tight text-cos-text italic sm:text-4xl lg:text-5xl">
                The cost of fragmentation.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-cos-muted">
                It&rsquo;s not that your current tools are bad — it&rsquo;s that
                they don&rsquo;t talk to each other. Every school event becomes
                a multi-app scavenger hunt across calendars, spreadsheets, and
                endless message threads.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {FRAGMENTED_TOOLS.map((tool) => (
                  <div
                    key={tool.label}
                    className="flex items-center gap-3 rounded-2xl border border-cos-border bg-cos-card px-4 py-3.5 text-sm text-cos-muted shadow-sm"
                  >
                    <tool.icon className="h-4 w-4 shrink-0 text-cos-muted/60" aria-hidden />
                    {tool.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center overflow-hidden">
              <div className="grid -rotate-6 grid-cols-3 gap-4 sm:gap-5">
                {[
                  { icon: CalendarDays, className: "translate-y-2" },
                  { icon: Sheet, className: "-translate-y-3" },
                  { icon: MessageCircle, className: "translate-y-1" },
                  { icon: Mail, className: "-translate-y-1" },
                ].map(({ icon: Icon, className }, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-3xl border border-cos-border bg-cos-card shadow-md sm:h-20 sm:w-20",
                      className,
                    )}
                  >
                    <Icon className="h-6 w-6 text-cos-muted/40" aria-hidden />
                  </div>
                ))}
                <div className="col-span-1 flex h-20 w-20 scale-110 flex-col items-center justify-center gap-1.5 rounded-[28px] bg-cos-primary text-[#f6f2eb] shadow-2xl sm:h-24 sm:w-24">
                  <BrandLogo href={null} variant="mark" size="sm" />
                  <span className="text-[9px] font-bold tracking-widest uppercase">
                    Connect
                  </span>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-cos-border bg-cos-card shadow-md sm:h-20 sm:w-20">
                  <Sparkles className="h-6 w-6 text-cos-brand-sage" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ One event. One workflow. ============ */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl text-cos-text italic sm:text-4xl lg:text-5xl">
              One event. One workflow.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-cos-muted italic sm:text-lg">
              Here&rsquo;s how a school event moves through Hey Ralli without
              ever leaving the workspace.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {WORKFLOW_STEPS.map((step) => (
              <div
                key={step.label}
                className="flex flex-col items-center rounded-[24px] border border-cos-border bg-cos-card p-6 text-center shadow-sm transition-colors hover:border-cos-primary"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cos-primary text-[#f6f2eb] shadow-md">
                  <step.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-[11px] font-bold tracking-widest text-cos-text uppercase">
                  {step.label}
                </h3>
                <p className="mt-2.5 text-xs leading-relaxed text-cos-muted">
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-[32px] bg-cos-primary px-8 py-10 text-center shadow-xl sm:px-12">
            <p className="font-display text-lg text-[#f6f2eb] italic sm:text-xl">
              &ldquo;Every action belongs to the{" "}
              <span className="border-b border-cos-brand-sage/50 text-cos-brand-sage">
                same event
              </span>
              , resolved into one place.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ============ Everything connects (product showcase) ============ */}
      <section className="border-y border-cos-border bg-cos-brand-sage-soft/60 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div className="order-2 overflow-hidden rounded-[28px] border border-cos-border bg-cos-card p-3 shadow-[0_40px_90px_-25px_rgba(42,38,34,0.22)] lg:order-1">
              <div className="overflow-hidden rounded-2xl">
                <MarketingProductDemoVideo
                  demoId="event-planning"
                  aspectClassName="aspect-[1960/1080]"
                  sizes="(max-width: 1024px) 100vw, 600px"
                />
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <span className="inline-flex items-center rounded-full bg-cos-card px-4 py-1.5 text-[11px] font-bold tracking-widest text-cos-text uppercase">
                Unified view
              </span>
              <h2 className="font-display mt-6 text-3xl leading-tight text-cos-text italic sm:text-4xl lg:text-5xl">
                Everything connects.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-cos-muted">
                Hey Ralli isn&rsquo;t just about features. It&rsquo;s about
                context. When you&rsquo;re looking at an event, you see the
                volunteer gaps, the social posts, and the approvals in one
                place.
              </p>
              <ul className="mt-8 space-y-4">
                {CONNECTED_HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-center gap-3.5 text-sm font-semibold text-cos-text">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cos-primary text-[#f6f2eb]">
                      <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Connected vs. Fragmented ============ */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="font-display text-3xl text-cos-text italic sm:text-4xl">
              Connected vs. Fragmented
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base text-cos-muted italic sm:text-lg">
              We don&rsquo;t replace everything — we reduce the chaos of
              managing the same event in several places.
            </p>
          </div>

          <div className="mt-14 overflow-x-auto rounded-[32px] border border-cos-border bg-cos-card shadow-lg">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-cos-border">
                  <th className="px-6 py-5 text-[11px] font-bold tracking-[0.16em] text-cos-muted uppercase sm:px-8">
                    Need
                  </th>
                  <th className="px-6 py-5 text-[11px] font-bold tracking-[0.16em] text-cos-muted uppercase sm:px-8">
                    Typical setup
                  </th>
                  <th className="border-l border-cos-brand-sage-soft bg-cos-brand-sage-soft/70 px-6 py-5 text-[11px] font-bold tracking-[0.16em] text-cos-text uppercase sm:px-8">
                    Hey Ralli
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.need} className="border-b border-cos-border last:border-b-0">
                    <td className="px-6 py-6 font-bold text-cos-text sm:px-8">{row.need}</td>
                    <td className="px-6 py-6 text-cos-muted sm:px-8">{row.typical}</td>
                    <td className="border-l border-cos-brand-sage-soft bg-cos-brand-sage-soft/30 px-6 py-6 font-bold text-cos-text sm:px-8">
                      <span className="flex items-center gap-2.5">
                        <Link2 className="h-3.5 w-3.5 shrink-0 text-cos-brand-sage" aria-hidden />
                        {row.connected}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-8 text-center text-sm text-cos-muted italic">
            Hey Ralli keeps your workflow connected by reducing the places you
            have to manage the same event.
          </p>
        </div>
      </section>

      {/* ============ Final CTA ============ */}
      <section className="bg-cos-primary px-6 py-24 text-center sm:py-32">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-4xl leading-[1.08] text-[#f6f2eb] italic sm:text-6xl lg:text-[4.5rem]">
            One school year.
            <br />
            <span className="text-cos-brand-sage">One connected workspace.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-[#f6f2eb]/75 sm:text-xl">
            Experience the calm of an operational layer built specifically for
            PTO and PTA leaders.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Button
              href={trialHref}
              className="h-auto w-full rounded-full bg-[#f6f2eb] px-10 py-4 text-base text-cos-primary shadow-xl hover:bg-white sm:w-auto"
            >
              {trialLabel}
            </Button>
            <Link
              href="/pricing"
              className="rounded-full border border-[#f6f2eb]/25 px-10 py-4 text-base font-bold text-[#f6f2eb]/85 transition-colors hover:text-[#f6f2eb]"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <MarketingWowFooter />
    </div>
  );
}
