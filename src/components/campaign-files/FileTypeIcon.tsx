import {
  FileSpreadsheet,
  FileText,
  FileType,
  Image as ImageIcon,
} from "lucide-react";
import type { CampaignFileType } from "@/types/campaign-files";
import { cn } from "@/lib/utils/cn";

interface FileTypeIconProps {
  fileType: CampaignFileType;
  className?: string;
}

export function FileTypeIcon({ fileType, className }: FileTypeIconProps) {
  const iconClass = cn("h-4 w-4 shrink-0", className);

  if (fileType === "pdf") {
    return <FileText className={cn(iconClass, "text-red-600")} strokeWidth={1.5} />;
  }

  if (fileType === "docx") {
    return <FileType className={cn(iconClass, "text-blue-600")} strokeWidth={1.5} />;
  }

  if (fileType === "xlsx") {
    return (
      <FileSpreadsheet className={cn(iconClass, "text-emerald-600")} strokeWidth={1.5} />
    );
  }

  if (fileType === "png" || fileType === "jpg") {
    return <ImageIcon className={cn(iconClass, "text-orange-600")} strokeWidth={1.5} />;
  }

  return <FileText className={cn(iconClass, "text-cos-muted")} strokeWidth={1.5} />;
}
