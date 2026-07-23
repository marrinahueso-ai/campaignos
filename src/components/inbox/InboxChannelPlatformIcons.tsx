"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Messenger DM badge: blue circle with white lightning bolt.
 * Used for `facebook_message` channel threads.
 */
export function MessengerPlatformIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" fill="#0084FF" />
      {/* Lightning bolt: upper-left → lower-right */}
      <path
        fill="#fff"
        d="M13.85 5.2 7.4 13.05h3.55L9.55 18.8l6.9-8.4h-3.7z"
      />
    </svg>
  );
}

/**
 * Instagram DM badge: gradient paper-plane outline.
 * Used for `instagram_dm` channel threads.
 */
export function InstagramDmPlatformIcon({ className }: { className?: string }) {
  const rawId = useId();
  const gradId = `ig-dm-plane-${rawId.replace(/:/g, "")}`;

  return (
    <svg
      aria-hidden
      className={cn("shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="2"
          y1="20"
          x2="22"
          y2="4"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fccc63" />
          <stop offset="30%" stopColor="#f56040" />
          <stop offset="55%" stopColor="#e1306c" />
          <stop offset="80%" stopColor="#833ab4" />
          <stop offset="100%" stopColor="#405de6" />
        </linearGradient>
      </defs>
      {/* Paper-plane outline (Meta IG Direct style) */}
      <path
        d="M20.85 3.35 3.55 10.55c-.55.23-.53.99.03 1.18l4.85 1.65c.2.07.36.23.43.43l1.7 4.95c.2.58.98.65 1.28.11L20.9 4.55c.35-.62-.3-1.3-.95-1.2Z"
        stroke={`url(#${gradId})`}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10.35 13.05 20.15 4.15"
        stroke={`url(#${gradId})`}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
