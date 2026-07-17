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
  foundingCodeRetry?: boolean;
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
  foundingCodeRetry = false,
}: StudioHomePageProps) {
  const isSignedIn = Boolean(userEmail);
  const needsSchoolSetup = workspaceHref === SCHOOL_SETUP_PATH;
  const showSetupForm = setupIntent && (!isSignedIn || foundingCodeRetry);
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
            fetchPriority="high"
            loading="eager"
            quality={75}
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
          <p className="mt-6 max-w-lg text-base leading-relaxed text-cos-text/75 sm:text-lg">
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
              href="/pricing"
              className="text-sm tracking-wide text-cos-text/70 transition-colors hover:text-cos-text"
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
                  <p className="mt-1 text-sm leading-relaxed text-cos-text/70">{description}</p>
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
                    : showSetupForm
                      ? foundingCodeRetry
                        ? "Confirm your access code"
                        : "Start your school"
                      : "Sign in"}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-cos-dark-muted">
                {isSignedIn
                  ? needsSchoolSetup
                    ? "You're signed in. Set up your PTO workspace — school profile, brand kit, and calendar — in a few minutes."
                    : "Your studio is ready. Pick up where you left off in your campaign workspace."
                  : invitePreview
                    ? `You're invited to ${invitePreview.organizationName}. Sign in to join your team.`
                    : showSetupForm
                      ? foundingCodeRetry
                        ? "Your sign-in link worked. Re-enter your founding access code to continue to school setup."
                        : "Enter your email and founding access code to create your account — then we'll walk you through school setup."
                      : "Returning to your workspace? Sign in below. Starting a new school? Choose Start your PTO workspace above."}
              </p>
            </div>

            {isSignedIn && !foundingCodeRetry ? (
              <div className="space-y-4 border border-cos-dark-muted/20 bg-[#f6f2eb] p-8">
                {authError === "existing_org" && (
                  <p className="text-sm text-red-600">
                    This email already has a workspace.{" "}
                    <Link
                      href={workspaceHref}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      Sign in to continue
                    </Link>
                    , or use an invite link to join another team.
                  </p>
                )}
                {authError === "account_deactivated" && (
                  <p className="text-sm text-red-600">
                    Your account has been deactivated for this workspace. Contact
                    an admin to be reinvited — this is not a new school signup.
                  </p>
                )}
                <p className="text-sm text-cos-muted">{userEmail}</p>
                {authError === "account_deactivated" ? null : (
                  <Button href={needsSchoolSetup ? SCHOOL_SETUP_PATH : workspaceHref} size="lg" className="w-full">
                    {needsSchoolSetup ? "Start school setup" : "Go to your workspace"}
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                )}
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

                {!invitePreview && showSetupForm && (
                  <div className="mb-6 border border-cos-accent/30 bg-white/5 px-4 py-3 text-sm text-[#f6f2eb]">
                    <p className="font-medium">
                      {foundingCodeRetry
                        ? "Almost there"
                        : "Starting a new PTO workspace"}
                    </p>
                    <p className="mt-1 text-cos-dark-muted">
                      {foundingCodeRetry
                        ? "Enter the same founding access code you used when requesting your sign-in link."
                        : "Enter your email and founding partner access code below. We'll send you a link to create your account and start school setup. Need a code? "}
                      {!foundingCodeRetry && (
                        <>
                          <a
                            href="mailto:hello@heyralli.com"
                            className="text-cos-accent underline-offset-2 hover:underline"
                          >
                            Contact us
                          </a>
                          .
                        </>
                      )}
                    </p>
                  </div>
                )}

                {!invitePreview && !showSetupForm && (
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
                    This email already has a workspace.{" "}
                    <Link
                      href={workspaceHref}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      Sign in to continue
                    </Link>
                    , or use an invite link to join another team.
                  </p>
                )}

                {authError === "org_required" && (
                  <p className="mb-4 text-sm text-red-300">
                    Finish creating your school workspace with a founding access
                    code before using Hey Ralli.
                  </p>
                )}

                {authError === "account_deactivated" && (
                  <p className="mb-4 text-sm text-red-300">
                    Your account has been deactivated. Contact an admin to be
                    reinvited — this is not a new school signup.
                  </p>
                )}

                {authError === "invite_email" && (
                  <p className="mb-4 text-sm text-red-300">
                    Sign in with the invited email
                    {invitePreview?.email ? (
                      <>
                        {" "}
                        (<span className="font-medium text-white">
                          {invitePreview.email}
                        </span>
                      </>
                    ) : null}{" "}
                    (Google or Magic link) to join this team. This is not a new
                    school signup.
                  </p>
                )}

                <div className="border border-cos-dark-muted/20 bg-[#f6f2eb] p-8">
                  <LoginForm
                    inviteToken={inviteToken}
                    defaultEmail={invitePreview?.email ?? userEmail ?? ""}
                    variant="studio"
                    nextPath={nextPath ?? (setupIntent ? SCHOOL_SETUP_PATH : null)}
                    setupIntent={setupIntent}
                    foundingCodeRetry={foundingCodeRetry}
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
