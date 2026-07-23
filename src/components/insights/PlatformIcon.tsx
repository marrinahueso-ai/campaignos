import {
  FacebookIcon,
  InstagramIcon,
} from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { cn } from "@/lib/utils/cn";

interface PlatformIconProps {
  platform: "facebook" | "instagram";
  className?: string;
}

export function PlatformIcon({ platform, className }: PlatformIconProps) {
  const Icon = platform === "instagram" ? InstagramIcon : FacebookIcon;

  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 shrink-0 [&_svg]:h-full [&_svg]:w-full",
        className,
      )}
      aria-label={platform}
    >
      <Icon className="h-full w-full" />
    </span>
  );
}
