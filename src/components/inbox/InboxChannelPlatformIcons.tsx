"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Messenger DM badge: clean blue circle with white lightning bolt.
 * No speech-bubble tail / white corner chrome — perfect circle only.
 * Used for `facebook_message` channel threads.
 */
export function MessengerPlatformIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn("block overflow-hidden rounded-full", className)}
      viewBox="0 0 24 24"
    >
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
 * Instagram DM badge: round white circle with gradient paper-plane.
 * Used for `instagram_dm` channel threads.
 */
export function InstagramDmPlatformIcon({ className }: { className?: string }) {
  const rawId = useId();
  const gradId = `ig-dm-plane-${rawId.replace(/:/g, "")}`;

  return (
    <svg
      aria-hidden
      className={cn("block overflow-hidden rounded-full", className)}
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
      <circle cx="12" cy="12" r="12" fill="#fff" />
      {/* Paper-plane outline (Meta IG Direct style), inset for round badge */}
      <path
        d="M19.6 5.1 5.85 10.85c-.44.18-.42.79.02.94l3.9 1.32c.16.05.29.18.34.34l1.36 3.96c.16.46.78.52 1.02.09L19.65 6.05c.28-.5-.24-1.04-.76-.95Z"
        stroke={`url(#${gradId})`}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11.15 12.95 19 6.05"
        stroke={`url(#${gradId})`}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
