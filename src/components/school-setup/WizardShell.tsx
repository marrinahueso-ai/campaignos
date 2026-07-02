import { cn } from "@/lib/utils/cn";

interface WizardShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function WizardShell({
  title,
  description,
  children,
  footer,
  className,
}: WizardShellProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <div className="mb-10 space-y-3 text-center sm:mb-14">
        <p className="studio-eyebrow">School setup</p>
        <h1 className="font-display text-4xl text-cos-text sm:text-5xl">{title}</h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-cos-muted sm:text-base">
          {description}
        </p>
      </div>

      <div className={cn("cos-card flex flex-1 flex-col", className)}>
        <div className="flex-1">{children}</div>
        {footer && (
          <div className="mt-10 flex items-center justify-between border-t border-cos-border pt-8">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
