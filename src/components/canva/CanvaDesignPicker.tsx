"use client";

import { useEffect, useState, useTransition } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { listCanvaDesignsAction } from "@/lib/canva/actions";
import type { CanvaDesignSummary } from "@/lib/canva/types";
import { cn } from "@/lib/utils/cn";

interface CanvaDesignPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (design: CanvaDesignSummary) => void;
  importingDesignId?: string | null;
  connectHref: string;
}

export function CanvaDesignPicker({
  open,
  onClose,
  onSelect,
  importingDesignId = null,
  connectHref,
}: CanvaDesignPickerProps) {
  const [designs, setDesigns] = useState<CanvaDesignSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    startLoading(async () => {
      const result = await listCanvaDesignsAction();
      if (!result.success) {
        setDesigns([]);
        setError(result.error ?? "Unable to load Canva designs.");
        return;
      }
      setDesigns(result.designs ?? []);
    });
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-cos-text/25 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="canva-picker-title"
        className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cos-border px-5 py-4">
          <div>
            <h3 id="canva-picker-title" className="font-display text-2xl text-cos-text">
              Import from Canva
            </h3>
            <p className="mt-1 text-sm text-cos-muted">
              Pick a design — we&apos;ll export it as PNG and add it to this milestone.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-cos-muted hover:bg-cos-bg hover:text-cos-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-cos-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your Canva designs…
            </div>
          )}

          {!isLoading && error && (
            <div className="space-y-4 py-8 text-center">
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
              {error.includes("Connect Canva") && (
                <Button href={connectHref} size="sm">
                  Connect Canva
                </Button>
              )}
            </div>
          )}

          {!isLoading && !error && designs.length === 0 && (
            <p className="py-12 text-center text-sm text-cos-muted">
              No designs found in your Canva account yet.
            </p>
          )}

          {!isLoading && !error && designs.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {designs.map((design) => {
                const importing = importingDesignId === design.id;
                return (
                  <li key={design.id}>
                    <button
                      type="button"
                      disabled={Boolean(importingDesignId)}
                      onClick={() => onSelect(design)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border border-cos-border bg-cos-bg/40 p-3 text-left transition-colors",
                        "hover:border-cos-text/20 hover:bg-cos-card disabled:cursor-not-allowed disabled:opacity-60",
                      )}
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f7f6f3]">
                        {design.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={design.thumbnailUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-cos-muted" />
                        )}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-cos-text">
                          {design.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-cos-muted">
                          {importing ? "Importing…" : "Import as artwork"}
                        </span>
                      </span>
                      {importing && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cos-muted" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
