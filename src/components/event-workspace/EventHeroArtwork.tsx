import { EventArtworkPreview } from "@/components/events/EventArtworkPreview";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";

interface EventHeroArtworkProps {
  artwork: HeroArtworkSelection | null;
  eventTitle: string;
  compact?: boolean;
}

export function EventHeroArtwork({
  artwork,
  eventTitle,
  compact = false,
}: EventHeroArtworkProps) {
  if (compact) {
    const imageUrl = artwork?.imageUrl;
    if (!imageUrl) return null;

    return (
      <figure className="flex shrink-0 justify-end lg:justify-center">
        <div className="flex aspect-square h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-2xl bg-[#f7f6f3] shadow-sm ring-1 ring-cos-border/60 sm:h-[136px] sm:w-[136px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`${eventTitle} artwork`}
            className="max-h-full max-w-full object-contain object-center"
          />
        </div>
      </figure>
    );
  }

  return (
    <EventArtworkPreview
      artwork={artwork}
      eventTitle={eventTitle}
      className="w-full"
      frameAspect="square"
    />
  );
}
