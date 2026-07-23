import {
  FacebookPlatformIcon,
  InstagramPlatformIcon,
} from "@/components/communications-planning-calendar/MetaPlatformIcons";
import {
  InstagramDmPlatformIcon,
  MessengerPlatformIcon,
} from "@/components/inbox/InboxChannelPlatformIcons";
import { INBOX_CHANNEL_SHORT_LABELS } from "@/lib/inbox/constants";
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

function ChannelGlyph({
  channelType,
  iconClass,
}: {
  channelType: InboxChannelType;
  iconClass: string;
}) {
  switch (channelType) {
    case "facebook_message":
      return <MessengerPlatformIcon className={iconClass} />;
    case "instagram_dm":
      return <InstagramDmPlatformIcon className={iconClass} />;
    case "instagram_comment":
    case "instagram_tag":
      return <InstagramPlatformIcon className={iconClass} />;
    case "facebook_comment":
    case "facebook_tag":
      return <FacebookPlatformIcon className={iconClass} />;
  }
}

export function InboxPlatformIcon({
  channelType,
  size = "sm",
  className,
}: InboxPlatformIconProps) {
  const iconClass = cn(SIZE_CLASSES[size], className);
  const label = INBOX_CHANNEL_SHORT_LABELS[channelType];

  return (
    <span className="inline-flex shrink-0" aria-label={label} title={label}>
      <ChannelGlyph channelType={channelType} iconClass={iconClass} />
    </span>
  );
}
