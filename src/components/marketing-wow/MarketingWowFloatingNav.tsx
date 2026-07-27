"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", match: (path: string) => path === "/" },
  { href: "/login", label: "Log in", match: (path: string) => path === "/login" },
  {
    href: "/signup",
    label: "Sign up",
    match: (path: string) => path === "/signup",
  },
  {
    href: "/forgot-password",
    label: "Forgot",
    match: (path: string) => path === "/forgot-password",
  },
  {
    href: "/invite",
    label: "Invite",
    match: (path: string) => path === "/invite" || path.startsWith("/invite/"),
  },
  {
    href: "/privacy",
    label: "Privacy",
    match: (path: string) => path === "/privacy",
  },
  { href: "/terms", label: "Terms", match: (path: string) => path === "/terms" },
] as const;

export function MarketingWowFloatingNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="review-bar" aria-label="Marketing pages">
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
