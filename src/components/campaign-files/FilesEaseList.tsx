"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  deleteCampaignFileAction,
  updateCampaignFileAction,
} from "@/lib/campaign-files/actions";
import { FileMoveFolderMenu } from "@/components/campaign-files/FileMoveFolderMenu";
import { FilesFolderBar } from "@/components/campaign-files/FilesFolderBar";
import { filterCampaignFiles } from "@/lib/campaign-files/filters";
import { formatFileSize } from "@/lib/campaign-files/format";
import { cn } from "@/lib/utils/cn";
import type {
  CampaignFile,
  CampaignFileFolder,
  CampaignFileType,
  FilesFolderFilter,
} from "@/types/campaign-files";

export interface FilesEaseEventGroup {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventHref: string;
  accentColor: string;
  files: CampaignFile[];
  folders: CampaignFileFolder[];
  foldersAvailable: boolean;
}

interface FilesEaseListProps {
  eventGroups: FilesEaseEventGroup[];
  onRenamed: (fileId: string, name: string) => void;
  onDeleted: (fileId: string) => void;
  onMoved: (fileId: string, folderId: string | null) => void;
  onFoldersChanged: () => void;
  emptyTitle: string;
  emptyBody: string;
}

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

function formatFileWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function countUnfiled(files: CampaignFile[]): number {
  return files.filter((file) => !file.folderId).length;
}

export function FilesEaseList({
  eventGroups,
  onRenamed,
  onDeleted,
  onMoved,
  onFoldersChanged,
  emptyTitle,
  emptyBody,
}: FilesEaseListProps) {
  const [, startTransition] = useTransition();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{
    fileId: string;
    message: string;
  } | null>(null);
  const [folderFilters, setFolderFilters] = useState<
    Record<string, FilesFolderFilter>
  >({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  function folderFilterFor(eventId: string): FilesFolderFilter {
    return folderFilters[eventId] ?? "all";
  }

  function setFolderFilter(eventId: string, folderId: FilesFolderFilter) {
    setFolderFilters((current) => ({ ...current, [eventId]: folderId }));
  }

  function startRename(file: CampaignFile) {
    setRowError(null);
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
    setPendingId(file.id);
    startTransition(async () => {
      const result = await updateCampaignFileAction(file.id, file.eventId, {
        name: next,
      });
      setPendingId(null);
      if (!result.success) {
        setRowError({
          fileId: file.id,
          message: result.error ?? "Could not rename.",
        });
        return;
      }
      setRowError(null);
      onRenamed(file.id, next);
      cancelRename();
    });
  }

  function handleDelete(file: CampaignFile) {
    if (!window.confirm(`Remove “${file.name}” from your organization’s library?`)) {
      return;
    }
    setRowError(null);
    setPendingId(file.id);
    startTransition(async () => {
      const result = await deleteCampaignFileAction(file.id, file.eventId);
      setPendingId(null);
      if (!result.success) {
        setRowError({
          fileId: file.id,
          message: result.error ?? "Could not delete.",
        });
        return;
      }
      onDeleted(file.id);
    });
  }

  if (eventGroups.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-cos-border bg-[rgba(255,252,247,0.55)] px-6 py-12 text-center">
        <strong className="mb-2 block font-display text-[22px] font-semibold text-cos-text">
          {emptyTitle}
        </strong>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-cos-muted">
          {emptyBody}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {eventGroups.map((group) => {
        const activeFolder = folderFilterFor(group.eventId);
        const visibleFiles = filterCampaignFiles(
          group.files,
          {
            search: "",
            folderId: activeFolder,
            eventId: group.eventId,
            fileType: "all",
            category: "all",
            platform: "all",
            status: "all",
            uploader: "all",
            dateStart: "",
            dateEnd: "",
          },
          new Map([[group.eventId, group.eventTitle]]),
        );

        return (
          <article
            key={group.eventId}
            className="flex flex-col gap-2 rounded-[22px] border border-cos-border bg-cos-card p-4 shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
            style={{ borderLeft: `4px solid ${group.accentColor}` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex min-w-0 flex-1 flex-wrap items-center gap-2 font-display text-lg font-semibold text-cos-text">
                <Link
                  href={group.eventHref}
                  className="truncate transition-colors hover:underline"
                >
                  {group.eventTitle}
                </Link>
                <span
                  className="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] text-cos-text uppercase"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${group.accentColor} 14%, transparent)`,
                  }}
                >
                  {group.files.length} {group.files.length === 1 ? "file" : "files"}
                </span>
              </h3>
              <Link
                href={group.eventHref}
                className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold text-cos-muted transition hover:text-cos-text"
              >
                Open campaign files →
              </Link>
            </div>

            <FilesFolderBar
              eventId={group.eventId}
              foldersAvailable={group.foldersAvailable}
              folders={group.folders}
              activeFolder={activeFolder}
              unfiledCount={countUnfiled(group.files)}
              totalFileCount={group.files.length}
              onFolderChange={(folderId) => setFolderFilter(group.eventId, folderId)}
              onFoldersChanged={onFoldersChanged}
              compact
            />

            {visibleFiles.length === 0 ? (
              <p className="px-1 py-2 text-sm text-cos-muted">
                No files in this folder for this campaign.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {visibleFiles.map((file) => {
                  const isRenaming = renamingId === file.id;
                  const isPending = pendingId === file.id;

                  return (
                    <div key={file.id}>
                      <div
                        className={cn(
                          "grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-2xl border border-transparent bg-[rgba(255,252,247,0.7)] px-3 py-2.5 transition",
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
                              ref={inputRef}
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
                            {formatFileWhen(file.uploadedAt)} ·{" "}
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
                                folders={group.folders}
                                foldersAvailable={group.foldersAvailable}
                                onMoved={onMoved}
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
                      {rowError?.fileId === file.id ? (
                        <p className="px-3 pt-1 text-xs text-[#a65a3a]" role="alert">
                          {rowError.message}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
