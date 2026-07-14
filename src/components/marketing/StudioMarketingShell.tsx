import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { MarketingSocialLinks } from "@/components/marketing/MarketingSocialLinks";
import { cn } from "@/lib/utils/cn";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/about", label: "Our Story" },
  { href: "/pricing", label: "Pricing" },
];

interface StudioMarketingShellProps {
  userEmail?: string | null;
  workspaceHref?: string;
  children: React.ReactNode;
}

export function StudioMarketingShell({
  userEmail,
  workspaceHref = "/dashboard",
  children,
}: StudioMarketingShellProps) {
  const isSignedIn = Boolean(userEmail);

  return (
    <div className="flex min-h-screen flex-col bg-cos-bg">
      <header className="sticky top-0 z-20 border-b border-cos-border/80 bg-cos-card/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 lg:px-10">
          <BrandLogo href="/" variant="full" size="nav" />

          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm tracking-wide text-cos-text/70 transition-colors hover:text-cos-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <MarketingSocialLinks />
            {isSignedIn && (
              <Link
                href={workspaceHref}
                className="text-sm tracking-wide text-cos-text/70 transition-colors hover:text-cos-text"
              >
                Workspace
              </Link>
            )}
          </div>
        </div>

        <nav className="flex gap-4 overflow-x-auto border-t border-cos-border/60 px-6 py-2 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 text-xs tracking-wide text-cos-text/70 uppercase"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-cos-border bg-cos-bg px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs tracking-wide text-cos-text/70">
            Hey Ralli · ORGANIZE. CREATE. CONNECT.
          </p>
          <div className="flex gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs tracking-wide text-cos-text/70 transition-colors hover:text-cos-text"
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
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const isDark = tone === "dark";

  return (
    <header
      className={cn(isDark ? "pb-0" : "border-b border-cos-border pb-10", className)}
    >
      <p className={cn("studio-eyebrow", isDark && "text-cos-dark-muted")}>{eyebrow}</p>
      <h1
        className={cn(
          "font-display mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl lg:text-6xl",
          isDark ? "text-[#f6f2eb]" : "text-cos-text",
        )}
      >
        {title}
      </h1>
      {description && (
        <p
          className={cn(
            "mt-5 max-w-2xl text-base leading-relaxed sm:text-lg",
            isDark ? "text-cos-dark-muted" : "text-cos-muted",
          )}
        >
          {description}
        </p>
      )}
    </header>
  );
}
