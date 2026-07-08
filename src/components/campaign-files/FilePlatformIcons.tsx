import {
  FacebookPlatformIcon,
  InstagramPlatformIcon,
} from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { platformLabel } from "@/lib/campaign-files/constants";
import type { CampaignFilePlatform } from "@/types/campaign-files";
import { Globe, Mail } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FilePlatformIconsProps {
  platforms: CampaignFilePlatform[];
  className?: string;
}

export function FilePlatformIcons({ platforms, className }: FilePlatformIconsProps) {
  if (platforms.length === 0) {
    return <span className="text-sm text-cos-muted">—</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {platforms.map((platform) => {
        const label = platformLabel(platform);

        if (platform === "facebook") {
          return (
            <span key={platform} title={label} aria-label={label}>
              <FacebookPlatformIcon className="h-4 w-4" />
            </span>
          );
        }

        if (platform === "instagram") {
          return (
            <span key={platform} title={label} aria-label={label}>
              <InstagramPlatformIcon className="h-4 w-4" />
            </span>
          );
        }

        if (platform === "linkedin") {
          return (
            <span key={platform} title={label} aria-label={label} className="text-cos-muted">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.56V9h3.554v11.452z" />
              </svg>
            </span>
          );
        }

        if (platform === "website") {
          return (
            <span key={platform} title={label} aria-label={label} className="text-cos-muted">
              <Globe className="h-4 w-4" strokeWidth={1.5} />
            </span>
          );
        }

        return (
          <span key={platform} title={label} aria-label={label} className="text-cos-muted">
            <Mail className="h-4 w-4" strokeWidth={1.5} />
          </span>
        );
      })}
    </span>
  );
}
