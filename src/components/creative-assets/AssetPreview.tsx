import { FileText, ImageIcon } from "lucide-react";
import { isPdfAsset, resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { cn } from "@/lib/utils/cn";

interface AssetPreviewProps {
  filename: string | null;
  storagePath: string | null;
  alt: string;
  className?: string;
  aspectClassName?: string;
}

export function AssetPreview({
  filename,
  storagePath,
  alt,
  className,
  aspectClassName = "aspect-[4/3]",
}: AssetPreviewProps) {
  const previewUrl = resolveAssetImageUrl(storagePath);
  const isPdf = isPdfAsset(filename, storagePath);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-[#f7f6f3]",
        aspectClassName,
        className,
      )}
    >
      {previewUrl && !isPdf ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={alt} className="max-h-full max-w-full object-contain" />
      ) : isPdf ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-cos-muted">
          <FileText className="h-10 w-10 stroke-[1.25]" />
          <span className="text-xs font-medium">PDF document</span>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-cos-muted">
          <ImageIcon className="h-10 w-10 stroke-[1.25]" />
          <span className="text-xs font-medium">No preview</span>
        </div>
      )}
    </div>
  );
}

export function getAssetDownloadUrl(storagePath: string | null): string | null {
  return resolveAssetImageUrl(storagePath);
}

export function formatAssetTimestamp(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
