import {
  FacebookPlatformIcon,
  InstagramPlatformIcon,
} from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { channelLabel } from "@/lib/ai/content";
import type { CommunicationChannel } from "@/types/event-workspace";
import { Globe, Mail, Megaphone, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CommunicationChannelIconProps {
  channel: CommunicationChannel;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
} as const;

export function CommunicationChannelIcon({
  channel,
  size = "sm",
  className,
}: CommunicationChannelIconProps) {
  const iconClass = cn(SIZE_CLASSES[size], className);
  const label = channelLabel(channel);

  if (channel === "instagram") {
    return (
      <span className="inline-flex shrink-0" aria-label={label} title={label}>
        <InstagramPlatformIcon className={iconClass} />
      </span>
    );
  }

  if (channel === "facebook") {
    return (
      <span className="inline-flex shrink-0" aria-label={label} title={label}>
        <FacebookPlatformIcon className={iconClass} />
      </span>
    );
  }

  if (channel === "website_announcement") {
    return (
      <span className="inline-flex shrink-0 text-cos-muted" aria-label={label} title={label}>
        <Globe className={iconClass} strokeWidth={1.5} />
      </span>
    );
  }

  if (channel === "email" || channel === "newsletter") {
    return (
      <span className="inline-flex shrink-0 text-cos-muted" aria-label={label} title={label}>
        <Mail className={iconClass} strokeWidth={1.5} />
      </span>
    );
  }

  if (channel === "morning_announcements" || channel === "principal_notes") {
    return (
      <span className="inline-flex shrink-0 text-cos-muted" aria-label={label} title={label}>
        <Megaphone className={iconClass} strokeWidth={1.5} />
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 text-cos-muted" aria-label={label} title={label}>
      <Newspaper className={iconClass} strokeWidth={1.5} />
    </span>
  );
}
