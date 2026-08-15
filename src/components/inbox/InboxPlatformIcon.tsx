"use client";

import type { InboxChannelType } from "@/lib/inbox/types";
import { INBOX_CHANNEL_SHORT_LABELS } from "@/lib/inbox/constants";
import { cn } from "@/lib/utils/cn";

/**
 * Raster channel badges under public/communications-hub/channel-badges/.
 * Mentions assets are on disk for a future channel; only live channels are mapped.
 */
const CHANNEL_BADGE_SRC: Partial<Record<InboxChannelType, string>> = {
  facebook_message: "/communications-hub/channel-badges/facebook_message.png",
  facebook_comment: "/communications-hub/channel-badges/facebook_comment.png",
  facebook_tag: "/communications-hub/channel-badges/facebook_tag.png",
  instagram_dm: "/communications-hub/channel-badges/instagram_dm.png",
  instagram_comment: "/communications-hub/channel-badges/instagram_comment.png",
  instagram_tag: "/communications-hub/channel-badges/instagram_tag.png",
};

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

/**
 * Small circular interaction badge for queue avatars / headers.
 * Uses supplied brand PNGs clipped to a circle (no square chrome).
 */
export function InboxPlatformIcon({
  channelType,
  size = "sm",
  className,
}: InboxPlatformIconProps) {
  const src = CHANNEL_BADGE_SRC[channelType];
  const label = INBOX_CHANNEL_SHORT_LABELS[channelType];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <span
      className={cn("inline-flex shrink-0 leading-none", className)}
      aria-label={label}
      title={label}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- static public badge assets
        <img
          src={src}
          alt=""
          aria-hidden
          className={cn(
            "block rounded-full bg-white object-cover object-center",
            sizeClass,
          )}
          draggable={false}
        />
      ) : (
        <span
          className={cn(
            "inline-block rounded-full bg-cos-bg ring-1 ring-cos-border",
            sizeClass,
          )}
          aria-hidden
        />
      )}
    </span>
  );
}
