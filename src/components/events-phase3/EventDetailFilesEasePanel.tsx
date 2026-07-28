"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  EaseSectionLabel,
} from "@/components/events-phase3/EventDetailEaseUi";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { FileMoveFolderMenu } from "@/components/campaign-files/FileMoveFolderMenu";
import { FilesFolderBar } from "@/components/campaign-files/FilesFolderBar";
import {
  deleteCampaignFileAction,
  updateCampaignFileAction,
  uploadCampaignFileAction,
} from "@/lib/campaign-files/actions";
import { filterCampaignFiles } from "@/lib/campaign-files/filters";
import { formatFileSize } from "@/lib/campaign-files/format";
import { cn } from "@/lib/utils/cn";
import type {
  CampaignFile,
  CampaignFileType,
  FilesFolderFilter,
  FilesPageData,
} from "@/types/campaign-files";

function glyphLabel(fileType: CampaignFileType): string {
  if (fileType === "pdf") return "PDF";
  if (fileType === "png" || fileType === "jpg") return "IMG";
  if (fileType === "docx" || fileType === "xlsx") return "DOC";
  return "FILE";
}

function typeWord(fileType: CampaignFileType): string {
  if (fileType === "pdf") return "PDF";
  if (fileType === "png" || fileType === "jpg") return "Image";
  if (fileType === "docx" || fileType === "xlsx") return "Doc";
  return "File";
}

