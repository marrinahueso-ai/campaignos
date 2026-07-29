"use client";

import type { CampaignFileTypeGroup } from "@/lib/campaign-files/type-groups";
import { FILE_TYPE_GROUP_OPTIONS } from "@/lib/campaign-files/type-groups";
import { cn } from "@/lib/utils/cn";

export function FilesTypeGroupPills({
  value,
  onChange,
  className,
}: {
  value: CampaignFileTypeGroup;
  onChange: (next: CampaignFileTypeGroup) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("inline-flex flex-wrap gap-1", className)}
      role="group"
      aria-label="File type"
    >
      {FILE_TYPE_GROUP_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-full px-3.5 py-[7px] text-[13px] font-bold transition",
            value === option.id
              ? "border border-cos-border bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
              : "border border-transparent text-cos-muted hover:text-cos-text",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
