"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { uploadCampaignFileAction } from "@/lib/campaign-files/actions";
import {
  CAMPAIGN_FILE_CATEGORIES,
  CAMPAIGN_FILE_PLATFORMS,
} from "@/lib/campaign-files/constants";
import type { CampaignFileCategory, CampaignFilePlatform } from "@/types/campaign-files";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

interface FileUploadDialogProps {
  open: boolean;
  onClose: () => void;
  events: Event[];
  lockedEventId?: string;
  defaultUploaderName?: string | null;
  initialFile?: File | null;
}

export function FileUploadDialog({
  open,
  onClose,
  events,
  lockedEventId,
  initialFile = null,
}: FileUploadDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [eventId, setEventId] = useState(lockedEventId ?? "");
  const [category, setCategory] = useState<CampaignFileCategory>("other");
  const [platforms, setPlatforms] = useState<CampaignFilePlatform[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedFile(initialFile);
    setError(null);
    setDragOver(false);
  }, [open, initialFile]);

  if (!open) {
    return null;
  }

  function togglePlatform(platform: CampaignFilePlatform) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((value) => value !== platform)
        : [...current, platform],
    );
  }

  function handleSubmit() {
    setError(null);
    const resolvedEventId = lockedEventId ?? eventId;

    if (!resolvedEventId) {
      setError("Select an event before uploading.");
      return;
    }

    if (!selectedFile) {
      setError("Choose a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.set("eventId", resolvedEventId);
    formData.set("category", category);
    formData.set("platforms", platforms.join(","));
    formData.set("file", selectedFile);

    startTransition(async () => {
      const result = await uploadCampaignFileAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setSelectedFile(null);
      setPlatforms([]);
      setCategory("other");
      if (!lockedEventId) {
        setEventId("");
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-upload-title"
    >
      <div className="w-full max-w-lg border border-cos-border bg-cos-card shadow-lg">
        <div className="flex items-center justify-between border-b border-cos-border px-5 py-4">
          <h2 id="file-upload-title" className="font-display text-xl text-cos-text">
            Upload file
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-cos-muted hover:text-cos-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {!lockedEventId && (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium tracking-wide text-cos-muted uppercase">
                Event <span className="text-cos-error">*</span>
              </span>
              <select
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
                className="w-full border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text"
              >
                <option value="">Select an event…</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-medium tracking-wide text-cos-muted uppercase">
              Category
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as CampaignFileCategory)}
              className="w-full border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text"
            >
              {CAMPAIGN_FILE_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium tracking-wide text-cos-muted uppercase">
              Platforms
            </legend>
            <div className="flex flex-wrap gap-2">
              {CAMPAIGN_FILE_PLATFORMS.map((option) => {
                const active = platforms.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => togglePlatform(option.value)}
                    className={cn(
                      "border px-2.5 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
                        : "border-cos-border bg-cos-bg text-cos-muted hover:text-cos-text",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setError(null);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDragOver(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = "copy";
                setDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDragOver(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDragOver(false);
                const file = event.dataTransfer.files?.[0] ?? null;
                if (file) {
                  setSelectedFile(file);
                  setError(null);
                }
              }}
              className={cn(
                "flex w-full flex-col items-center gap-2 border border-dashed bg-cos-bg/60 px-4 py-8 text-sm transition-colors",
                dragOver
                  ? "border-cos-accent bg-cos-bg text-cos-text"
                  : "border-cos-border text-cos-muted hover:border-cos-accent hover:text-cos-text",
              )}
            >
              <Upload className="h-6 w-6" strokeWidth={1.5} />
              {selectedFile ? (
                <span className="font-medium text-cos-text">{selectedFile.name}</span>
              ) : (
                <>
                  <span>Drag & drop or click to choose a file</span>
                  <span className="text-xs">PDF, Word, Excel, PNG, or JPG up to 25 MB</span>
                </>
              )}
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-cos-border px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending}>
            {pending ? "Uploading…" : "Upload file"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface FileUploadButtonProps {
  onClick: () => void;
  className?: string;
}

export function FileUploadButton({ onClick, className }: FileUploadButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 bg-cos-primary px-4 py-2.5 text-sm font-medium text-[#f6f2eb] transition-colors hover:bg-cos-primary-hover",
        className,
      )}
    >
      <Upload className="h-4 w-4" strokeWidth={1.5} />
      Upload file
    </button>
  );
}
