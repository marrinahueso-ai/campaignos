import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export const authLabelClassName =
  "mb-2 ml-1 block text-[11px] font-bold tracking-widest text-cos-muted uppercase";

export const authInputClassName =
  "w-full rounded-xl border border-cos-border bg-cos-card px-4 py-3.5 text-sm text-cos-text placeholder:text-cos-muted/50 outline-none transition-all focus:border-cos-brand-sage focus:ring-4 focus:ring-cos-brand-sage/10 disabled:opacity-60";

export const authPrimaryButtonClassName =
  "w-full rounded-xl bg-cos-primary py-4 text-sm font-bold tracking-widest text-[#f6f2eb] uppercase shadow-[0_8px_20px_-6px_rgba(42,38,34,0.25)] transition-colors hover:bg-cos-primary-hover disabled:cursor-not-allowed disabled:opacity-60";

export const authSecondaryButtonClassName =
  "flex w-full items-center justify-center gap-3 rounded-xl border border-cos-border bg-cos-card py-3.5 text-sm font-bold tracking-wide text-cos-text uppercase transition-colors hover:bg-cos-bg-alt disabled:cursor-not-allowed disabled:opacity-60";

export const authTitleClassName =
  "text-center font-display text-3xl tracking-tight text-cos-text italic sm:text-4xl";

export const authSubClassName =
  "mt-2 text-center text-sm font-medium leading-relaxed text-cos-muted";

export function AuthErrorMessage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn(
        "mt-4 text-center text-sm font-medium text-red-700",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function AuthSuccessMessage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      role="status"
      className={cn(
        "mt-4 text-center text-sm font-medium text-cos-brand-sage",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-8 flex items-center">
      <div className="flex-grow border-t border-cos-border" />
      <span className="mx-4 flex-shrink-0 text-[10px] font-bold tracking-[0.2em] text-cos-muted/70 uppercase">
        Or
      </span>
      <div className="flex-grow border-t border-cos-border" />
    </div>
  );
}

export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l6.3 5.3C39.4 36.2 44 31.3 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
