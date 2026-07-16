import { ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { cn } from "@/lib/utils/cn";

interface EventDetailHeroArtworkProps {
  artwork: HeroArtworkSelection | null;
  eventTitle: string;
  createWithAiHref: string;
  className?: string;
}

export function EventDetailHeroArtwork({
  artwork,
  eventTitle,
  createWithAiHref,
  className,
}: EventDetailHeroArtworkProps) {
  const showArt = hasDisplayableArtwork(artwork);

  if (showArt && artwork?.imageUrl) {
    return (
      <div
        className={cn(
          "relative h-full w-full overflow-hidden rounded-xl border border-cos-border bg-cos-card",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork.imageUrl}
          alt={`${eventTitle} artwork`}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-cos-border bg-cos-card px-4 py-6 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cos-bg">
        <ImageIcon className="h-6 w-6 text-cos-muted" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-semibold text-cos-text">No artwork yet</p>
        <p className="mt-1 text-xs text-cos-muted">
          Create artwork in Create with AI
        </p>
      </div>
      <Button href={createWithAiHref} size="sm" variant="secondary">
        <Sparkles className="h-3.5 w-3.5" />
        Open Create with AI
      </Button>
    </div>
  );
}
