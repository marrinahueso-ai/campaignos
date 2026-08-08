"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCheck,
  ChevronRight,
  CreditCard,
  Flag,
  FolderTree,
  HeartHandshake,
  HelpCircle,
  MailOpen,
  PlayCircle,
  Rocket,
  Search,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { MarketingWowFooter } from "@/components/marketing-wow/MarketingWowFooter";
import { MarketingWowHeader } from "@/components/marketing-wow/MarketingWowHeader";
import { Button } from "@/components/ui/Button";
import { HELP_SUPPORT_EMAIL } from "@/lib/help-center/articles";

interface MarketingWowResourcesPageProps {
  userEmail?: string | null;
  workspaceHref?: string;
  /** Computed server-side (needs `ONBOARDING_PATH`, which pulls in server-only auth code). */
  dashboardCtaLabel?: string;
}

/**
 * Real destinations only — the public `/features` "See Hey Ralli in Action" page
 * ships live Motion-engine demos (not fabricated screenshots) with stable anchors
 * per `FEATURES_IN_ACTION_STORIES`. Pricing covers billing/AI Reserve/permissions
 * accurately. There is no dedicated public tutorial-video or FAQ system yet.
 */
const TOPICS = [
  { id: "getting-started", label: "Getting Started", icon: Flag, href: "/get-started" },
  { id: "calendar", label: "Calendar & Events", icon: CalendarDays, href: "/features#plan-your-year" },
  { id: "create-with-ai", label: "Create with AI", icon: Sparkles, href: "/features#create-with-ai" },
  { id: "volunteers", label: "Volunteers", icon: HeartHandshake, href: "/features#volunteer-intelligence" },
  { id: "approvals", label: "Approvals", icon: CheckCheck, href: "/features#approvals" },
  { id: "social-publishing", label: "Social Publishing", icon: Camera, href: "/features#create-with-ai" },
  { id: "communications-hub", label: "Communications Hub", icon: MailOpen, href: "/features#communications-hub" },
  { id: "team-permissions", label: "Team & Permissions", icon: UsersRound, href: "/pricing" },
  { id: "files", label: "Files", icon: FolderTree, href: "/features" },
  { id: "billing-credits", label: "Billing & AI Credits", icon: CreditCard, href: "/pricing" },
] as const;

/**
 * "Featured Tutorials" — no recorded tutorial videos exist yet, so these link to
 * the real live demos on `/features` instead of a fabricated video player. No
 * invented durations/view counts; badge says what it actually is (a live demo).
 */
const FEATURED_TUTORIALS = [
  {
    id: "getting-started",
    icon: Rocket,
    title: "Getting started with Hey Ralli",
    description: "Create your first event, then finish calendar, brand, and team setup.",
    href: "/get-started",
  },
  {
    id: "create-with-ai",
    icon: Sparkles,
    title: "Creating social posts with AI",
    description: "See Create with AI turn one event into artwork, captions, and milestones.",
    href: "/features#create-with-ai",
  },
  {
    id: "volunteers",
    icon: HeartHandshake,
    title: "Coordinating your volunteers",
    description: "See how Volunteer Master tracks fill rate and underfilled roles.",
    href: "/features#volunteer-intelligence",
  },
] as const;

/** Step-by-Step Guides — every title maps to real, shipped functionality. */
const GUIDES = [
  {
    id: "school-calendar",
    category: "Planning",
    title: "Setting up your annual school calendar",
    href: "/features#plan-your-year",
  },
  {
    id: "board-permissions",
    category: "Security",
    title: "Managing board member permissions",
    href: "/pricing",
  },
  {
    id: "social-campaign",
    category: "Marketing",
    title: "Launching a spirit wear social campaign",
    href: "/features#create-with-ai",
  },
  {
    id: "ai-reserve",
    category: "Finance",
    title: "Tracking and spending AI Reserve credits",
    href: "/pricing",
  },
] as const;

interface SearchableItem {
  id: string;
  section: string;
  title: string;
  description?: string;
  href: string;
  icon: typeof Search;
}

