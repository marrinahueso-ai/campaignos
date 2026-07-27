import { cn } from "@/lib/utils/cn";

interface OnboardingEaseStepMeterProps {
  /** 1-based step index in the shortened 3-step plan */
  step: 1 | 2 | 3;
  className?: string;
}

/**
 * Single thin progress indicator for first-time setup Ease screens.
 * Do not combine with the legacy Event→Calendar→Brand→Team→Meta stepper.
 */
export function OnboardingEaseStepMeter({
  step,
  className,
}: OnboardingEaseStepMeterProps) {
  const percent = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div
      className={cn(
        "mb-[18px] flex max-w-[520px] items-center justify-between gap-4",
        className,
      )}
      aria-label="Setup progress"
    >
      <div
        className="h-[3px] flex-1 overflow-hidden rounded-full bg-[rgba(42,38,34,0.08)]"
        aria-hidden
      >
        <i
          className="block h-full origin-left rounded-full bg-gradient-to-r from-[#2f4a3c] to-[#2a7a86]"
          style={{
            width: `${percent}%`,
            animation: "settings-ease-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        />
      </div>
      <div className="whitespace-nowrap text-xs font-bold tabular-nums text-[#7a7166]">
        <em className="not-italic text-[#2f4a3c]">{step}</em> of 3
      </div>
    </div>
  );
}
