import { cn } from "@/lib/utils/cn";
import { type LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-10 text-center",
        className,
      )}
    >
      <div className="border border-cos-border bg-cos-bg p-3">
        <Icon className="h-6 w-6 text-cos-accent" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="font-display mt-4 text-lg text-cos-text">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-cos-muted">{description}</p>
      {action ? (
        action.onClick ? (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-5 text-xs tracking-[0.14em] text-cos-text uppercase transition-colors hover:text-cos-muted"
          >
            {action.label}
          </button>
        ) : action.href ? (
          <Link
            href={action.href}
            className="mt-5 text-xs tracking-[0.14em] text-cos-text uppercase transition-colors hover:text-cos-muted"
          >
            {action.label}
          </Link>
        ) : null
      ) : null}
    </div>
  );
}
