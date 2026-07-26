"use client";

import { useRef, useState, useTransition } from "react";
import {
  EaseSectionLabel,
} from "@/components/events-phase3/EventDetailEaseUi";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { uploadCampaignFileAction } from "@/lib/campaign-files/actions";
import type { CampaignFile, FilesPageData } from "@/types/campaign-files";

function fileGlyph(file: CampaignFile): string {
  if (file.fileType === "pdf") return "📄";
  if (file.fileType === "png" || file.fileType === "jpg") return "🖼️";
  if (file.fileType === "docx" || file.fileType === "xlsx") return "📋";
  return "📎";
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function typeLabel(file: CampaignFile): string {
  if (file.fileType === "pdf") return "PDF";
  if (file.fileType === "png" || file.fileType === "jpg") return "Image";
  if (file.fileType === "docx") return "Doc";
  if (file.fileType === "xlsx") return "Sheet";
  return "File";
}

export function EventDetailFilesEasePanel({
  eventId,
  data,
}: {
  eventId: string;
  data: FilesPageData;
}) {
  const refresh = useEventTabMutationRefresh("files");
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const eventFiles = data.files.filter((file) => file.eventId === eventId);

  const upload = (file: File) => {
    startTransition(async () => {
      setError(null);
      const formData = new FormData();
      formData.set("eventId", eventId);
      formData.set("category", "other");
      formData.set("file", file);
      const result = await uploadCampaignFileAction(formData);
      if (!result.success) {
        setError(result.error ?? "Unable to upload.");
        return;
      }
      await refresh();
    });
  };

  return (
    <section>
      <EaseSectionLabel hint="Scoped to this event only">
        Event files
      </EaseSectionLabel>

      <button
        type="button"
        disabled={pending || !data.tablesAvailable}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        className="mb-3.5 w-full rounded-[18px] border-[1.5px] border-dashed border-[rgba(42,38,34,0.2)] bg-[rgba(255,252,247,0.45)] px-7 py-7 text-center text-[13px] font-semibold text-cos-muted transition hover:bg-[rgba(255,252,247,0.75)] disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Drag files here or click to upload"}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />

      {error ? (
        <p className="mb-3 text-sm text-[#a65a3a]">{error}</p>
      ) : null}

      {eventFiles.length === 0 ? (
        <p className="text-sm text-cos-muted">No files for this event yet.</p>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {eventFiles.map((file) => {
            const inner = (
              <>
                <span className="text-[22px]" aria-hidden>
                  {fileGlyph(file)}
                </span>
                <strong className="mt-2 mb-1 block text-[13px] text-cos-text">
                  {file.name}
                </strong>
                <span className="text-xs text-cos-muted">
                  {typeLabel(file)} · {formatWhen(file.uploadedAt)}
                </span>
              </>
            );
            const className =
              "min-h-[110px] rounded-2xl border border-dashed border-[rgba(42,38,34,0.18)] bg-[rgba(255,252,247,0.65)] p-4 text-left";
            if (file.url) {
              return (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${className} transition hover:border-cos-border hover:bg-cos-card`}
                >
                  {inner}
                </a>
              );
            }
            return (
              <div key={file.id} className={className}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
