import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
];

interface StudioMarketingShellProps {
  userEmail?: string | null;
  children: React.ReactNode;
}

export function StudioMarketingShell({ userEmail, children }: StudioMarketingShellProps) {
  const isSignedIn = Boolean(userEmail);

  return (
    <div className="flex min-h-screen flex-col bg-cos-bg">
      <header className="sticky top-0 z-20 border-b border-cos-border/80 bg-cos-card/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 lg:px-10">
          <Link href="/" className="flex shrink-0 items-baseline gap-2">
            <span className="font-display text-2xl text-cos-text">CampaignOS</span>
            <span className="hidden text-xs tracking-[0.2em] text-cos-muted uppercase sm:inline">
              Studio
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm tracking-wide text-cos-muted transition-colors hover:text-cos-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden text-sm tracking-wide text-cos-muted transition-colors hover:text-cos-text sm:inline"
                >
                  Workspace
                </Link>
                <Button href="/dashboard" size="sm">
                  Enter workspace
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </>
            ) : (
              <Button href="#sign-in" size="sm">
                Sign in
              </Button>
            )}
          </div>
        </div>

        <nav className="flex gap-4 overflow-x-auto border-t border-cos-border/60 px-6 py-2 md:hidden">
          {!isSignedIn && (
            <Link
              href="#sign-in"
              className="shrink-0 text-xs font-medium tracking-wide text-cos-text uppercase"
            >
              Sign in
            </Link>
          )}
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 text-xs tracking-wide text-cos-muted uppercase"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-cos-border bg-cos-bg px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs tracking-wide text-cos-muted">
            CampaignOS · Communications for school communities
          </p>
          <div className="flex gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs tracking-wide text-cos-muted transition-colors hover:text-cos-text"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export function StudioMarketingPageHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-cos-border pb-10", className)}>
      <p className="studio-eyebrow">{eyebrow}</p>
      <h1 className="font-display mt-4 max-w-3xl text-4xl leading-tight text-cos-text sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      {description && (
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-cos-muted sm:text-lg">
          {description}
        </p>
      )}
    </header>
  );
}