const SEARCH_INDEX: SearchableItem[] = [
  ...TOPICS.map((topic) => ({
    id: `topic-${topic.id}`,
    section: "Topic",
    title: topic.label,
    href: topic.href,
    icon: topic.icon,
  })),
  ...FEATURED_TUTORIALS.map((tutorial) => ({
    id: `tutorial-${tutorial.id}`,
    section: "Tutorial",
    title: tutorial.title,
    description: tutorial.description,
    href: tutorial.href,
    icon: tutorial.icon,
  })),
  ...GUIDES.map((guide) => ({
    id: `guide-${guide.id}`,
    section: "Guide",
    title: guide.title,
    description: guide.category,
    href: guide.href,
    icon: ChevronRight,
  })),
];

export function MarketingWowResourcesPage({
  userEmail = null,
  workspaceHref = "/dashboard",
  dashboardCtaLabel = "Open your dashboard",
}: MarketingWowResourcesPageProps) {
  const [query, setQuery] = useState("");
  const isSignedIn = Boolean(userEmail);

  const trimmedQuery = query.trim();
  const results = useMemo(() => {
    if (!trimmedQuery) return [];
    const q = trimmedQuery.toLowerCase();
    return SEARCH_INDEX.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q),
    );
  }, [trimmedQuery]);
  const isSearching = trimmedQuery.length > 0;

  return (
    <div className="bg-cos-bg">
      <MarketingWowHeader userEmail={userEmail} workspaceHref={workspaceHref} />

      {/* ============ Hero + search ============ */}
      <section className="px-6 pt-10 pb-16 text-center sm:pt-14 sm:pb-20">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-[2.5rem] leading-[1.05] tracking-tight text-cos-text italic sm:text-6xl md:text-[4rem]">
            How can we <span className="text-cos-brand-sage">help you today?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cos-muted">
            Guides, tutorials, and answers for the parents and teachers who
            keep our schools running.
          </p>

          <div className="relative mx-auto mt-9 max-w-xl">
            <Search
              className="pointer-events-none absolute top-1/2 left-5 h-4 w-4 -translate-y-1/2 text-cos-muted"
              aria-hidden
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search topics, tutorials, or guides…"
              aria-label="Search Resources"
              className="w-full rounded-full border border-cos-border bg-cos-card py-4 pl-12 pr-12 text-sm text-cos-text shadow-sm placeholder:text-cos-muted/70 transition-shadow focus:border-cos-brand-sage focus:shadow-md focus:outline-none focus:ring-2 focus:ring-cos-brand-sage/15"
            />
            {isSearching ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-4 -translate-y-1/2 text-cos-muted transition-colors hover:text-cos-text"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {isSearching ? (
        /* ============ Search results ============ */
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold tracking-wide text-cos-muted uppercase">
              {results.length === 0
                ? `No matches for "${trimmedQuery}"`
                : `${results.length} result${results.length === 1 ? "" : "s"} for "${trimmedQuery}"`}
            </p>
            {results.length === 0 ? (
              <p className="mt-4 text-base leading-relaxed text-cos-muted">
                Try a different word, or browse topics and guides below —
                or{" "}
                <a
                  href={`mailto:${HELP_SUPPORT_EMAIL}?subject=Hey%20Ralli%20help`}
                  className="font-semibold text-cos-text underline decoration-cos-border underline-offset-2 hover:decoration-cos-text"
                >
                  email support
                </a>{" "}
                and we&rsquo;ll point you in the right direction.
              </p>
            ) : (
              <div className="mt-6 divide-y divide-cos-border rounded-[24px] border border-cos-border bg-cos-card">
                {results.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-4 px-6 py-5 transition-colors hover:bg-cos-bg-alt/50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cos-brand-sage-soft text-cos-brand-sage">
                      <item.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-[10px] font-bold tracking-widest text-cos-muted uppercase">
                        {item.section}
                      </span>
                      <span className="block font-semibold text-cos-text">{item.title}</span>
                      {item.description ? (
                        <span className="block text-sm text-cos-muted">{item.description}</span>
                      ) : null}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-cos-muted" aria-hidden />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* ============ Quick starting paths ============ */}
          <section className="px-6 pb-16 sm:pb-20">
            <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
              <Link
                href="/get-started"
                className="group relative flex flex-col overflow-hidden rounded-[28px] bg-cos-primary p-9 text-[#f6f2eb] shadow-md transition-transform hover:-translate-y-1"
              >
                <Rocket className="absolute -right-6 -bottom-6 h-40 w-40 text-[#f6f2eb]/10" aria-hidden />
                <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-xl bg-[#f6f2eb]/10">
                  <Rocket className="h-4.5 w-4.5 text-cos-brand-sage" aria-hidden />
                </span>
                <h3 className="font-display relative z-10 mt-7 text-2xl italic">Getting Started</h3>
                <p className="relative z-10 mt-3 text-sm leading-relaxed text-[#f6f2eb]/70">
                  New to Hey Ralli? Follow our quick-start path to set up
                  your organization in minutes.
                </p>
                <span className="relative z-10 mt-auto flex items-center gap-2 pt-7 text-sm font-bold tracking-widest text-cos-brand-sage uppercase">
                  Start the path <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </Link>

              <Link
                href="/features"
                className="group flex flex-col rounded-[28px] border border-cos-border bg-cos-card p-9 shadow-sm transition-transform hover:-translate-y-1"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cos-brand-sage-soft">
                  <PlayCircle className="h-4.5 w-4.5 text-cos-brand-sage" aria-hidden />
                </span>
                <h3 className="font-display mt-7 text-2xl text-cos-text italic">Watch &amp; Learn</h3>
                <p className="mt-3 text-sm leading-relaxed text-cos-muted">
                  Live walkthroughs of Create with AI, Calendar, Approvals,
                  Volunteers, and more.
                </p>
                <span className="mt-auto flex items-center gap-2 pt-7 text-sm font-bold tracking-widest text-cos-text uppercase transition-colors group-hover:text-cos-brand-sage">
                  Browse demos <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </Link>

              <a
                href="#browse-by-topic"
                className="group flex flex-col rounded-[28px] border border-cos-border bg-cos-card p-9 shadow-sm transition-transform hover:-translate-y-1"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cos-bg-alt">
                  <HelpCircle className="h-4.5 w-4.5 text-cos-muted" aria-hidden />
                </span>
                <h3 className="font-display mt-7 text-2xl text-cos-text italic">Common Questions</h3>
                <p className="mt-3 text-sm leading-relaxed text-cos-muted">
                  Find quick answers about billing, AI credits, team
                  permissions, and more.
                </p>
                <span className="mt-auto flex items-center gap-2 pt-7 text-sm font-bold tracking-widest text-cos-text uppercase transition-colors group-hover:text-cos-brand-sage">
                  Browse topics <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </a>
            </div>
          </section>

          {/* ============ Featured tutorials ============ */}
          <section className="border-y border-cos-border bg-cos-bg-alt/60 px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-7xl">
              <div className="mb-14 flex flex-col items-end justify-between gap-6 sm:flex-row">
                <div className="max-w-xl">
                  <h2 className="font-display text-3xl text-cos-text italic sm:text-4xl">
                    Featured Tutorials
                  </h2>
                  <p className="mt-3 text-base text-cos-muted">
                    Walkthroughs of the tools our community uses most every
                    day.
                  </p>
                </div>
                <Link
                  href="/features"
                  className="flex items-center gap-2 text-sm font-bold tracking-widest text-cos-text uppercase transition-colors hover:text-cos-brand-sage"
                >
                  Explore all demos <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>

              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURED_TUTORIALS.map((tutorial) => (
                  <Link key={tutorial.id} href={tutorial.href} className="group">
                    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-cos-border bg-cos-brand-sage-soft/70 shadow-sm transition-shadow group-hover:shadow-lg">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
                        <tutorial.icon className="h-6 w-6 text-cos-primary" aria-hidden />
                      </span>
                      <span className="absolute bottom-4 left-4 rounded bg-cos-primary/80 px-2 py-1 text-[10px] font-bold tracking-widest text-[#f6f2eb] uppercase backdrop-blur-md">
                        Live demo
                      </span>
                    </div>
                    <h4 className="mt-6 font-bold text-cos-text transition-colors group-hover:text-cos-brand-sage">
                      {tutorial.title}
                    </h4>
                    <p className="mt-2 text-xs leading-relaxed text-cos-muted">
                      {tutorial.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ============ Browse by topic ============ */}
          <section id="browse-by-topic" className="scroll-mt-24 px-6 py-20 sm:py-28">
            <div className="mx-auto max-w-7xl">
              <div className="mb-16 text-center">
                <h2 className="font-display text-3xl text-cos-text italic sm:text-4xl">
                  Browse by Topic
                </h2>
                <p className="mt-3 text-base text-cos-muted">
                  Deep dives into every corner of the Hey Ralli experience.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
                {TOPICS.map((topic) => (
                  <Link
                    key={topic.id}
                    href={topic.href}
                    className="group flex flex-col items-center rounded-[20px] border border-cos-border bg-cos-card p-6 text-center shadow-sm transition-colors hover:border-cos-brand-sage"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cos-bg-alt transition-colors group-hover:bg-cos-brand-sage-soft">
                      <topic.icon
                        className="h-4.5 w-4.5 text-cos-muted transition-colors group-hover:text-cos-brand-sage"
                        aria-hidden
                      />
                    </span>
                    <span className="mt-4 text-sm font-bold text-cos-text transition-colors group-hover:text-cos-brand-sage">
                      {topic.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ============ Step-by-step guides ============ */}
          <section className="mx-6 mb-24 overflow-hidden rounded-[40px] bg-cos-dark px-6 py-20 text-[#f6f2eb] sm:py-24 sm:px-10">
            <div className="mx-auto max-w-7xl">
              <div className="mb-14 flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
                <div className="max-w-xl">
                  <h2 className="font-display text-3xl italic sm:text-4xl">
                    Step-by-Step Guides
                  </h2>
                  <p className="mt-3 text-cos-dark-muted">
                    Deeper instructions for the more detailed parts of your
                    school year.
                  </p>
                </div>
                <Link
                  href="/features"
                  className="shrink-0 rounded-full bg-[#f6f2eb] px-7 py-3.5 text-sm font-bold text-cos-primary shadow-lg transition-colors hover:bg-white"
                >
                  Explore Features
                </Link>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {GUIDES.map((guide) => (
                  <Link
                    key={guide.id}
                    href={guide.href}
                    className="group rounded-[24px] border border-white/10 bg-white/5 p-7 backdrop-blur-md transition-colors hover:bg-white/10"
                  >
                    <span className="block text-[10px] font-bold tracking-widest text-cos-brand-sage uppercase">
                      {guide.category}
                    </span>
                    <h5 className="mt-4 text-lg font-bold leading-snug transition-colors group-hover:text-cos-brand-sage">
                      {guide.title}
                    </h5>
                    <span className="mt-6 flex items-center gap-2 text-xs font-bold tracking-widest text-cos-dark-muted uppercase transition-colors group-hover:text-[#f6f2eb]">
                      Read Guide <ChevronRight className="h-3 w-3" aria-hidden />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ============ Support CTA ============ */}
      <section className="px-6 py-20 text-center sm:py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-4xl leading-tight text-cos-text italic sm:text-5xl">
            Still need a hand?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cos-muted italic">
            We&rsquo;re here to help the people who quietly make school
            happen. Send us a message and we&rsquo;ll get back to you as soon
            as we can.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row sm:gap-6">
            <a
              href={`mailto:${HELP_SUPPORT_EMAIL}?subject=Hey%20Ralli%20help`}
              className="inline-flex h-auto items-center justify-center gap-2 rounded-full bg-cos-primary px-10 py-4 text-sm font-medium text-[#f6f2eb] shadow-md transition-all hover:bg-cos-primary-hover"
            >
              Message Support
            </a>
            <Button
              href={isSignedIn ? workspaceHref : "/get-started"}
              variant="secondary"
              className="h-auto rounded-full px-10 py-4 text-sm"
            >
              {isSignedIn ? dashboardCtaLabel : "Get Started"}
            </Button>
          </div>
        </div>
      </section>

      <MarketingWowFooter />
    </div>
  );
}
