import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import { cn } from "@/lib/utils/cn";

interface CampaignThumbnailProps {
  artwork: HeroArtworkSelection | null;
  title: string;
  className?: string;
  size?: "sm" | "md";
}

function getPlaceholderGradient(title: string): string {
  const palette = [
    "from-[#e8efe9] via-[#f5f1ea] to-[#ebe6df]",
    "from-[#eef2f0] via-[#f7f3ed] to-[#e9e3da]",
    "from-[#edf0eb] via-[#f6f2ea] to-[#e7ece8]",
  ];
  const index =
    title.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0) %
    palette.length;
  return palette[index];
}

export function CampaignThumbnail({
  artwork,
  title,
  className,
  size = "md",
}: CampaignThumbnailProps) {
  const dimension = size === "sm" ? "h-10 w-10" : "h-14 w-14";

  if (hasDisplayableArtwork(artwork) && artwork.imageUrl) {
    return (
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded bg-[#f7f6f3] ring-1 ring-cos-border/60",
          dimension,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artwork.imageUrl} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded bg-gradient-to-br text-xs font-semibold text-cos-muted ring-1 ring-cos-border/60",
        dimension,
        getPlaceholderGradient(title),
        className,
      )}
      aria-hidden
    >
      {title.slice(0, 1).toUpperCase()}
    </span>
  );
}
