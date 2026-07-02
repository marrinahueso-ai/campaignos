import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface StudioPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  align?: "left" | "center";
  className?: string;
}

export function StudioPageHeader({
  eyebrow = "Configure",
  title,
  description,
  backHref,
  backLabel = "Back to Settings",
  align = "left",
  className,
}: StudioPageHeaderProps) {
  const centered = align === "center";

  return (
    <header
      className={cn(
        "space-y-4 border-b border-cos-border pb-8",
        centered && "text-center",
        className,
      )}
    >
      {backHref && (
        <Link
          href={backHref}
          className={cn(
            "inline-flex text-xs font-medium tracking-wide text-cos-muted transition-colors hover:text-cos-text",
            centered && "justify-center",
          )}
        >
          ← {backLabel}
        </Link>
      )}
      {eyebrow && (
        <p className={cn("studio-eyebrow", centered && "mx-auto")}>{eyebrow}</p>
      )}
      <h1
        className={cn(
          "font-display text-4xl text-cos-text sm:text-5xl",
          centered && "mx-auto",
        )}
      >
        {title}
      </h1>
      {description && (
        <p
          className={cn(
            "max-w-2xl text-sm leading-relaxed text-cos-muted sm:text-base",
            centered ? "mx-auto" : undefined,
          )}
        >
          {description}
        </p>
      )}
    </header>
  );
}
