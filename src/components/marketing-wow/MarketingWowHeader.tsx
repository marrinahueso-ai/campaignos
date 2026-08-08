import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { ONBOARDING_PATH } from "@/lib/auth/post-auth-path-shared";
import { MARKETING_WOW_NAV_LINKS } from "@/components/marketing-wow/nav-links";

interface MarketingWowHeaderProps {
  userEmail?: string | null;
  workspaceHref?: string;
}

/** Shared marketing header — nav + auth-aware CTA, used by the homepage and Pricing. */
export function MarketingWowHeader({
  userEmail = null,
  workspaceHref = "/dashboard",
}: MarketingWowHeaderProps) {
  const isSignedIn = Boolean(userEmail);
  const needsSchoolSetup = workspaceHref === ONBOARDING_PATH;
  const dashboardCtaLabel = needsSchoolSetup ? "Continue setup" : "Open your dashboard";

  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-7 lg:px-10">
        <BrandLogo href="/" variant="full" size="nav" />

        <nav
          className="hidden items-center gap-9 text-[13px] font-semibold tracking-wide text-cos-muted uppercase md:flex"
          aria-label="Marketing"
        >
          {MARKETING_WOW_NAV_LINKS.map((link) => (
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
                href="/get-started"
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
  );
}
