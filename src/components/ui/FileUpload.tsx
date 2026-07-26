"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface FileUploadProps {
  name: string;
  label: string;
  hint?: string;
  accept?: string;
  onChange?: (file: File | null) => void;
  variant?: "default" | "ease";
}

export function FileUpload({
  name,
  label,
  hint,
  accept,
  onChange,
  variant = "default",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const ease = variant === "ease";

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setFileName(file?.name ?? null);
    onChange?.(file);
  }

  return (
    <div className="space-y-2">
      <label
        className={cn(
          "block text-cos-text",
          ease
            ? "text-[13px] font-bold"
            : "text-sm font-medium",
        )}
      >
        {label}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center text-center transition-colors",
          ease
            ? "rounded-[18px] border border-dashed border-cos-border bg-[rgba(246,242,235,0.85)] px-6 py-10 hover:border-[#2f4a3c]/35 hover:bg-[rgba(255,252,247,0.95)]"
            : "rounded-xl border border-dashed border-cos-border bg-cos-bg px-6 py-8 hover:border-cos-border hover:bg-cos-accent-soft/40",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full",
            ease
              ? "h-12 w-12 bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)] ring-1 ring-cos-border"
              : "h-11 w-11 bg-white shadow-sm",
          )}
        >
          <Upload
            className={cn(
              ease ? "h-5 w-5 text-[#2f4a3c]" : "h-5 w-5 text-cos-accent",
            )}
          />
        </div>
        <p
          className={cn(
            "mt-4 text-cos-text",
            ease ? "text-[13px] font-bold" : "text-sm font-medium",
          )}
        >
          {fileName ?? "Click to upload"}
        </p>
        <p className="mt-1 text-xs text-cos-muted">
          {hint ?? "PNG, JPG, or SVG recommended"}
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
