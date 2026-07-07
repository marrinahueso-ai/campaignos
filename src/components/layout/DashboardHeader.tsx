"use client";

import { Home, Menu, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface DashboardHeaderProps {
  userEmail?: string | null;
  mobileOpen: boolean;
  onToggleMobile: () => void;
}

function UtilityIconLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center border border-transparent transition-colors",
        active
          ? "border-cos-border bg-cos-dark text-[#f6f2eb]"
          : "text-cos-muted hover:border-cos-border hover:bg-cos-bg hover:text-cos-text",
      )}
    >
      {children}
    </Link>
  );
}

export function DashboardHeader({
  userEmail,
  mobileOpen,
  onToggleMobile,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const onSettings = pathname.startsWith("/settings");

  return (
    <header className="sticky top-0 z-40 border-b border-cos-border/80 bg-cos-card/90 backdrop-blur-md">
      <div className="flex h-[4.25rem] items-center gap-4 px-4 lg:px-8">
        <button
          type="button"
          aria-label="Open navigation"
          className="p-2 text-cos-muted transition-colors hover:text-cos-text lg:hidden"
          onClick={onToggleMobile}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" strokeWidth={1.5} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          )}
        </button>

        <div className="min-w-0 flex-1" aria-hidden="true" />

        <div className="flex items-center gap-2 sm:gap-3">
          <UtilityIconLink
            href="/dashboard"
            label="Home"
            active={pathname === "/dashboard" || pathname === "/"}
          >
            <Home className="h-4 w-4" strokeWidth={1.5} />
          </UtilityIconLink>
          <UtilityIconLink href="/settings" label="Settings" active={onSettings}>
            <Settings className="h-4 w-4" strokeWidth={1.5} />
          </UtilityIconLink>

          {userEmail && (
            <div className="hidden border-l border-cos-border pl-3 text-right sm:block">
              <p className="max-w-[12rem] truncate text-xs text-cos-muted">{userEmail}</p>
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-xs tracking-wide text-cos-muted transition-colors hover:text-cos-text"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
