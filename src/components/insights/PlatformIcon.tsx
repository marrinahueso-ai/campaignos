import { cn } from "@/lib/utils/cn";

interface PlatformIconProps {
  platform: "facebook" | "instagram";
  className?: string;
}

export function PlatformIcon({ platform, className }: PlatformIconProps) {
  const label = platform === "instagram" ? "IG" : "FB";

  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full border border-cos-border bg-cos-bg text-[10px] font-semibold tracking-wide text-cos-muted",
        className,
      )}
      aria-label={platform}
    >
      {label}
    </span>
  );
}
