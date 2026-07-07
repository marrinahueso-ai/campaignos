"use client";

import { cn } from "@/lib/utils/cn";

export type ReviewPublishPlatformId = "instagram" | "facebook";

interface ReviewPublishPlatformCheckboxesProps {
  platforms: Record<ReviewPublishPlatformId, boolean>;
  onToggle?: (id: ReviewPublishPlatformId) => void;
  disabled?: boolean;
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="review-ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#review-ig-grad)" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="white" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#1877F2" />
      <path
        d="M15.5 8.5h-2c-.8 0-1 .4-1 1v1.5h3l-.4 3H12.5V20h-3v-6.5H8v-3h1.5V9.5c0-2.2 1.3-3.5 3.4-3.5H15.5v2.5z"
        fill="white"
      />
    </svg>
  );
}

const PLATFORM_CONFIG: { id: ReviewPublishPlatformId; label: string; Icon: typeof InstagramIcon }[] =
  [
    { id: "instagram", label: "Instagram", Icon: InstagramIcon },
    { id: "facebook", label: "Facebook", Icon: FacebookIcon },
  ];

export function ReviewPublishPlatformCheckboxes({
  platforms,
  onToggle,
  disabled = false,
}: ReviewPublishPlatformCheckboxesProps) {
  return (
    <ul className="flex flex-wrap items-center gap-4">
      {PLATFORM_CONFIG.map(({ id, label, Icon }) => {
        const checked = platforms[id];
        return (
          <li key={id}>
            <label
              className={cn(
                "inline-flex items-center gap-2",
                disabled || !onToggle ? "cursor-default opacity-80" : "cursor-pointer",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled || !onToggle}
                onChange={() => onToggle?.(id)}
                className="sr-only"
              />
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-sm border transition-colors",
                  checked
                    ? "border-cos-success bg-cos-success text-white"
                    : "border-cos-border bg-cos-card",
                )}
                aria-hidden
              >
                {checked && (
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <Icon className="h-4 w-4" />
              <span className="text-sm text-cos-text">{label}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
