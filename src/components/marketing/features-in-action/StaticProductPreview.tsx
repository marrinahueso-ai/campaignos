import Image from "next/image";

interface StaticProductPreviewProps {
  src: string;
  alt: string;
  label?: string;
}

/**
 * Polished static product frame for Features stories that do not yet have a Motion demo.
 */
export function StaticProductPreview({
  src,
  alt,
  label = "Product preview",
}: StaticProductPreviewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-sm">
      <div className="flex items-center justify-between border-b border-cos-border px-3 py-2.5 sm:px-4">
        <p className="text-[10px] font-medium tracking-[0.14em] text-cos-muted uppercase sm:text-xs">
          {label}
        </p>
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-cos-border" />
          <span className="h-2 w-2 rounded-full bg-cos-border" />
          <span className="h-2 w-2 rounded-full bg-cos-accent-soft" />
        </div>
      </div>
      <div className="relative aspect-[16/10] w-full bg-cos-bg">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 560px"
          className="object-cover object-top"
        />
      </div>
    </div>
  );
}
