"use client";

import { useState, useTransition } from "react";
import { updateCampaignFileAction } from "@/lib/campaign-files/actions";
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_CATEGORY_VALUES,
} from "@/lib/campaign-files/document-category";
import { cn } from "@/lib/utils/cn";
import type { DocumentCategory } from "@/types/campaign-files";

export interface UploadCategoryPromptState {
  fileId: string;
  fileName: string;
  documentCategory: DocumentCategory;
}

export function FileDocumentCategoryQuickEdit({
  eventId,
  prompt,
  onDismiss,
  onUpdated,
  className,
}: {
  eventId: string;
  prompt: UploadCategoryPromptState;
  onDismiss: () => void;
  onUpdated?: (category: DocumentCategory) => void;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState(prompt.documentCategory);
  const [error, setError] = useState<string | null>(null);

  function save(next: DocumentCategory) {
    setCategory(next);
    setError(null);
    startTransition(async () => {
      const result = await updateCampaignFileAction(fileId, eventId, {
        documentCategory: next,
        name: prompt.fileName,
      });
      if (!result.success) {
        setError(result.error ?? "Could not update category.");
        return;
      }
      onUpdated?.(next);
      onDismiss();
    });
  }

  const { fileId } = prompt;

  return (
    <div
      className={cn(
        "rounded-[18px] border border-[rgba(47,74,60,0.18)] bg-[rgba(255,252,247,0.92)] px-4 py-3 shadow-[0_8px_28px_rgba(28,36,48,0.06)]",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <p className="truncate text-sm font-semibold text-cos-text">{prompt.fileName}</p>
      <p className="mt-0.5 text-xs font-semibold text-cos-muted">
        Suggested category — change if needed
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`file-category-${fileId}`}>
          Document category
        </label>
        <select
          id={`file-category-${fileId}`}
          value={category}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value as DocumentCategory;
            save(next);
          }}
          className="min-w-[12rem] max-w-full flex-1 appearance-none rounded-full border-0 bg-[rgba(47,74,60,0.1)] px-3 py-2 text-xs font-bold text-[#2f4a3c] outline-none disabled:opacity-60"
        >
          {DOCUMENT_CATEGORY_VALUES.map((value) => (
            <option key={value} value={value}>
              {DOCUMENT_CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={onDismiss}
          className="rounded-full px-3 py-2 text-xs font-bold text-cos-muted transition hover:bg-[rgba(42,38,34,0.05)] hover:text-cos-text disabled:opacity-60"
        >
          {pending ? "Saving…" : "Looks good"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs font-semibold text-[#a65a3a]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
