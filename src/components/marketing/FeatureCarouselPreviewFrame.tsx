import { cn } from "@/lib/utils/cn";

/** Shared half-page framing for carousel previews — centered, contained, not edge-to-edge. */
export const FEATURE_CAROUSEL_PREVIEW_MAX_HEIGHT = "max-h-[560px]";

interface FeatureCarouselPreviewFrameProps {
  children: React.ReactNode;
  className?: string;
}

export function FeatureCarouselPreviewFrame({
  children,
  className,
}: FeatureCarouselPreviewFrameProps) {
  return (
    <div className={cn("flex justify-center px-4 py-3 sm:px-8 sm:py-4", className)}>
      <div
        className={cn(
          "relative w-full max-w-4xl overflow-hidden rounded-sm border border-cos-border/50 bg-cos-bg/50 shadow-sm",
          FEATURE_CAROUSEL_PREVIEW_MAX_HEIGHT,
        )}
      >
        {children}
      </div>
    </div>
  );
}
