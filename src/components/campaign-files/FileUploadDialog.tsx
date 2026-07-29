"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  FileDocumentCategoryQuickEdit,
  type UploadCategoryPromptState,
} from "@/components/campaign-files/FileDocumentCategoryQuickEdit";
import { uploadCampaignFileAction } from "@/lib/campaign-files/actions";
import { CAMPAIGN_FILE_PLATFORMS } from "@/lib/campaign-files/constants";
import type { CampaignFilePlatform } from "@/types/campaign-files";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

interface FileUploadDialogProps {
  open: boolean;
  onClose: () => void;
  events: Event[];
  lockedEventId?: string;
  defaultUploaderName?: string | null;
  /** @deprecated Prefer `initialFiles` for multi-file drops. */
  initialFile?: File | null;
  initialFiles?: File[] | null;
  /** Pre-select event (e.g. current filter). */
  preferredEventId?: string | null;
}

function collectFiles(
  initialFiles: File[] | null | undefined,
  initialFile: File | null | undefined,
): File[] {
  if (initialFiles && initialFiles.length > 0) return [...initialFiles];
  if (initialFile) return [initialFile];
  return [];
}

export function FileUploadDialog({
  open,
  onClose,
  events,
  lockedEventId,
  initialFile = null,
  initialFiles = null,
  preferredEventId = null,
}: FileUploadDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [eventId, setEventId] = useState(lockedEventId ?? preferredEventId ?? "");
  const [platforms, setPlatforms] = useState<CampaignFilePlatform[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [categoryPrompt, setCategoryPrompt] = useState<UploadCategoryPromptState | null>(
    null,
  );
  const [uploadedEventId, setUploadedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedFiles(collectFiles(initialFiles, initialFile));
    setError(null);
    setProgress(null);
    setDragOver(false);
    setCategoryPrompt(null);
    setUploadedEventId(null);
    setEventId(lockedEventId ?? preferredEventId ?? "");
  }, [open, initialFile, initialFiles, lockedEventId, preferredEventId]);

  if (!open) {
    return null;
  }

  const sortedEvents = [...events].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );

  function togglePlatform(platform: CampaignFilePlatform) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((value) => value !== platform)
        : [...current, platform],
    );
  }

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const next = Array.from(list);
    if (next.length === 0) return;
    setSelectedFiles((current) => {
      const seen = new Set(current.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
      const merged = [...current];
      for (const file of next) {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(file);
        }
      }
      return merged;
    });
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    const resolvedEventId = lockedEventId ?? eventId;

    if (!resolvedEventId) {
      setError("Select an event before uploading.");
      return;
    }

    if (selectedFiles.length === 0) {
      setError("Drop or choose at least one file.");
      return;
    }

    startTransition(async () => {
      let uploaded = 0;
      let lastPrompt: UploadCategoryPromptState | null = null;
      for (const file of selectedFiles) {
        setProgress(`Uploading ${uploaded + 1} of ${selectedFiles.length}…`);
        const formData = new FormData();
        formData.set("eventId", resolvedEventId);
        formData.set("category", "auto");
        formData.set("uploadContext", "org_files");
        formData.set("platforms", platforms.join(","));
        formData.set("file", file);
        const result = await uploadCampaignFileAction(formData);
        if (!result.success) {
          setProgress(null);
          setError(
            result.error ??
              `Could not upload “${file.name}”. ${uploaded} file${uploaded === 1 ? "" : "s"} uploaded before this.`,
          );
          if (uploaded > 0) router.refresh();
          return;
        }
        uploaded += 1;
        if (result.fileId && result.fileName && result.documentCategory) {
          lastPrompt = {
            fileId: result.fileId,
            fileName: result.fileName,
            documentCategory: result.documentCategory,
          };
        }
      }

      setSelectedFiles([]);
      setPlatforms([]);
      setProgress(null);
      if (!lockedEventId) {
        setEventId(preferredEventId ?? "");
      }
      if (lastPrompt) {
        setUploadedEventId(resolvedEventId);
        setCategoryPrompt(lastPrompt);
        router.refresh();
        return;
      }
      onClose();
      router.refresh();
    });
  }

  const pillSelect =
    "w-full appearance-none rounded-full border-0 bg-[rgba(47,74,60,0.12)] px-3 py-2.5 text-xs font-bold text-[#2f4a3c] outline-none disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(42,38,34,0.28)] p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-upload-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] shadow-[0_20px_48px_rgba(42,38,34,0.16)]">
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold tracking-[0.1em] text-[#7a7166] uppercase">
              Upload
            </p>
            <h2
              id="file-upload-title"
              className="mt-1 font-display text-[1.5rem] font-semibold tracking-[-0.02em] text-[#2a2622]"
            >
              {selectedFiles.length > 1
                ? `${selectedFiles.length} files`
                : selectedFiles.length === 1
                  ? "1 file"
                  : "Add files"}
            </h2>
            <p className="mt-1 text-sm text-[#5c554c]">
              Pick the event — we&apos;ll suggest a document category from the name.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(42,38,34,0.1)] bg-white text-[#5c554c] transition hover:text-[#2a2622]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          {!lockedEventId ? (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-extrabold tracking-[0.08em] text-[#7a7166] uppercase">
                Event
              </span>
              <select
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
                className={pillSelect}
              >
                <option value="">Select an event…</option>
                {sortedEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-extrabold tracking-[0.08em] text-[#7a7166] uppercase">
              Platforms
              <span className="ml-1 font-semibold normal-case tracking-normal text-[#7a7166]">
                (optional)
              </span>
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
                      "rounded-full px-3 py-1.5 text-xs font-bold transition",
                      active
                        ? "bg-[#2a2622] text-[#f6f2eb]"
                        : "bg-[rgba(122,113,102,0.12)] text-[#5c554c] hover:text-[#2a2622]",
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
              multiple
              className="sr-only"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
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
                addFiles(event.dataTransfer.files);
              }}
              className={cn(
                "flex w-full flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed px-4 py-6 text-sm transition",
                dragOver
                  ? "border-[#6b8171] bg-[rgba(107,129,113,0.08)] text-[#2a2622]"
                  : "border-[rgba(42,38,34,0.12)] bg-white text-[#5c554c] hover:border-[#6b8171]",
              )}
            >
              <Upload className="h-5 w-5" strokeWidth={1.5} />
              {selectedFiles.length > 0 ? (
                <div className="w-full space-y-1 text-left">
                  <p className="text-center text-xs font-bold text-[#2a2622]">
                    {selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} ready
                  </p>
                  <ul className="max-h-28 overflow-y-auto px-1 text-xs font-semibold text-[#5c554c]">
                    {selectedFiles.map((file) => (
                      <li key={`${file.name}-${file.size}-${file.lastModified}`} className="truncate">
                        {file.name}
                      </li>
                    ))}
                  </ul>
                  <p className="pt-1 text-center text-[11px] font-semibold text-[#7a7166]">
                    Drop more or click to add
                  </p>
                </div>
              ) : (
                <>
                  <span className="font-semibold">Drop files here or click to choose</span>
                  <span className="text-xs">PDF, Word, Excel, PNG, or JPG · up to 25 MB each</span>
                </>
              )}
            </button>
          </div>

          {progress ? (
            <p className="text-xs font-semibold text-[#5c554c]" aria-live="polite">
              {progress}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm font-semibold text-[#a65a3a]" role="alert">
              {error}
            </p>
          ) : null}
          {categoryPrompt && uploadedEventId ? (
            <FileDocumentCategoryQuickEdit
              eventId={uploadedEventId}
              prompt={categoryPrompt}
              onDismiss={() => {
                setCategoryPrompt(null);
                onClose();
              }}
            />
          ) : null}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={pending}>
            {pending
              ? "Uploading…"
              : selectedFiles.length > 1
                ? `Upload ${selectedFiles.length} files`
                : "Upload"}
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
