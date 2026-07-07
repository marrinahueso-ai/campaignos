import { cn } from "@/lib/utils/cn";

/** Mockup-exact Planning Hub design tokens */
export const PH = {
  pageBg: "#FAF7F2",
  cardBg: "#FFFFFF",
  cardBorder: "#E8E4DF",
  textPrimary: "#2A2622",
  textSecondary: "#7A7268",
  textMuted: "#A89F94",
  iconMuted: "#C4BAB0",
  orange: "#E8512C",
  orangeHover: "#C94524",
  peachBadge: "#F5DDD0",
  peachBadgeText: "#8B5A42",
  beigeButton: "#F6F2EB",
  beigeButtonHover: "#EBE4D9",
  greenScheduled: "#E4F2E8",
  greenScheduledText: "#3D7A4A",
  greenDot: "#5A9E6F",
  purpleNew: "#ECE4F5",
  purpleNewText: "#6B4FA8",
  purpleAccent: "#8B6FBF",
  purpleCardBg: "#FAF7FC",
  progressRing: "#B8956F",
  progressTrack: "#E8E4DF",
  overdue: "#B86B55",
  today: "#5B8FC7",
  upcoming: "#5A9E6F",
} as const;

export function PlanningHubPage({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("space-y-5 rounded-[12px] p-1 sm:p-0", className)}
      style={{ backgroundColor: PH.pageBg }}
    >
      {children}
    </div>
  );
}

export function PlanningHubCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("rounded-[12px] border bg-white shadow-[0_1px_2px_rgba(42,38,34,0.04)]", className)}
      style={{ borderColor: PH.cardBorder, backgroundColor: PH.cardBg }}
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
          <Icon className="h-4 w-4 text-[#A89F94]" strokeWidth={1.5} />
        )}
        <h3 className="text-sm font-semibold" style={{ color: PH.textPrimary }}>
          {title}
        </h3>
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
  variant = "orange",
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "orange" | "purple";
}) {
  const color = variant === "purple" ? PH.purpleNewText : PH.orange;
  const hoverColor = variant === "purple" ? "#553D8A" : PH.orangeHover;

  const classes = cn(
    "inline-flex items-center gap-1 text-xs font-semibold transition-colors",
    className,
  );

  const style = { color } as React.CSSProperties;

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        style={style}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = hoverColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = color;
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={classes}
      style={style}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = hoverColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = color;
      }}
    >
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
    <div className="flex items-center justify-between gap-2">
      <p
        className="text-[10px] font-semibold tracking-[0.14em] uppercase"
        style={{ color: PH.textMuted }}
      >
        {label}
      </p>
      <Icon className="h-4 w-4 text-[#C4BAB0]" strokeWidth={1.5} />
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
