import { cn } from "@/lib/utils/cn";
import { fileTypeLabel } from "@/lib/campaign-files/constants";
import type { CampaignFileType } from "@/types/campaign-files";

const TYPE_STYLES: Record<CampaignFileType, string> = {
  pdf: "bg-red-50 text-red-700 ring-red-200/80",
  docx: "bg-blue-50 text-blue-700 ring-blue-200/80",
  xlsx: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  png: "bg-orange-50 text-orange-700 ring-orange-200/80",
  jpg: "bg-orange-50 text-orange-700 ring-orange-200/80",
  other: "bg-cos-info text-cos-info-text ring-cos-border/60",
};

interface FileTypeBadgeProps {
  fileType: CampaignFileType;
  className?: string;
}

export function FileTypeBadge({ fileType, className }: FileTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset",
        TYPE_STYLES[fileType],
        className,
      )}
    >
      {fileTypeLabel(fileType)}
    </span>
  );
}
