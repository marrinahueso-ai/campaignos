import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const LOGO_FULL = "/hey-ralli-logo.png";
const LOGO_MARK = "/hey-ralli-logo-circle.png";
const LOGO_ALT = "Hey Ralli — ORGANIZE. CREATE. CONNECT.";

/** Trimmed horizontal lockup (905×350). */
const FULL_WIDTH = 905;
const FULL_HEIGHT = 350;

/** Trimmed circular mark (911×922). */
const MARK_WIDTH = 911;
const MARK_HEIGHT = 922;

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

const MARK_FRAME = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
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

  const image = isFull ? (
    <span className={cn("relative inline-flex shrink-0 items-center", frameClass)}>
      <Image
        src={LOGO_FULL}
        alt={LOGO_ALT}
        width={FULL_WIDTH}
        height={FULL_HEIGHT}
        className={cn("h-full w-auto", imageClassName)}
        priority={size !== "sm"}
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
