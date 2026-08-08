import Image from "next/image";
import Link from "next/link";
import { MarketingWowFooter } from "@/components/marketing-wow/MarketingWowFooter";
import { MarketingWowHeader } from "@/components/marketing-wow/MarketingWowHeader";
import { Button } from "@/components/ui/Button";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path-shared";

interface MarketingWowAboutPageProps {
  userEmail?: string | null;
  workspaceHref?: string;
}

/** Approved connected-workflow anchors — school-year order, not a feature matrix. */
const SCHOOL_YEAR_FLOW = [
  "Calendar",
  "Events",
  "Volunteers",
  "Content",
  "Approvals",
  "Publishing",
  "Results",
] as const;

/** Restrained principles — no icon grid, no corporate mission-statement tone. */
const PRINCIPLES = [
  {
    title: "Keep it calm.",
    body: "A quiet workspace beats another loud tool. Clarity over clutter.",
  },
  {
    title: "Make it useful.",
    body: "Every part of Hey Ralli exists because it showed up in real PTO work.",
  },
  {
    title: "Respect volunteers' time.",
    body: "Parents and teachers already give enough. Software should take less.",
  },
  {
    title: "Make complicated things feel simple.",
    body: "Planning, creating, approving, and publishing should feel like one flow.",
  },
  {
    title: "Keep the school community at the center.",
    body: "The goal isn’t more software. It’s more time for the people and the school year.",
  },
] as const;

export function MarketingWowAboutPage({
  userEmail = null,
  workspaceHref = "/dashboard",
}: MarketingWowAboutPageProps) {
  const isSignedIn = Boolean(userEmail);
  const needsSchoolSetup = workspaceHref === ONBOARDING_PATH;
  const dashboardCtaLabel = needsSchoolSetup ? "Continue setup" : "Open your dashboard";
  const setupHref = `/signup?next=${encodeURIComponent(ONBOARDING_PATH)}`;
  const trialHref = isSignedIn ? workspaceHref : setupHref;
  const trialLabel = isSignedIn ? dashboardCtaLabel : "Start your 14-day trial";

  return (
    <div className="bg-cos-bg">
      <MarketingWowHeader userEmail={userEmail} workspaceHref={workspaceHref} />

      {/* ============ Hero ============ */}
      <section className="px-6 pt-14 pb-24 text-center sm:pt-20 sm:pb-32">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-[2.5rem] leading-[1.05] tracking-tight text-cos-text italic sm:text-6xl md:text-[4.25rem]">
            Born from the work,
            <br className="hidden sm:block" /> not a{" "}
            <span className="text-cos-brand-sage">software company.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-cos-muted italic sm:text-xl">
            Hey Ralli wasn&rsquo;t dreamed up in a software company. It came
            from doing the work.
          </p>
        </div>
      </section>

      {/* ============ Founder story ============ */}
      <section className="px-6 pb-24 sm:pb-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <div className="order-2 lg:order-1">
              <div className="rounded-[32px] border border-cos-border bg-cos-card p-6 shadow-[0_20px_50px_-20px_rgba(42,38,34,0.12)] sm:p-10 sm:rounded-[40px]">
                <div className="relative aspect-[5/4] overflow-hidden rounded-[24px] bg-cos-bg sm:rounded-[28px]">
                  <Image
                    src="/images/marketing-about/founder.jpg"
                    alt="Hey Ralli founder — mom and PTO board member"
                    fill
                    sizes="(max-width: 1024px) 100vw, 520px"
                    className="object-cover object-[center_20%]"
                    priority
                  />
                </div>
                <div className="mt-6 space-y-1.5 px-1">
                  <p className="font-display text-lg text-cos-text italic">
                    The founder&rsquo;s perspective
                  </p>
                  <p className="text-[11px] font-bold tracking-widest text-cos-muted uppercase">
                    Mom &amp; PTO Board Member
                  </p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="font-display text-3xl leading-tight text-cos-text italic sm:text-4xl lg:text-5xl">
                A story of
                <br /> doing the work.
              </h2>
              <div className="mt-8 space-y-6 text-base leading-relaxed text-cos-muted sm:text-lg">
                <p>
                  Hey Ralli came from a mom who served on her school&rsquo;s PTO
                  Board. While doing the work herself, she experienced how
                  fragmented running a PTO could become.
                </p>
                <p>
                  The calendar was in one place. Volunteer information was
                  somewhere else. Artwork and communications required other
                  tools. Files lived somewhere else. Social media required
                  another workflow. Approvals happened through messages and
                  conversations. Planning meant moving back and forth between
                  multiple systems.
                </p>
                <p>
                  The problem wasn&rsquo;t the people — it was the
                  fragmentation. The tools weren&rsquo;t built around the way a
                  PTO actually works. She wasn&rsquo;t looking to build another
                  tool. She wanted one place where the work of running a PTO
                  could come together.
                </p>
                <p>That need became Hey Ralli.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Built around the school year ============ */}
      <section className="mx-6 mb-8 overflow-hidden rounded-[40px] bg-cos-dark px-6 py-20 text-[#f6f2eb] sm:py-28 sm:px-10">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-3xl italic sm:text-4xl lg:text-5xl">
            Built around the school year.
          </h2>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-cos-dark-muted sm:text-xl">
            Hey Ralli organizes work around the school year itself — one
            connected flow from the first date on the calendar to the results
            that follow.
          </p>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-3 gap-y-8 sm:gap-x-5">
            {SCHOOL_YEAR_FLOW.map((step, index) => (
              <div key={step} className="flex items-center gap-3 sm:gap-5">
                <div className="min-w-[5.5rem] text-center sm:min-w-[6.5rem]">
                  <p className="font-display text-2xl text-cos-brand-sage italic sm:text-3xl">
                    {step}
                  </p>
                  <div className="mx-auto mt-3 h-px w-8 bg-[#f6f2eb]/15" />
                </div>
                {index < SCHOOL_YEAR_FLOW.length - 1 ? (
                  <span
                    className="hidden text-sm text-[#f6f2eb]/25 sm:inline"
                    aria-hidden
                  >
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Values ============ */}
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-3xl text-cos-text italic sm:text-4xl">
            The calm behind the work.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-cos-muted sm:text-lg">
            Help school volunteers spend less time managing the work around
            their community and more time actually building it.
          </p>

          <div className="mt-16 grid gap-10 text-left sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {PRINCIPLES.map((principle) => (
              <div key={principle.title} className="space-y-3">
                <h3 className="text-xs font-bold tracking-widest text-cos-muted uppercase">
                  {principle.title}
                </h3>
                <p className="text-sm leading-relaxed text-cos-muted">
                  {principle.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Final CTA ============ */}
      <section className="px-6 pb-24 text-center sm:pb-32">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-4xl leading-tight text-cos-text italic sm:text-5xl">
            Built for the people who keep school communities moving.
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-cos-muted italic">
            Your school year deserves one calm, connected workspace.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Button
              href={trialHref}
              variant="primary"
              className="h-auto w-full rounded-full px-10 py-4 text-sm sm:w-auto"
            >
              {trialLabel}
            </Button>
            <Link
              href="/why-hey-ralli"
              className="rounded-full px-10 py-4 text-sm font-bold text-cos-muted transition-colors hover:text-cos-text"
            >
              See why Hey Ralli
            </Link>
          </div>
        </div>
      </section>

      <MarketingWowFooter />
    </div>
  );
}
