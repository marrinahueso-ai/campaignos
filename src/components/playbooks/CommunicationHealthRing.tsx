import { cn } from "@/lib/utils/cn";

interface CommunicationHealthRingProps {
  percent: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: { ring: "h-12 w-12", text: "text-xs", label: "text-[10px]" },
  md: { ring: "h-16 w-16", text: "text-sm", label: "text-xs" },
  lg: { ring: "h-24 w-24", text: "text-xl", label: "text-sm" },
};

export function CommunicationHealthRing({
  percent,
  size = "md",
  showLabel = true,
  className,
}: CommunicationHealthRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const styles = sizeStyles[size];
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className={cn("relative", styles.ring)}>
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-cos-border"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-cos-success transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-semibold text-cos-text", styles.text)}>
            {clamped}%
          </span>
        </div>
      </div>
      {showLabel && (
        <span className={cn("font-medium text-cos-muted", styles.label)}>
          Progress
        </span>
      )}
    </div>
  );
}
