"use client";

import {
  FacebookIcon,
  InstagramIcon,
} from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { cn } from "@/lib/utils/cn";

interface PlatformConfig {
  id: "instagram" | "facebook" | "linkedin";
  label: string;
  checked: boolean;
  disabled?: boolean;
}

interface CaptionsPublishPlatformsProps {
  platforms?: PlatformConfig[];
  onTogglePlatform?: (id: PlatformConfig["id"]) => void;
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#0A66C2" />
      <path
        d="M7.5 10v7H5v-7h2.5zM6.25 8.5c-.8 0-1.25-.55-1.25-1.25S5.45 6 6.25 6s1.25.55 1.25 1.25S7.05 8.5 6.25 8.5zM19 17h-2.5v-3.4c0-.85-.3-1.45-1.1-1.45-.6 0-.95.4-1.1.8-.05.15-.1.35-.1.55V17H12v-7h2.5v1c.35-.55.95-1.2 2.3-1.2 1.7 0 2.7 1.1 2.7 3.1V17z"
        fill="white"
      />
    </svg>
  );
}

const PLATFORM_ICONS = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  linkedin: LinkedInIcon,
} as const;

const DEFAULT_PLATFORMS: PlatformConfig[] = [
  { id: "instagram", label: "Instagram", checked: true },
  { id: "facebook", label: "Facebook", checked: true },
  { id: "linkedin", label: "LinkedIn", checked: false, disabled: true },
];

export function CaptionsPublishPlatforms({
  platforms = DEFAULT_PLATFORMS,
  onTogglePlatform,
}: CaptionsPublishPlatformsProps) {
  return (
    <section className="flex flex-col gap-4 border-t border-cos-border bg-cos-bg/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-cos-text">Publish platforms</h2>
        <p className="mt-0.5 text-sm text-cos-muted">
          Captions will be used for the selected platforms.
        </p>
      </div>

      <ul className="flex flex-wrap items-center gap-5 sm:justify-end">
        {platforms.map((platform) => {
          const Icon = PLATFORM_ICONS[platform.id];
          return (
            <li key={platform.id}>
              <label
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2.5",
                  platform.disabled && "cursor-not-allowed opacity-70",
                )}
              >
                <input
                  type="checkbox"
                  checked={platform.checked}
                  disabled={platform.disabled}
                  onChange={() => onTogglePlatform?.(platform.id)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-sm border transition-colors",
                    platform.checked
                      ? "border-cos-success bg-cos-success text-white"
                      : "border-cos-border bg-cos-card",
                  )}
                  aria-hidden
                >
                  {platform.checked && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
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
                <Icon className="h-5 w-5" />
                <span className="text-sm text-cos-text">{platform.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
