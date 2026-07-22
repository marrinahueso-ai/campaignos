import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const LOGO_FULL = "/hey-ralli-logo.png";
const LOGO_MARK = "/hey-ralli-logo-circle.png";
const LOGO_ALT = "Hey Ralli";

/** Trimmed horizontal lockup (speech bubble + Ralli wordmark). */
const FULL_WIDTH = 535;
const FULL_HEIGHT = 227;

/** Circular mark (Hey bubble on cream). */
const MARK_WIDTH = 1024;
const MARK_HEIGHT = 1024;

interface BrandLogoProps {
  href?: string | null;
  /** Horizontal lockup or compact mark for narrow spaces (collapsed sidebar). */
  variant?: "full" | "mark";
  /** Visual size preset for the visible logo area. */
  size?: "sm" | "md" | "lg" | "nav" | "sidebar";
  className?: string;
  imageClassName?: string;
  onClick?: () => void;
}

const FULL_FRAME = {
  sm: "h-8",
  md: "h-11 sm:h-12",
  lg: "h-12 sm:h-14",
  nav: "h-10 sm:h-12",
  sidebar: "h-14 max-h-14 w-auto max-w-[12rem]",
} as const;

/** Match displayed CSS size so next/image does not request a 1920w asset. */
const FULL_SIZES = {
  sm: "120px",
  md: "180px",
  lg: "220px",
  nav: "160px",
  sidebar: "192px",
} as const;

const MARK_FRAME = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
} as const;

const MARK_SIZES = {
  sm: "32px",
  md: "40px",
} as const;

export function BrandLogo({
  href = "/",
  variant = "full",
  size = "md",
  className,
  imageClassName,
  onClick,
}: BrandLogoProps) {
  const isFull = variant === "full";
  const markSize =
    size === "lg" || size === "nav" || size === "sidebar" ? "md" : size;
  const frameClass = isFull ? FULL_FRAME[size] : MARK_FRAME[markSize];
  const isPriority = size === "nav" || size === "lg";

  const image = isFull ? (
    <span className={cn("relative inline-flex shrink-0 items-center", frameClass)}>
      <Image
        src={LOGO_FULL}
        alt={LOGO_ALT}
        width={FULL_WIDTH}
        height={FULL_HEIGHT}
        sizes={FULL_SIZES[size]}
        quality={75}
        className={cn("h-full w-auto", imageClassName)}
        priority={isPriority}
        fetchPriority={isPriority ? "high" : "auto"}
      />
    </span>
  ) : (
    <span
      className={cn("relative inline-block shrink-0 overflow-hidden rounded-full", frameClass)}
    >
      <Image
        src={LOGO_MARK}
        alt={LOGO_ALT}
        width={MARK_WIDTH}
        height={MARK_HEIGHT}
        sizes={MARK_SIZES[markSize]}
        quality={75}
        className={cn("h-full w-full object-cover", imageClassName)}
      />
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn("inline-flex shrink-0 items-center", className)}
        onClick={onClick}
      >
        {image}
      </Link>
    );
  }

  return <div className={cn("inline-flex shrink-0 items-center", className)}>{image}</div>;
}
