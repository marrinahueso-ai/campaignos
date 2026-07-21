import { cn } from "@/lib/utils/cn";

interface MetaPlatformIconsProps {
  className?: string;
  size?: "xs" | "sm";
}

interface MetaPlatformBadgesProps {
  className?: string;
  /** Default `md` = h-6 w-6 (Campaign Builder milestone rows). */
  size?: "sm" | "md" | "lg";
}

/** Brand-colored Facebook glyph (no badge background). */
export function FacebookPlatformIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.02 10.13 11.9v-8.41H7.08v-3.5h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87v2.24h3.32l-.53 3.5h-2.79v8.42C19.61 23.09 24 18.09 24 12.07z" />
    </svg>
  );
}

/** Brand-colored Instagram glyph (no badge background). */
export function InstagramPlatformIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="#E4405F">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a4.623 4.623 0 1 0 0 9.246 4.623 4.623 0 0 0 0-9.246zm0 7.627a3.004 3.004 0 1 1 0-6.008 3.004 3.004 0 0 1 0 6.008zm5.842-9.845a1.08 1.08 0 1 1-2.16 0 1.08 1.08 0 0 1 2.16 0z" />
    </svg>
  );
}

/**
 * Official-style Facebook badge: blue circle (#1877F2) with white "f" glyph.
 * Prefer this over a plain text letter in a circle.
 */
export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M13.28 20.5v-6.9h2.32l.35-2.68h-2.67V9.2c0-.78.21-1.3 1.36-1.3h1.45V5.52c-.24-.03-1.06-.12-2.02-.12-2 0-3.37 1.22-3.37 3.47v1.93H8.1v2.68h2.25v6.94h2.93z"
      />
    </svg>
  );
}

/**
 * Official-style Instagram badge: brand gradient circle with white camera glyph.
 * Prefer this over "ig" text in a circle.
 * Uses a CSS gradient so gradient ids stay unique without a client hook.
 */
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" fill="none">
        <rect
          x="5.5"
          y="5.5"
          width="13"
          height="13"
          rx="3.5"
          stroke="#fff"
          strokeWidth="2"
        />
        <circle cx="12" cy="12" r="3.35" stroke="#fff" strokeWidth="2" />
        <circle cx="16.2" cy="7.85" r="1.2" fill="#fff" />
      </svg>
    </span>
  );
}

/** Alias for {@link FacebookIcon}. */
export const FacebookBadgeIcon = FacebookIcon;

/** Alias for {@link InstagramIcon}. */
export const InstagramBadgeIcon = InstagramIcon;

export function MetaPlatformIcons({ className, size = "xs" }: MetaPlatformIconsProps) {
  const iconClass = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-0.5", className)}
      aria-label="Facebook and Instagram"
      title="Facebook & Instagram"
    >
      <FacebookPlatformIcon className={iconClass} />
      <InstagramPlatformIcon className={iconClass} />
    </span>
  );
}

/** Paired circle badges (Facebook + Instagram), sized for milestone / platform chips. */
export function MetaPlatformBadges({ className, size = "md" }: MetaPlatformBadgesProps) {
  const iconClass =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-7 w-7" : "h-6 w-6";

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1.5", className)}
      aria-label="Facebook and Instagram"
    >
      <FacebookIcon className={iconClass} />
      <InstagramIcon className={iconClass} />
    </span>
  );
}
