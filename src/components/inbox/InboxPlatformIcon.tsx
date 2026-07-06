import {
  FacebookPlatformIcon,
  InstagramPlatformIcon,
} from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { getInboxPlatform } from "@/lib/inbox/constants";
import type { InboxChannelType } from "@/lib/inbox/types";
import { cn } from "@/lib/utils/cn";

interface InboxPlatformIconProps {
  channelType: InboxChannelType;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
} as const;

const PLATFORM_LABELS = {
  instagram: "Instagram",
  facebook: "Facebook",
} as const;

export function InboxPlatformIcon({
  channelType,
  size = "sm",
  className,
}: InboxPlatformIconProps) {
  const platform = getInboxPlatform(channelType);
  const iconClass = cn(SIZE_CLASSES[size], className);
  const label = PLATFORM_LABELS[platform];

  return (
    <span className="inline-flex shrink-0" aria-label={label} title={label}>
      {platform === "instagram" ? (
        <InstagramPlatformIcon className={iconClass} />
      ) : (
        <FacebookPlatformIcon className={iconClass} />
      )}
    </span>
  );
}
