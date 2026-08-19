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
 * Glyphs match Meta’s official Message / Comment / Tag marks (outline, inset).
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

function InstagramSurface({
  children,
  gradient,
}: {
  children: ReactNode;
  gradient: "comments" | "camera" | "tags";
}) {
  const rawId = useId();
  const gradId = `ig-badge-${gradient}-${rawId.replace(/:/g, "")}`;
  const coords =
    gradient === "comments"
      ? { x1: "1", y1: "12", x2: "23", y2: "12" }
      : gradient === "camera"
        ? { x1: "10", y1: "1", x2: "14", y2: "23" }
        : { x1: "3", y1: "21", x2: "21", y2: "3" };
  const stops =
    gradient === "camera"
      ? (
          <>
            <stop offset="0%" stopColor="#833ab4" />
            <stop offset="32%" stopColor="#c13584" />
            <stop offset="58%" stopColor="#e1306c" />
            <stop offset="82%" stopColor="#f56040" />
            <stop offset="100%" stopColor="#fccc63" />
          </>
        )
      : (
          <>
            <stop offset="0%" stopColor="#fccc63" />
            <stop offset="28%" stopColor="#f56040" />
            <stop offset="55%" stopColor="#e1306c" />
            <stop offset="82%" stopColor="#833ab4" />
            <stop offset="100%" stopColor="#5b51d8" />
          </>
        );

  return (
    <BadgeSvg>
      <defs>
        <linearGradient
          id={gradId}
          x1={coords.x1}
          y1={coords.y1}
          x2={coords.x2}
          y2={coords.y2}
          gradientUnits="userSpaceOnUse"
        >
          {stops}
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
      <path
        fill="#fff"
        d="M14.15 22V13.15h2.95l.44-3.42h-3.39V7.72c0-.99.27-1.66 1.7-1.66h1.81V2.97c-.31-.04-1.39-.14-2.64-.14-2.61 0-4.4 1.59-4.4 4.52v2.38H7.2v3.42h3.42V22h3.53z"
      />
    </BadgeSvg>
  );
}

/** Facebook Comments: rounded-rect outline bubble, tail at bottom-right. */
function FacebookCommentBadge() {
  return (
    <BadgeSvg>
      <circle cx="12" cy="12" r="12" fill="#4A9DE8" />
      <rect
        x="5.15"
        y="5.35"
        width="13.7"
        height="10.15"
        rx="3.15"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
      />
      <path
        d="M14.05 15.35 16.85 19.05 12.2 15.55"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </BadgeSvg>
  );
}

function FacebookTagBadge() {
  return (
    <BadgeSvg>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <g
        fill="none"
        stroke="#fff"
        strokeWidth="1.45"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M7.15 8.05 12.55 5.55a1.2 1.2 0 0 1 1.55.45l3.55 6.15a1.2 1.2 0 0 1-.4 1.6L11.8 16.2a1.2 1.2 0 0 1-1.55-.45L6.7 9.6a1.2 1.2 0 0 1 .45-1.55Z" />
        <circle cx="11.55" cy="8.15" r="0.85" />
        <path d="M6.4 10.35 11.7 7.9a1.15 1.15 0 0 1 1.5.42l3.2 5.55" />
      </g>
      <path
        d="M13.05 10.55h2.35M12.65 12.2h2.55M12.25 13.85h2.15"
        fill="none"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </BadgeSvg>
  );
}

/** Instagram: official camera glyph, inset (not full-bleed). */
function InstagramCameraBadge() {
  return (
    <InstagramSurface gradient="camera">
      <rect
        x="6.35"
        y="6.35"
        width="11.3"
        height="11.3"
        rx="3.25"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="12.05"
        r="3.2"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
      />
      <circle cx="15.85" cy="8.4" r="0.95" fill="#fff" />
    </InstagramSurface>
  );
}

/** Instagram Comments: round outline bubble, tail at ~4 o’clock. */
function InstagramCommentBadge() {
  return (
    <InstagramSurface gradient="comments">
      <circle
        cx="12"
        cy="11.05"
        r="5.35"
        fill="none"
        stroke="#fff"
        strokeWidth="1.65"
      />
      <path
        d="M14.55 15.55 16.7 18.55 13.05 16.2"
        fill="none"
        stroke="#fff"
        strokeWidth="1.65"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </InstagramSurface>
  );
}

function InstagramTagBadge() {
  return (
    <InstagramSurface gradient="tags">
      <path
        d="M8.15 7.35h7.7c1.15 0 2.1.95 2.1 2.1v7.15c0 1.15-.95 2.1-2.1 2.1H8.15c-1.15 0-2.1-.95-2.1-2.1V9.45c0-1.15.95-2.1 2.1-2.1Z"
        fill="none"
        stroke="#fff"
        strokeWidth="1.55"
      />
      <path
        d="M10.55 7.35 12 5.15 13.45 7.35"
        fill="none"
        stroke="#fff"
        strokeWidth="1.55"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="12" cy="11.15" r="1.7" fill="none" stroke="#fff" strokeWidth="1.45" />
      <path
        d="M8.55 16.35c.7-1.7 1.95-2.55 3.45-2.55s2.75.85 3.45 2.55"
        fill="none"
        stroke="#fff"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
    </InstagramSurface>
  );
}
