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
      <div className={cn("min-w-0 w-full", className)}>
        <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-xl border border-cos-border bg-cos-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artwork.imageUrl}
            alt={`${eventTitle} artwork`}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 w-full", className)}>
      <div className="flex aspect-square w-full max-w-[200px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cos-border bg-cos-card px-3 py-4 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cos-bg">
          <ImageIcon className="h-4 w-4 text-cos-muted" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-xs font-semibold text-cos-text">No artwork yet</p>
          <p className="mt-0.5 text-[11px] text-cos-muted">
            Create in Create with AI
          </p>
        </div>
        <Button href={createWithAiHref} size="sm" variant="secondary">
          <Sparkles className="h-3.5 w-3.5" />
          Open Create with AI
        </Button>
      </div>
    </div>
  );
}
