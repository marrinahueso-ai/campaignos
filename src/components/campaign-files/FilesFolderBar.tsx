"use client";

import {
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  createFileFolderAction,
  deleteFileFolderAction,
  renameFileFolderAction,
  reorderFileFoldersAction,
} from "@/lib/campaign-files/folder-actions";
import { cn } from "@/lib/utils/cn";
import type { CampaignFileFolder, FilesFolderFilter } from "@/types/campaign-files";

interface FilesFolderBarProps {
  eventId: string;
  eventTitle?: string;
  foldersAvailable: boolean;
  folders: CampaignFileFolder[];
  activeFolder: FilesFolderFilter;
  unfiledCount: number;
  totalFileCount: number;
  onFolderChange: (folderId: FilesFolderFilter) => void;
  onFoldersChanged: () => void;
  compact?: boolean;
}

export function FilesFolderBar({
  eventId,
  eventTitle,
  foldersAvailable,
  folders,
  activeFolder,
  unfiledCount,
  totalFileCount,
  onFolderChange,
  onFoldersChanged,
  compact = false,
}: FilesFolderBarProps) {
  const [, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [menuFolderId, setMenuFolderId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [creating]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  if (!foldersAvailable) {
    return null;
  }

  function pillClass(selected: boolean): string {
    return cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition",
      selected
        ? "bg-[rgba(47,74,60,0.14)] text-[#2f4a3c]"
        : "text-cos-muted hover:bg-[rgba(42,38,34,0.05)] hover:text-cos-text",
    );
  }

  function startCreate() {
    setError(null);
    setCreating(true);
    setNewFolderName("");
    setMenuFolderId(null);
  }

  function cancelCreate() {
    setCreating(false);
    setNewFolderName("");
  }

  function commitCreate() {
    const name = newFolderName.trim();
    if (!name) {
      cancelCreate();
      return;
    }
    startTransition(async () => {
      const result = await createFileFolderAction(eventId, name);
      if (!result.success) {
        setError(result.error ?? "Could not create folder.");
        return;
      }
      setError(null);
      cancelCreate();
      onFoldersChanged();
      if (result.folderId) {
        onFolderChange(result.folderId);
      }
    });
  }

  function startRename(folder: CampaignFileFolder) {
    setError(null);
    setMenuFolderId(null);
    setRenamingId(folder.id);
    setRenameValue(folder.name);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  function commitRename(folderId: string) {
    const name = renameValue.trim();
    if (!name) {
      cancelRename();
      return;
    }
    startTransition(async () => {
      const result = await renameFileFolderAction(eventId, folderId, name);
      if (!result.success) {
        setError(result.error ?? "Could not rename folder.");
        return;
      }
      setError(null);
      cancelRename();
      onFoldersChanged();
    });
  }

  function handleDelete(folder: CampaignFileFolder) {
    if (
      !window.confirm(
        `Delete “${folder.name}”? Files inside will stay in this campaign — they just won’t be in this folder anymore.`,
      )
    ) {
      return;
    }
    setMenuFolderId(null);
    startTransition(async () => {
      const result = await deleteFileFolderAction(eventId, folder.id);
      if (!result.success) {
        setError(result.error ?? "Could not delete folder.");
        return;
      }
      setError(null);
      if (activeFolder === folder.id) {
        onFolderChange("all");
      }
      onFoldersChanged();
    });
  }

  function moveFolder(folderId: string, direction: "left" | "right") {
    const index = folders.findIndex((folder) => folder.id === folderId);
    if (index < 0) return;
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= folders.length) return;

    const orderedFolderIds = folders.map((folder) => folder.id);
    const [removed] = orderedFolderIds.splice(index, 1);
    orderedFolderIds.splice(targetIndex, 0, removed!);

    startTransition(async () => {
      const result = await reorderFileFoldersAction(eventId, orderedFolderIds);
      if (!result.success) {
        setError(result.error ?? "Could not reorder folders.");
        return;
      }
      setError(null);
      setMenuFolderId(null);
      onFoldersChanged();
    });
  }

  return (
    <div className={cn("space-y-2", compact && "pt-1")}>
      {!compact && eventTitle ? (
        <p className="text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
          Campaign folders
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {compact ? (
          <span className="mr-0.5 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
            Folders
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => onFolderChange("all")}
          className={pillClass(activeFolder === "all")}
        >
          All files
          <span className="text-[11px] font-bold opacity-70">{totalFileCount}</span>
        </button>
        <button
          type="button"
          onClick={() => onFolderChange("unfiled")}
          className={pillClass(activeFolder === "unfiled")}
        >
          Unfiled
          <span className="text-[11px] font-bold opacity-70">{unfiledCount}</span>
        </button>
        {folders.map((folder, index) =>
          renamingId === folder.id ? (
            <input
              key={folder.id}
              ref={renameInputRef}
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitRename(folder.id);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelRename();
                }
              }}
              onBlur={() => commitRename(folder.id)}
              className="max-w-[12rem] rounded-full border border-[rgba(47,74,60,0.28)] bg-cos-card px-3.5 py-2 text-[13px] font-semibold text-cos-text outline-none"
            />
          ) : (
            <div key={folder.id} className="relative inline-flex">
              <button
                type="button"
                onClick={() => onFolderChange(folder.id)}
                className={pillClass(activeFolder === folder.id)}
              >
                <Folder className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} />
                {folder.name}
                <span className="text-[11px] font-bold opacity-70">
                  {folder.fileCount ?? 0}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Folder options for ${folder.name}`}
                onClick={() =>
                  setMenuFolderId((current) =>
                    current === folder.id ? null : folder.id,
                  )
                }
                className="ml-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted transition hover:bg-[rgba(42,38,34,0.05)] hover:text-cos-text"
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
              </button>
              {menuFolderId === folder.id ? (
                <div className="absolute top-full left-0 z-20 mt-1 min-w-[10rem] rounded-2xl border border-cos-border bg-cos-card py-1 shadow-[0_8px_28px_rgba(28,36,48,0.12)]">
                  <button
                    type="button"
                    onClick={() => startRename(folder)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-cos-text transition hover:bg-[rgba(42,38,34,0.05)]"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                    Rename
                  </button>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveFolder(folder.id, "left")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-cos-text transition hover:bg-[rgba(42,38,34,0.05)] disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                    Move left
                  </button>
                  <button
                    type="button"
                    disabled={index === folders.length - 1}
                    onClick={() => moveFolder(folder.id, "right")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-cos-text transition hover:bg-[rgba(42,38,34,0.05)] disabled:opacity-40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                    Move right
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(folder)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-[#a65a3a] transition hover:bg-[rgba(166,90,58,0.08)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ),
        )}
        {creating ? (
          <input
            ref={createInputRef}
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitCreate();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelCreate();
              }
            }}
            onBlur={() => commitCreate()}
            placeholder="Folder name"
            className="max-w-[12rem] rounded-full border border-[rgba(47,74,60,0.28)] bg-cos-card px-3.5 py-2 text-[13px] font-semibold text-cos-text outline-none placeholder:font-medium placeholder:text-cos-muted"
          />
        ) : (
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-cos-muted transition hover:bg-[rgba(42,38,34,0.05)] hover:text-cos-text"
          >
            <FolderPlus className="h-3.5 w-3.5" strokeWidth={2} />
            New folder
          </button>
        )}
      </div>
      {error ? (
        <p className="text-sm text-[#a65a3a]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
