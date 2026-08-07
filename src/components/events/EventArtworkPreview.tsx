import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import { AppImage } from "@/components/images/AppImage";
import { cn } from "@/lib/utils/cn";

interface EventArtworkPreviewProps {
  artwork: HeroArtworkSelection | null;
  eventTitle: string;
  className?: string;
  /** Compact thumbnail for lists (56–72px) */
  variant?: "cover" | "thumbnail" | "card";
  /** Optional caption below the preview (e.g. "Artwork ready") */
  caption?: string | null;
  /** Frame aspect ratio for cover/default variants */
  frameAspect?: "four-three" | "square";
  /** Prefer for above-the-fold LCP images (e.g. dashboard Next up card). */
  priority?: boolean;
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

interface ArtworkImageFrameProps {
  artwork: HeroArtworkSelection;
  eventTitle: string;
  frameClassName?: string;
  tightFrame?: boolean;
  priority?: boolean;
}

function ArtworkImageFrame({
  artwork,
  eventTitle,
  frameClassName,
  tightFrame = false,
  priority = false,
}: ArtworkImageFrameProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        tightFrame ? "p-1" : "p-2.5",
        frameClassName,
      )}
    >
      <AppImage
        src={artwork.imageUrl!}
        alt={`${eventTitle} artwork`}
        width={680}
        height={680}
        preset="hero"
        displayWidth={800}
        resize="contain"
        sizes="(max-width: 1024px) 90vw, 340px"
        priority={priority}
        className={cn(
          "block object-contain object-center",
          tightFrame ? "max-h-[95%] max-w-[95%]" : "max-h-full max-w-full",
        )}
      />
    </div>
  );
}

export function EventArtworkPreview({
  artwork,
  eventTitle,
  className,
  variant = "cover",
  caption = null,
  frameAspect = "four-three",
  priority = false,
}: EventArtworkPreviewProps) {
  if (!hasDisplayableArtwork(artwork)) {
    return null;
  }

  const hasImage = Boolean(artwork.imageUrl);

  if (variant === "thumbnail") {
    return (
      <div
        className={cn(
          "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f7f6f3] shadow-sm shadow-slate-200/60",
          className,
        )}
      >
        {hasImage ? (
          <AppImage
            src={artwork.imageUrl!}
            alt=""
            width={128}
            height={128}
            preset="thumb"
            displayWidth={128}
            displayHeight={128}
            resize="contain"
            sizes="64px"
            className="max-h-full max-w-full object-contain object-center"
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${getPlaceholderGradient(eventTitle)}`}
            aria-hidden
          />
        )}
      </div>
    );
  }

  const isCard = variant === "card";
  const isCover = variant === "cover";
  const aspectClassName =
    frameAspect === "square" ? "aspect-square" : "aspect-[4/3]";

  if (isCard && hasImage) {
    return (
      <figure
        className={cn(
          "flex w-full flex-col items-end justify-center",
          className,
        )}
      >
        <AppImage
          src={artwork.imageUrl!}
          alt={`${eventTitle} artwork`}
          width={560}
          height={560}
          preset="card"
          displayWidth={560}
          resize="contain"
          sizes="(max-width: 1024px) 90vw, 280px"
          priority={priority}
          className="block h-auto max-h-[192px] w-[90%] max-w-[280px] rounded-[22px] object-contain object-center shadow-sm shadow-slate-200/35"
        />
        {caption && (
          <figcaption className="mt-1.5 w-[90%] max-w-[280px] text-right text-xs text-cos-muted">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure
      className={cn(
        !isCard && "overflow-hidden bg-[#f7f6f3]",
        isCover &&
          "w-full overflow-hidden bg-[#f7f6f3] rounded-3xl shadow-sm shadow-slate-200/60 ring-1 ring-slate-900/[0.05] lg:max-w-[min(100%,340px)] lg:justify-self-end",
        !isCard &&
          !isCover &&
          "rounded-2xl shadow-md shadow-slate-200/40",
        className,
      )}
    >
      {hasImage ? (
        <ArtworkImageFrame
          artwork={artwork}
          eventTitle={eventTitle}
          tightFrame={false}
          priority={priority}
          frameClassName={cn(
            isCover &&
              `${aspectClassName} w-full max-h-[200px] sm:max-h-[228px] lg:max-h-[252px]`,
            !isCard && !isCover && aspectClassName,
          )}
        />
      ) : (
        <div
          className={cn(
            "overflow-hidden",
            isCover &&
              `${aspectClassName} w-full max-h-[200px] sm:max-h-[228px] lg:max-h-[252px]`,
            !isCard && !isCover && aspectClassName,
          )}
        >
          <div
            className={`h-full w-full bg-gradient-to-br ${getPlaceholderGradient(eventTitle)}`}
            aria-hidden
          />
        </div>
      )}
      {caption && !isCard && (
        <figcaption className="pt-2 text-center text-xs text-cos-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
