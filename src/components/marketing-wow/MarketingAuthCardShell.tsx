import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils/cn";

interface MarketingAuthCardShellProps {
  children: ReactNode;
  /** Wider card for choice lists / invite. */
  maxWidthClassName?: string;
  className?: string;
}

/**
 * Centered cream auth card shell shared by Login, Forgot, Welcome, Founding,
 * Invite, Update Password, and New School Handoff — matches the approved
 * Get Started / Auth package visual language.
 */
export function MarketingAuthCardShell({
  children,
  maxWidthClassName = "max-w-[440px]",
  className,
}: MarketingAuthCardShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cos-bg px-6 py-10">
      <Link href="/" className="mb-10 md:mb-12">
        <BrandLogo href={null} variant="full" size="nav" />
      </Link>

      <div
        className={cn(
          "relative w-full rounded-[32px] border border-cos-border bg-cos-card p-8 shadow-[0_8px_30px_-4px_rgba(42,38,34,0.04),0_4px_12px_-2px_rgba(42,38,34,0.02)] md:p-10",
          maxWidthClassName,
          className,
        )}
      >
        {children}
      </div>

      <p className="mt-8 text-[11px] font-bold tracking-widest text-cos-muted/60 uppercase">
        © {new Date().getFullYear()} Hey Ralli
      </p>
    </div>
  );
}

export function MarketingAuthBackLink({
  href,
  label = "Back",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="absolute top-10 left-8 text-cos-muted transition-colors hover:text-cos-text md:left-10"
    >
      <span aria-hidden className="text-lg leading-none">
        ←
      </span>
    </Link>
  );
}

export function MarketingAuthLegalNote({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <p className="mt-8 text-center text-[11px] leading-relaxed font-bold tracking-widest text-cos-muted/70 uppercase">
      {children ?? (
        <>
          By continuing, you agree to the Hey Ralli{" "}
          <Link href="/terms" className="underline hover:text-cos-text">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-cos-text">
            Privacy Policy
          </Link>
          .
        </>
      )}
    </p>
  );
}
