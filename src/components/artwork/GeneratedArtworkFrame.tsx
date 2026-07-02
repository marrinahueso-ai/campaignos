"use client";

import { cn } from "@/lib/utils/cn";

interface GeneratedArtworkFrameProps {
  src?: string | null;
  alt: string;
  onClick?: () => void;
  className?: string;
  placeholder?: React.ReactNode;
}

export function GeneratedArtworkFrame({
  src,
  alt,
  onClick,
  className,
  placeholder,
}: GeneratedArtworkFrameProps) {
  const content = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="block max-h-full max-w-full object-contain object-center"
    />
  ) : (
    placeholder
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`View ${alt} full size`}
        className={cn(
          "flex items-center justify-center overflow-hidden bg-[#f7f6f3] p-2",
          "cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cos-primary/40",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-[#f7f6f3] p-2",
        className,
      )}
    >
      {content}
    </div>
  );
}
