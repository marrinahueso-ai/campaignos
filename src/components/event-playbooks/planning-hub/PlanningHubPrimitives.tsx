import { cn } from "@/lib/utils/cn";

export function PlanningHubCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-[#e8e0d4] bg-[#fffcf7] shadow-[0_1px_2px_rgba(42,38,34,0.04)]",
        className,
      )}
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
          <Icon className="h-4 w-4 text-[#a89f94]" strokeWidth={1.5} />
        )}
        <h3 className="text-sm font-semibold text-[#2a2622]">{title}</h3>
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
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = cn(
    "inline-flex items-center gap-1 text-xs font-semibold text-[#d97706] transition-colors hover:text-[#b45309]",
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
    <div className="flex items-center justify-between gap-2">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a89f94] uppercase">
        {label}
      </p>
      <Icon className="h-4 w-4 text-[#c4bab0]" strokeWidth={1.5} />
    </div>
  );
}
