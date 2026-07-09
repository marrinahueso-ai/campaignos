import { cn } from "@/lib/utils/cn";

interface SettingsV2CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}

export function SettingsV2Card({
  title,
  description,
  children,
  className,
  actions,
  footer,
}: SettingsV2CardProps) {
  return (
    <section className={cn("cos-card flex flex-col", className)}>
      {(title || description || actions) && (
        <div className="mb-4 flex flex-col gap-3 border-b border-cos-border pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? (
              <h2 className="font-display text-xl text-cos-text sm:text-2xl">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-cos-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
        </div>
      )}
      <div className="flex-1">{children}</div>
      {footer ? (
        <div className="mt-4 border-t border-cos-border pt-4">{footer}</div>
      ) : null}
    </section>
  );
}
