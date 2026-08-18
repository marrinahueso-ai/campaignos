"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";
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
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const isSignedIn = Boolean(userEmail);
  const needsSchoolSetup = workspaceHref === ONBOARDING_PATH;
  const dashboardCtaLabel = needsSchoolSetup ? "Continue setup" : "Open your dashboard";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navLinks = (
    <>
      {MARKETING_WOW_NAV_LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className="transition-colors hover:text-cos-text"
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        );
      })}
      {!isSignedIn && (
        <Link
          href="/login"
          className="transition-colors hover:text-cos-text"
          onClick={() => setMenuOpen(false)}
        >
          Log in
        </Link>
      )}
    </>
  );

  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-7 lg:px-10">
        <BrandLogo href="/" variant="full" size="nav" />

        <nav
          className="hidden items-center gap-9 text-[13px] font-semibold tracking-wide text-cos-muted uppercase md:flex"
          aria-label="Marketing"
        >
          {navLinks}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
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
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cos-border bg-cos-card text-cos-text transition-colors hover:border-cos-brand-sage md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id={menuId}
          className="border-t border-cos-border bg-cos-bg px-6 py-4 md:hidden"
          aria-label="Marketing"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1 text-[13px] font-semibold tracking-wide text-cos-muted uppercase">
            {MARKETING_WOW_NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className="rounded-xl px-3 py-3 transition-colors hover:bg-cos-card hover:text-cos-text"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
            {!isSignedIn ? (
              <Link
                href="/login"
                className="rounded-xl px-3 py-3 transition-colors hover:bg-cos-card hover:text-cos-text"
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
