"use client";

import { cn } from "@/lib/utils/cn";
import { Upload } from "lucide-react";
import { useRef } from "react";

function fieldInputClass() {
  return "w-full rounded-lg border border-cos-border bg-cos-bg px-3 py-2 text-xs text-cos-text outline-none focus:border-cos-brand-sage";
}

type Props = {
  imageUrl: string | null;
  imageLink: string;
  imageAlt: string;
  uploading?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onChangeLink: (value: string) => void;
  onChangeAlt: (value: string) => void;
};

/**
 * Every image block gets the same "Replace Image / Image Link / Alt Text"
 * trio — shared here so story, sponsor, header, and custom image blocks all
 * behave identically.
 */
export function ImageFieldEditor({
  imageUrl,
  imageLink,
  imageAlt,
  uploading = false,
  onUpload,
  onRemove,
  onChangeLink,
  onChangeAlt,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3 rounded-2xl border border-cos-border bg-cos-card p-4">
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-cos-border bg-cos-bg-alt">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg border border-cos-border py-2 text-[10px] font-bold uppercase tracking-widest text-cos-text transition hover:bg-cos-bg disabled:opacity-60",
          )}
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Replace image"}
        </button>
        {imageUrl ? (
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] font-semibold text-cos-muted hover:text-cos-text"
          >
            Remove
          </button>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <label className="text-[9px] font-bold uppercase tracking-widest text-cos-muted">
          Image link (click action)
        </label>
        <input
          className={fieldInputClass()}
          value={imageLink}
          onChange={(e) => onChangeLink(e.target.value)}
          placeholder="https://…"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[9px] font-bold uppercase tracking-widest text-cos-muted">
          Alt text
        </label>
        <input
          className={fieldInputClass()}
          value={imageAlt}
          onChange={(e) => onChangeAlt(e.target.value)}
          placeholder="Describe the image…"
        />
      </div>
    </div>
  );
}