function glyphClassName(fileType: CampaignFileType): string {
  if (fileType === "pdf") return "bg-[rgba(166,90,58,0.12)] text-[#a65a3a]";
  if (fileType === "png" || fileType === "jpg")
    return "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]";
  if (fileType === "docx" || fileType === "xlsx")
    return "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]";
  return "bg-[rgba(47,74,60,0.1)] text-[#2f4a3c]";
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

async function downloadFile(file: CampaignFile) {
  const response = await fetch(`/api/files/${file.id}/download`);
  if (!response.ok) return;
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? file.name;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openFile(file: CampaignFile) {
  if (file.url) {
    window.open(file.url, "_blank", "noopener,noreferrer");
    return;
  }
  window.open(`/api/files/${file.id}/download`, "_blank", "noopener,noreferrer");
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
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [folderFilter, setFolderFilter] = useState<FilesFolderFilter>("all");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [rowPendingId, setRowPendingId] = useState<string | null>(null);
  const [folderOverrides, setFolderOverrides] = useState<
    Record<string, string | null>
  >({});
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});

  const folders = data.foldersByEventId[eventId] ?? [];

  const eventFiles = useMemo(() => {
    return data.files
      .filter((file) => file.eventId === eventId)
      .map((file) => {
        let next = file;
        if (nameOverrides[file.id] !== undefined) {
          next = { ...next, name: nameOverrides[file.id]! };
        }
        if (folderOverrides[file.id] !== undefined) {
          next = { ...next, folderId: folderOverrides[file.id]! };
        }
        return next;
      });
  }, [data.files, eventId, nameOverrides, folderOverrides]);

  const visibleFiles = useMemo(
    () =>
      filterCampaignFiles(
        eventFiles,
        {
          search: "",
          folderId: folderFilter,
          eventId,
          fileType: "all",
          category: "all",
          platform: "all",
          status: "all",
          uploader: "all",
          dateStart: "",
          dateEnd: "",
        },
        new Map(),
      ),
    [eventFiles, folderFilter, eventId],
  );

  const unfiledCount = eventFiles.filter((file) => !file.folderId).length;

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

  function handleFoldersChanged() {
    void refresh();
  }

  function startRename(file: CampaignFile) {
    setRenameValue(file.name);
    setRenamingId(file.id);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  function commitRename(file: CampaignFile) {
    if (renamingId !== file.id) return;
    const next = renameValue.trim();
    if (!next || next === file.name) {
      cancelRename();
      return;
    }
    setRowPendingId(file.id);
    startTransition(async () => {
      const result = await updateCampaignFileAction(file.id, eventId, {
        name: next,
      });
      setRowPendingId(null);
      if (!result.success) {
        setError(result.error ?? "Could not rename.");
        return;
      }
      setNameOverrides((current) => ({ ...current, [file.id]: next }));
      cancelRename();
      await refresh();
    });
  }

  function handleDelete(file: CampaignFile) {
    if (!window.confirm(`Remove “${file.name}” from this campaign?`)) {
      return;
    }
    setRowPendingId(file.id);
    startTransition(async () => {
      const result = await deleteCampaignFileAction(file.id, eventId);
      setRowPendingId(null);
      if (!result.success) {
        setError(result.error ?? "Could not delete.");
        return;
      }
      await refresh();
    });
  }

  function handleMoved(fileId: string, folderId: string | null) {
    setFolderOverrides((current) => ({ ...current, [fileId]: folderId }));
    void refresh();
  }

  return (
    <section>
      <EaseSectionLabel hint="Folders and files for this campaign only">
        Campaign files
      </EaseSectionLabel>

      <FilesFolderBar
        eventId={eventId}
        foldersAvailable={data.foldersAvailable}
        folders={folders}
        activeFolder={folderFilter}
        unfiledCount={unfiledCount}
        totalFileCount={eventFiles.length}
        onFolderChange={setFolderFilter}
        onFoldersChanged={handleFoldersChanged}
      />

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
        className="mb-3.5 mt-3 w-full rounded-[18px] border-[1.5px] border-dashed border-[rgba(42,38,34,0.2)] bg-[rgba(255,252,247,0.45)] px-7 py-7 text-center text-[13px] font-semibold text-cos-muted transition hover:bg-[rgba(255,252,247,0.75)] disabled:opacity-60"
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
        <p className="text-sm text-cos-muted">No files for this campaign yet.</p>
      ) : visibleFiles.length === 0 ? (
        <p className="text-sm text-cos-muted">No files in this folder.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visibleFiles.map((file) => {
            const isRenaming = renamingId === file.id;
            const isPending = rowPendingId === file.id;

            return (
              <div
                key={file.id}
                className={cn(
                  "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-transparent bg-[rgba(255,252,247,0.7)] px-3 py-2.5 transition sm:grid-cols-[auto_1fr_auto_auto]",
                  isRenaming
                    ? "border-[rgba(47,74,60,0.28)] bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                    : "hover:border-cos-border hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)]",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold tracking-[0.03em]",
                    glyphClassName(file.fileType),
                  )}
                  aria-hidden
                >
                  {glyphLabel(file.fileType)}
                </span>
                <div className="min-w-0">
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRename(file);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelRename();
                        }
                      }}
                      onBlur={() => commitRename(file)}
                      className="mb-0.5 w-full max-w-md border-b-[1.5px] border-[#6b8171] bg-transparent text-sm font-bold text-cos-text outline-none"
                    />
                  ) : (
                    <strong className="block truncate text-sm font-semibold text-cos-text">
                      {file.name}
                    </strong>
                  )}
                  <p className="truncate text-xs text-cos-muted">
                    {formatWhen(file.uploadedAt)} ·{" "}
                    {file.uploaderName ?? "Unknown"} · {typeWord(file.fileType)}
                  </p>
                </div>
                <span className="hidden text-xs font-bold whitespace-nowrap text-cos-muted sm:inline">
                  {formatFileSize(file.sizeBytes)}
                </span>
                <div className="flex items-center gap-0.5">
                  {isRenaming ? (
                    <>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => commitRename(file)}
                        disabled={isPending}
                        className="rounded-full px-2.5 py-1.5 text-xs font-bold text-[#2f4a3c] transition hover:bg-[rgba(42,38,34,0.05)] disabled:opacity-60"
                      >
                        {isPending ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={cancelRename}
                        disabled={isPending}
                        className="rounded-full px-2.5 py-1.5 text-xs font-bold text-cos-muted transition hover:text-cos-text"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startRename(file)}
                        className="rounded-full px-2.5 py-1.5 text-xs font-bold text-cos-muted transition hover:bg-[rgba(42,38,34,0.05)] hover:text-cos-text"
                      >
                        Rename
                      </button>
                      <FileMoveFolderMenu
                        file={file}
                        folders={folders}
                        foldersAvailable={data.foldersAvailable}
                        onMoved={handleMoved}
                      />
                      <button
                        type="button"
                        onClick={() => openFile(file)}
                        className="rounded-full px-2.5 py-1.5 text-xs font-bold text-cos-muted transition hover:bg-[rgba(42,38,34,0.05)] hover:text-cos-text"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => void downloadFile(file)}
                        className="rounded-full px-2.5 py-1.5 text-xs font-bold text-cos-muted transition hover:bg-[rgba(42,38,34,0.05)] hover:text-cos-text"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(file)}
                        disabled={isPending}
                        aria-label={`Delete ${file.name}`}
                        title="Delete"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted transition hover:bg-[rgba(166,90,58,0.12)] hover:text-[#a65a3a] disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
