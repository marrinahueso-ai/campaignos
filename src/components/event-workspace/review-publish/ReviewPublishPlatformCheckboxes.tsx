"use client";

import {
  FacebookIcon,
  InstagramIcon,
} from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { cn } from "@/lib/utils/cn";

export type ReviewPublishPlatformId = "instagram" | "facebook";

interface ReviewPublishPlatformCheckboxesProps {
  platforms: Record<ReviewPublishPlatformId, boolean>;
  onToggle?: (id: ReviewPublishPlatformId) => void;
  disabled?: boolean;
}

const PLATFORM_CONFIG: {
  id: ReviewPublishPlatformId;
  label: string;
  Icon: typeof InstagramIcon;
}[] = [
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
