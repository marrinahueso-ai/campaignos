"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import {
  FileDocumentCategoryQuickEdit,
  type UploadCategoryPromptState,
} from "@/components/campaign-files/FileDocumentCategoryQuickEdit";
import { uploadCampaignFileAction } from "@/lib/campaign-files/actions";
import type { FileUploadContext } from "@/types/campaign-files";
import { cn } from "@/lib/utils/cn";

export function EventContextFileUpload({
  eventId,
  uploadContext = "general",
  disabled = false,
  onUploaded,
  className,
}: {
  eventId: string;
  uploadContext?: FileUploadContext;
  disabled?: boolean;
  onUploaded?: () => void | Promise<void>;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categoryPrompt, setCategoryPrompt] = useState<UploadCategoryPromptState | null>(
    null,
  );

  function upload(file: File) {
    startTransition(async () => {
      setError(null);
      const formData = new FormData();
      formData.set("eventId", eventId);
      formData.set("category", "auto");
      formData.set("uploadContext", uploadContext);
      formData.set("file", file);
      const result = await uploadCampaignFileAction(formData);
      if (!result.success) {
        setError(result.error ?? "Unable to upload.");
        return;
      }
      if (result.fileId && result.fileName && result.documentCategory) {
        setCategoryPrompt({
          fileId: result.fileId,
          fileName: result.fileName,
          documentCategory: result.documentCategory,
        });
      }
      await onUploaded?.();
    });
  }

  return (
    <div className={cn("relative space-y-2", className)}>
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-full border border-cos-border bg-cos-card px-3 py-1.5 text-xs font-bold text-cos-muted transition hover:text-cos-text disabled:opacity-60"
      >
        <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
        {pending ? "Saving…" : "Add file"}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
          event.target.value = "";
        }}
      />
      {categoryPrompt ? (
        <FileDocumentCategoryQuickEdit
          eventId={eventId}
          prompt={categoryPrompt}
          onDismiss={() => setCategoryPrompt(null)}
        />
      ) : null}
      {error ? (
        <p className="text-xs font-semibold text-[#a65a3a]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
