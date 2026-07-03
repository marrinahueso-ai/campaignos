import { EventArtworkPreview } from "@/components/events/EventArtworkPreview";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";

const SQUARE_SIZE_CLASSES = {
  compact: "h-[120px] w-[120px] sm:h-[136px] sm:w-[136px]",
  hub: "h-[176px] w-[176px] sm:h-[192px] sm:w-[192px] lg:h-[208px] lg:w-[208px]",
} as const;

interface EventHeroArtworkProps {
  artwork: HeroArtworkSelection | null;
  eventTitle: string;
  size?: "compact" | "hub";
}

export function EventHeroArtwork({
  artwork,
  eventTitle,
  size,
}: EventHeroArtworkProps) {
  if (size) {
    const imageUrl = artwork?.imageUrl;
    if (!imageUrl) return null;

    return (
      <figure className="flex shrink-0 self-center justify-end lg:justify-center">
        <div
          className={`aspect-square overflow-hidden rounded-2xl bg-[#f7f6f3] shadow-sm ring-1 ring-cos-border/60 ${SQUARE_SIZE_CLASSES[size]}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`${eventTitle} artwork`}
            className="h-full w-full object-cover object-center"
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
