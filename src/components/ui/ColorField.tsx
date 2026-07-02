"use client";

import { cn } from "@/lib/utils/cn";

interface ColorFieldProps {
  name: string;
  label: string;
  defaultValue?: string;
}

export function ColorField({
  name,
  label,
  defaultValue = "#4F46E5",
}: ColorFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-cos-text">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={name}
          name={name}
          type="color"
          defaultValue={defaultValue}
          className="h-11 w-14 cursor-pointer rounded-lg border border-cos-border bg-white p-1"
        />
        <div
          className={cn(
            "flex h-11 flex-1 items-center rounded-lg border border-cos-border bg-cos-bg px-3 text-sm text-cos-muted",
          )}
        >
          {defaultValue}
        </div>
      </div>
    </div>
  );
}
