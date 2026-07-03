import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarRange, LayoutDashboard, Megaphone, Send, Sparkles, Users } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { StudioMarketingShell } from "@/components/marketing/StudioMarketingShell";
import { Button } from "@/components/ui/Button";
import { getInvitePreview } from "@/lib/auth/invite-preview";
import { SCHOOL_SETUP_PATH } from "@/lib/auth/post-auth-path";

type InvitePreview = Awaited<ReturnType<typeof getInvitePreview>>;

interface StudioHomePageProps {
  invitePreview?: InvitePreview | null;
  inviteToken?: string | null;
  authError?: string | null;
  userEmail?: string | null;
  nextPath?: string | null;
  setupIntent?: boolean;
  workspaceHref?: string;
}

const highlights = [
  {
    icon: Megaphone,
    title: "Campaign planning",
    description: "Timelines, artwork, and captions organized around each school event.",
  },
  {
    icon: Send,
    title: "Publish with confidence",
    description: "Schedule and send to Facebook and Instagram from one calm workspace.",
  },
  {
    icon: CalendarRange,
    title: "See the whole year",
    description: "Every deadline, post, and reminder on a single school calendar.",
  },
];

export function StudioHomePage({
  invitePreview = null,
  inviteToken = null,
  authError = null,
  userEmail = null,
  nextPath = null,
  setupIntent = false,
  workspaceHref = "/dashboard",
}: StudioHomePageProps) {
  const isSignedIn = Boolean(userEmail);
  const needsSchoolSetup = workspaceHref === SCHOOL_SETUP_PATH;
  const startSchoolHref = isSignedIn
    ? SCHOOL_SETUP_PATH
    : `/login?intent=setup&next=${encodeURIComponent(SCHOOL_SETUP_PATH)}`;
  const showNewSchoolPath = setupIntent || (!invitePreview && !isSignedIn);

  return (
    <StudioMarketingShell userEmail={userEmail} workspaceHref={workspaceHref}>
      <div className="relative grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_min(100%,520px)]">
        {/* Hero photo — left column on desktop, band behind content on mobile */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[42vh] lg:inset-y-0 lg:left-0 lg:h-auto lg:w-[calc(100%-min(100%,520px))]"
          aria-hidden
        >
          <Image
            src="/images/home-hero.png"
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-cover object-[center_40%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#f6f2eb]/30 via-[#f6f2eb]/75 to-[#f6f2eb] lg:bg-gradient-to-r lg:from-[#f6f2eb] lg:via-[#f6f2eb]/88 lg:to-[#f6f2eb]/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#f6f2eb] via-transparent to-[#f6f2eb]/50 lg:from-[#f6f2eb]/80 lg:via-transparent lg:to-[#f6f2eb]/20" />
        </div>

        <section className="relative z-10 order-2 flex flex-col justify-center px-6 pt-8 pb-16 lg:order-1 lg:px-10 lg:pt-24 lg:pb-24">
          <p className="studio-eyebrow">PTO communications, elevated</p>
          <h1 className="font-display mt-5 max-w-xl text-[2.75rem] leading-[1.05] text-cos-text sm:text-6xl lg:text-[4.25rem]">
            Your campaign workspace, designed like a studio.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-cos-muted sm:text-lg">
            Plan events, create artwork, draft captions, and publish — all in one
            warm, focused space built for busy PTO teams.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {!isSignedIn && showNewSchoolPath && (
              <Button href={startSchoolHref} size="lg">
                Start your PTO workspace
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
            {!isSignedIn && (
              <Button href="#sign-in" variant={showNewSchoolPath ? "secondary" : "primary"} size="lg">
                {invitePreview ? "Accept invite" : "Sign in"}
                {!showNewSchoolPath && <ArrowRight className="h-4 w-4" strokeWidth={1.5} />}
              </Button>
            )}
            <Link
              href="/features"
              className="text-sm tracking-wide text-cos-muted transition-colors hover:text-cos-text"
            >
              Features
            </Link>
            <span className="text-cos-border" aria-hidden>
              ·
            </span>
            <Link
              href="/about"
              className="text-sm tracking-wide text-cos-muted transition-colors hover:text-cos-text"
            >
              Our story
            </Link>
            <span className="text-cos-border" aria-hidden>
              ·
            </span>
            <Link
              href="/pricing"
              className="text-sm tracking-wide text-cos-muted transition-colors hover:text-cos-text"
            >
              Pricing from $29
            </Link>
          </div>

          {isSignedIn && (
            <div className="mt-10 flex flex-wrap items-center gap-4">
              {needsSchoolSetup ? (
                <Button href={SCHOOL_SETUP_PATH} size="lg">
                  Start school setup
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              ) : (
                <Button href={workspaceHref} size="lg">
                  <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
                  Enter workspace
                </Button>
              )}
            </div>
          )}

          <ul className="mt-14 space-y-8 border-t border-cos-border/80 pt-10">
            {highlights.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-cos-border bg-cos-card/90 backdrop-blur-sm">
                  <Icon className="h-4 w-4 text-cos-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-display text-xl text-cos-text">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-cos-muted">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="sign-in"
          className="relative z-10 order-1 flex items-center justify-center bg-cos-dark px-6 py-12 lg:order-2 lg:px-8 lg:py-24"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, #b8956f 0%, transparent 45%), radial-gradient(circle at 80% 70%, #fffcf7 0%, transparent 40%)",
            }}
            aria-hidden
          />

          <div className="relative w-full max-w-md">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 border border-cos-dark-muted/30 px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cos-accent" strokeWidth={1.5} />
                <span className="text-xs tracking-[0.16em] text-cos-dark-muted uppercase">
                  {isSignedIn ? "Signed in" : "Welcome"}
                </span>
              </div>
              <h2 className="font-display text-3xl text-[#f6f2eb] sm:text-4xl">
                {isSignedIn
                  ? needsSchoolSetup
                    ? "Start your school"
                    : "Welcome back"
                  : invitePreview
                    ? "Join your team"
                    : setupIntent
                      ? "Start your school"
                      : "Sign in"}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-cos-dark-muted">
                {isSignedIn
                  ? needsSchoolSetup
                    ? "You're signed in. Set up your PTO workspace — school profile, brand kit, and calendar — in a few minutes."
                    : "Your studio is ready. Pick up where you left off in your campaign workspace."
                  : invitePreview
                    ? `You're invited to ${invitePreview.organizationName}. Sign in to join your team.`
                    : setupIntent
                      ? "Enter your email and founding access code to create your account — then we'll walk you through school setup."
                      : "Returning to your workspace? Sign in below. Starting a new school? Choose Start your PTO workspace above."}
              </p>
            </div>

            {isSignedIn ? (
              <div className="space-y-4 border border-cos-dark-muted/20 bg-[#f6f2eb] p-8">
                <p className="text-sm text-cos-muted">{userEmail}</p>
                <Button href={needsSchoolSetup ? SCHOOL_SETUP_PATH : workspaceHref} size="lg" className="w-full">
                  {needsSchoolSetup ? "Start school setup" : "Enter workspace"}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Button>
                <form action="/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="block w-full text-center text-xs tracking-wide text-cos-muted transition-colors hover:text-cos-text"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <>
                {invitePreview && (
                  <div className="mb-6 border border-cos-dark-muted/25 bg-white/5 px-4 py-3 text-sm text-[#f6f2eb]">
                    <div className="flex items-start gap-3">
                      <Users className="mt-0.5 h-4 w-4 shrink-0 text-cos-accent" strokeWidth={1.5} />
                      <div>
                        <p className="font-medium">Joining an existing team</p>
                        <p className="mt-1 text-cos-dark-muted">
                          Invited as{" "}
                          <span className="font-medium text-[#f6f2eb]">
                            {invitePreview.roleName ?? invitePreview.campaignRole}
                          </span>
                          . Use <span className="font-medium text-[#f6f2eb]">{invitePreview.email}</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!invitePreview && setupIntent && (
                  <div className="mb-6 border border-cos-accent/30 bg-white/5 px-4 py-3 text-sm text-[#f6f2eb]">
                    <p className="font-medium">Starting a new PTO workspace</p>
                    <p className="mt-1 text-cos-dark-muted">
                      Enter your email and founding partner access code below.
                      We&apos;ll send you a link to create your account and
                      start school setup. Need a code?{" "}
                      <a
                        href="mailto:hello@campaignos.app"
                        className="text-cos-accent underline-offset-2 hover:underline"
                      >
                        Contact us
                      </a>
                      .
                    </p>
                  </div>
                )}

                {!invitePreview && !setupIntent && (
                  <div className="mb-6 border border-cos-dark-muted/25 bg-white/5 px-4 py-3 text-sm text-[#f6f2eb]">
                    <p>
                      <span className="font-medium">New school?</span>{" "}
                      <Link href={startSchoolHref} className="text-cos-accent underline-offset-2 hover:underline">
                        Start your PTO workspace
                      </Link>
                      .{" "}
                      <span className="font-medium">Joining a team?</span> Use the invite link your admin sent.
                    </p>
                  </div>
                )}

                {authError === "auth" && (
                  <p className="mb-4 text-sm text-red-300">
                    Sign-in link expired or invalid. Request a new one below.
                  </p>
                )}

                {authError === "code_required" && (
                  <p className="mb-4 text-sm text-red-300">
                    A valid founding access code is required to start a new
                    school workspace. Enter your email and code below.
                  </p>
                )}

                {authError === "existing_org" && (
                  <p className="mb-4 text-sm text-red-300">
                    This email already belongs to a school workspace. Sign in to
                    your existing workspace instead, or use an invite link to
                    join another team.
                  </p>
                )}

                {authError === "org_required" && (
                  <p className="mb-4 text-sm text-red-300">
                    Finish creating your school workspace with a founding access
                    code before using CampaignOS.
                  </p>
                )}

                <div className="border border-cos-dark-muted/20 bg-[#f6f2eb] p-8">
                  <LoginForm
                    inviteToken={inviteToken}
                    defaultEmail={invitePreview?.email ?? ""}
                    variant="studio"
                    nextPath={nextPath ?? (setupIntent ? SCHOOL_SETUP_PATH : null)}
                    setupIntent={setupIntent}
                  />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </StudioMarketingShell>
  );
}
