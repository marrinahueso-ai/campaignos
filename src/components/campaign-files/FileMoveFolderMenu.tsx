"use client";

import { FolderInput } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { moveCampaignFileToFolderAction } from "@/lib/campaign-files/folder-actions";
import { cn } from "@/lib/utils/cn";
import type { CampaignFile, CampaignFileFolder } from "@/types/campaign-files";

interface FileMoveFolderMenuProps {
  file: CampaignFile;
  folders: CampaignFileFolder[];
  foldersAvailable: boolean;
  onMoved: (fileId: string, folderId: string | null) => void;
}

export function FileMoveFolderMenu({
  file,
  folders,
  foldersAvailable,
  onMoved,
}: FileMoveFolderMenuProps) {
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (!foldersAvailable) {
    return null;
  }

  function moveTo(folderId: string | null) {
    setError(null);
    setPending(true);
    startTransition(async () => {
      const result = await moveCampaignFileToFolderAction(file.id, folderId);
      setPending(false);
      if (!result.success) {
        setError(result.error ?? "Could not move file.");
        return;
      }
      setOpen(false);
      onMoved(file.id, folderId);
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={pending}
        className="rounded-full px-2.5 py-1.5 text-xs font-bold text-cos-muted transition hover:bg-[rgba(42,38,34,0.05)] hover:text-cos-text disabled:opacity-60"
      >
        Move
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-20 mt-1 min-w-[11rem] rounded-2xl border border-cos-border bg-cos-card py-1 shadow-[0_8px_28px_rgba(28,36,48,0.12)]">
          <p className="px-3 py-1.5 text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
            Move to folder
          </p>
          {file.folderId ? (
            <button
              type="button"
              onClick={() => moveTo(null)}
              disabled={pending}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-cos-text transition hover:bg-[rgba(42,38,34,0.05)] disabled:opacity-60"
            >
              Remove from folder
            </button>
          ) : null}
          {folders.length === 0 ? (
            <p className="px-3 py-2 text-sm text-cos-muted">
              Create a folder first.
            </p>
          ) : (
            folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => moveTo(folder.id)}
                disabled={pending || file.folderId === folder.id}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold transition hover:bg-[rgba(42,38,34,0.05)] disabled:opacity-60",
                  file.folderId === folder.id ? "text-cos-muted" : "text-cos-text",
                )}
              >
                <FolderInput className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} />
                {folder.name}
                {file.folderId === folder.id ? (
                  <span className="text-[11px] font-bold text-cos-muted">Current</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
      {error ? (
        <p className="absolute top-full right-0 z-10 mt-1 max-w-[14rem] text-xs text-[#a65a3a]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
