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
}

export function FileUpload({
  name,
  label,
  hint,
  accept,
  onChange,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setFileName(file?.name ?? null);
    onChange?.(file);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-cos-text">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-cos-border bg-cos-bg px-6 py-8 text-center transition-colors hover:border-cos-border hover:bg-cos-accent-soft/40",
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
          <Upload className="h-5 w-5 text-cos-accent" />
        </div>
        <p className="mt-4 text-sm font-medium text-cos-text">
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
