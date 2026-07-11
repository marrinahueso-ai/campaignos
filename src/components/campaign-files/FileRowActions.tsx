"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  Download,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { deleteCampaignFileAction } from "@/lib/campaign-files/actions";
import { canConvertToPdf, pdfFallbackMessage } from "@/lib/campaign-files/file-type";
import type { CampaignFile } from "@/types/campaign-files";
import { cn } from "@/lib/utils/cn";

interface FileRowActionsProps {
  file: CampaignFile;
  onEdit?: (file: CampaignFile) => void;
  compact?: boolean;
}

const MENU_MIN_WIDTH = 160;

export function FileRowActions({ file, onEdit, compact = false }: FileRowActionsProps) {
  const router = useRouter();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const [pending, startTransition] = useTransition();
  const [downloadNote, setDownloadNote] = useState<string | null>(null);
  const [downloadNoteAnchor, setDownloadNoteAnchor] = useState<DOMRect | null>(null);

  function closeMenu() {
    setMenuOpen(false);
    setMenuAnchor(null);
  }

  function toggleMenu() {
    if (menuOpen) {
      closeMenu();
      return;
    }

    const rect = menuButtonRef.current?.getBoundingClientRect() ?? null;
    setMenuAnchor(rect);
    setMenuOpen(true);
  }

  async function handlePdfDownload() {
    setDownloadNote(null);
    setDownloadNoteAnchor(null);
    const response = await fetch(`/api/files/${file.id}/download?format=pdf`);

    if (!response.ok) {
      setDownloadNote("Unable to download file.");
      setDownloadNoteAnchor(downloadButtonRef.current?.getBoundingClientRect() ?? null);
      return;
    }

    const fallback = response.headers.get("X-Download-Fallback");
    const fallbackReason = response.headers.get("X-Download-Fallback-Reason");
    if (fallback === "true" && fallbackReason) {
      setDownloadNote(fallbackReason);
      setDownloadNoteAnchor(downloadButtonRef.current?.getBoundingClientRect() ?? null);
    } else if (!canConvertToPdf(file.fileType)) {
      const message = pdfFallbackMessage(file.fileType);
      if (message) {
        setDownloadNote(message);
        setDownloadNoteAnchor(downloadButtonRef.current?.getBoundingClientRect() ?? null);
      }
    }

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

  function handleDelete() {
    if (!window.confirm(`Remove "${file.name}" from this event?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCampaignFileAction(file.id, file.eventId);
      if (!result.success) {
        window.alert(result.error ?? "Unable to remove file.");
        return;
      }
      closeMenu();
      router.refresh();
    });
  }

  function handleView() {
    if (file.url) {
      window.open(file.url, "_blank", "noopener,noreferrer");
      return;
    }
    window.open(`/api/files/${file.id}/download`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={cn("relative flex items-center gap-1", compact && "justify-end")}>
      <button
        ref={downloadButtonRef}
        type="button"
        onClick={handlePdfDownload}
        className="p-1.5 text-cos-muted transition-colors hover:text-cos-text"
        aria-label={`Download ${file.name} as PDF`}
        title="Download as PDF"
      >
        <Download className="h-4 w-4" strokeWidth={1.5} />
      </button>

      <button
        ref={menuButtonRef}
        type="button"
        onClick={toggleMenu}
        className="p-1.5 text-cos-muted transition-colors hover:text-cos-text"
        aria-label="More actions"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
      </button>

      {menuOpen && menuAnchor && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div
            role="menu"
            className="fixed z-50 min-w-[10rem] border border-cos-border bg-cos-card py-1 shadow-sm"
            style={{
              top: menuAnchor.bottom + 4,
              left: Math.max(8, menuAnchor.right - MENU_MIN_WIDTH),
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                handleView();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-cos-text hover:bg-cos-bg"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View / open
            </button>
            {onEdit && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onEdit(file);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-cos-text hover:bg-cos-bg"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit details
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={handleDelete}
              disabled={pending}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-cos-error hover:bg-cos-error-bg"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </>
      )}

      {downloadNote && downloadNoteAnchor && (
        <p
          className="fixed z-50 max-w-xs border border-cos-border bg-cos-card px-2 py-1 text-[10px] text-cos-muted shadow-sm"
          style={{
            top: downloadNoteAnchor.bottom + 8,
            left: Math.max(8, downloadNoteAnchor.right - 240),
          }}
        >
          {downloadNote}
        </p>
      )}
    </div>
  );
}
