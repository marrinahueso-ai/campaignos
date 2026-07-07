import { cn } from "@/lib/utils/cn";

/** Icon tint and status accent colors — surfaces use cos-* Tailwind classes */
export const PH = {
  iconTints: {
    coral: { bg: "#fce8e4", color: "#e87461" },
    green: { bg: "#eef2ec", color: "#5f735f" },
    blue: { bg: "#e4eef8", color: "#4a7fb5" },
    orange: { bg: "#f8ece0", color: "#c87d3a" },
    purple: { bg: "#ece4f5", color: "#8b6fbf" },
  },
} as const;

export function PlanningHubPage({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-4 rounded-[12px] bg-cos-bg pt-0", className)}>
      {children}
    </div>
  );
}

export function PlanningHubCard({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-cos-border bg-cos-card shadow-[0_1px_2px_rgba(42,38,34,0.04)]",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export function PlanningHubSectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon className="h-4 w-4 text-cos-dark-muted" strokeWidth={1.5} />
        )}
        <h3 className="text-sm font-semibold text-cos-text">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export function PlanningHubActionLink({
  href,
  onClick,
  children,
  className,
  variant = "accent",
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "accent" | "muted";
}) {
  const classes = cn(
    "inline-flex items-center gap-1 text-xs font-semibold transition-colors",
    variant === "muted"
      ? "text-cos-muted hover:text-cos-text"
      : "text-cos-accent hover:text-cos-text",
    className,
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

export function PlanningHubKpiLabel({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <div className="flex w-full items-center justify-center gap-1.5">
      <Icon className="h-4 w-4 shrink-0 text-cos-dark-muted" strokeWidth={1.5} />
      <p className="text-[11px] font-semibold tracking-[0.14em] text-cos-dark-muted uppercase">
        {label}
      </p>
    </div>
  );
}

export function PlanningHubIconSquare({
  icon: Icon,
  bg,
  color,
  className,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  bg: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        className,
      )}
      style={{ backgroundColor: bg, color }}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}
