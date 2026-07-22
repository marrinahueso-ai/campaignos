import { cn } from "@/lib/utils/cn";

const STEPS = [
  { id: "event", label: "Event" },
  { id: "calendar", label: "Calendar" },
  { id: "brand", label: "Brand" },
  { id: "invite", label: "Team" },
  { id: "meta", label: "Meta" },
] as const;

interface OnboardingProgressProps {
  current: "event" | "calendar" | "brand" | "invite" | "meta";
  className?: string;
}

export function OnboardingProgress({
  current,
  className,
}: OnboardingProgressProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-2 text-xs text-cos-muted",
        className,
      )}
      aria-label="Onboarding progress"
    >
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-2">
            {index > 0 ? <span className="text-cos-border">·</span> : null}
            <span
              className={cn(
                active && "font-medium text-cos-text",
                done && "text-emerald-800",
              )}
            >
              {index + 1}. {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
