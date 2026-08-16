"use client";

import { useId, type ReactNode } from "react";
import type { InboxChannelType } from "@/lib/inbox/types";
import { INBOX_CHANNEL_SHORT_LABELS } from "@/lib/inbox/constants";
import { cn } from "@/lib/utils/cn";

interface InboxPlatformIconProps {
  channelType: InboxChannelType;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
} as const;

/**
 * Circular channel badge for queue avatars / headers.
 * Glyphs are drawn large in the circle (almost no inner padding).
 */
export function InboxPlatformIcon({
  channelType,
  size = "sm",
  className,
}: InboxPlatformIconProps) {
  const label = INBOX_CHANNEL_SHORT_LABELS[channelType];

  return (
    <span
      className={cn(
        "block shrink-0 overflow-hidden rounded-full leading-none",
        SIZE_CLASSES[size],
        className,
      )}
      aria-label={label}
      title={label}
    >
      <ChannelBadge channelType={channelType} />
    </span>
  );
}

function ChannelBadge({ channelType }: { channelType: InboxChannelType }) {
  switch (channelType) {
    case "facebook_message":
      return <FacebookMessageBadge />;
    case "facebook_comment":
      return <FacebookCommentBadge />;
    case "facebook_tag":
      return <FacebookTagBadge />;
    case "instagram_dm":
      return <InstagramCameraBadge />;
    case "instagram_comment":
      return <InstagramCommentBadge />;
    case "instagram_tag":
      return <InstagramTagBadge />;
    default:
      return (
        <svg viewBox="0 0 24 24" className="block size-full" aria-hidden>
          <circle cx="12" cy="12" r="12" className="fill-cos-bg" />
        </svg>
      );
  }
}

function BadgeSvg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="block size-full" aria-hidden>
      {children}
    </svg>
  );
}

function InstagramSurface({ children }: { children: ReactNode }) {
  const rawId = useId();
  const gradId = `ig-badge-${rawId.replace(/:/g, "")}`;

  return (
    <BadgeSvg>
      <defs>
        <linearGradient
          id={gradId}
          x1="3"
          y1="21"
          x2="21"
          y2="3"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fccc63" />
          <stop offset="28%" stopColor="#f56040" />
          <stop offset="55%" stopColor="#e1306c" />
          <stop offset="78%" stopColor="#833ab4" />
          <stop offset="100%" stopColor="#405de6" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill={`url(#${gradId})`} />
      {children}
    </BadgeSvg>
  );
}

function FacebookMessageBadge() {
  return (
    <BadgeSvg>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      {/* Official-style f, scaled to the bottom edge with little side gap */}
      <path
        fill="#fff"
        d="M14.15 22V13.15h2.95l.44-3.42h-3.39V7.72c0-.99.27-1.66 1.7-1.66h1.81V2.97c-.31-.04-1.39-.14-2.64-.14-2.61 0-4.4 1.59-4.4 4.52v2.38H7.2v3.42h3.42V22h3.53z"
      />
    </BadgeSvg>
  );
}

function FacebookCommentBadge() {
  return (
    <BadgeSvg>
      <circle cx="12" cy="12" r="12" fill="#4A9DE8" />
      <SpeechBubble />
    </BadgeSvg>
  );
}

function FacebookTagBadge() {
  return (
    <BadgeSvg>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <PriceTags />
    </BadgeSvg>
  );
}

function InstagramCameraBadge() {
  return (
    <InstagramSurface>
      <rect
        x="2.6"
        y="2.6"
        width="18.8"
        height="18.8"
        rx="5.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.85"
      />
      <circle
        cx="12"
        cy="12.2"
        r="4.85"
        fill="none"
        stroke="#fff"
        strokeWidth="1.85"
      />
      <circle cx="17.35" cy="6.65" r="1.25" fill="#fff" />
    </InstagramSurface>
  );
}

function InstagramCommentBadge() {
  return (
    <InstagramSurface>
      <SpeechBubble />
    </InstagramSurface>
  );
}

function InstagramTagBadge() {
  return (
    <InstagramSurface>
      <rect
        x="3.6"
        y="5.1"
        width="16.8"
        height="14.4"
        rx="3.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
      />
      <path
        d="M12 5.1 13.35 3.2h-2.7L12 5.1Z"
        fill="#fff"
      />
      <circle cx="12" cy="10.15" r="2.15" fill="none" stroke="#fff" strokeWidth="1.55" />
      <path
        d="M7.7 16.35c.85-2.05 2.35-3.1 4.3-3.1s3.45 1.05 4.3 3.1"
        fill="none"
        stroke="#fff"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
    </InstagramSurface>
  );
}

function SpeechBubble() {
  return (
    <path
      d="M3.35 5.85h17.3c1.2 0 2.15.95 2.15 2.15v7.4c0 1.2-.95 2.15-2.15 2.15h-6.9L7.4 22.15v-4.6H3.35c-1.2 0-2.15-.95-2.15-2.15V8c0-1.2.95-2.15 2.15-2.15Z"
      fill="#fff"
    />
  );
}

function PriceTags() {
  return (
    <g fill="#fff">
      <path d="M8.05 5.4h5.1l5.55 5.55c.55.55.55 1.45 0 2L14.5 16.7a1.4 1.4 0 0 1-2 0L6.95 11.15V6.8c0-.77.63-1.4 1.4-1.4Zm4.05 4.35a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" />
      <path
        d="M6.4 8.55v4.05l5.15 5.15c.3.3.7.45 1.1.45"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </g>
  );
}
