"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";

import { AppImage } from "@/components/images/AppImage";
import { Button } from "@/components/ui/Button";
import {
  searchBackgroundLibraryForSchoolsAction,
  selectBackgroundLibraryAssetAction,
  type BackgroundLibraryPickerAsset,
} from "@/lib/background-library/school-actions";
import type { BackgroundLibrary } from "@/lib/background-library/types";
import { BACKGROUND_LIBRARY_GRID_THUMB_WIDTH } from "@/lib/background-library/constants";
import { cn } from "@/lib/utils/cn";

type BackgroundLibraryPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: BackgroundLibraryPickerAsset) => void;
  /** Optional collection chip to apply when the dialog opens. */
  initialQuery?: string;
};

export function BackgroundLibraryPicker({
  open,
  onClose,
  onSelect,
  initialQuery = "",
}: BackgroundLibraryPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [assets, setAssets] = useState<BackgroundLibraryPickerAsset[]>([]);
  const [libraries, setLibraries] = useState<BackgroundLibrary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [isSelecting, startSelecting] = useTransition();

  useEffect(() => {
    if (!open) return;
    setDraftQuery(initialQuery);
    setQuery(initialQuery);
    setError(null);
    setSelectingId(null);
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    startLoading(async () => {
      const result = await searchBackgroundLibraryForSchoolsAction({
        query,
      });
      if (!result.success) {
        setAssets([]);
        setLibraries([]);
        setError(result.message ?? "Could not load the background library.");
        return;
      }
      setAssets(result.assets);
      setLibraries(result.libraries);
    });
  }, [open, query]);

  function applySearch(next: string) {
    setDraftQuery(next);
    setQuery(next.trim());
  }

  function handleSelect(asset: BackgroundLibraryPickerAsset) {
    setSelectingId(asset.id);
    setError(null);
    startSelecting(async () => {
      const result = await selectBackgroundLibraryAssetAction(asset.id);
      if (!result.success || !result.asset) {
        setError(result.message ?? "Could not use that background.");
        setSelectingId(null);
        return;
      }
      onSelect(result.asset);
      setSelectingId(null);
      onClose();
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-cos-text/30 p-3 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close background library"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="background-library-picker-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cos-border px-5 py-4">
          <div>
            <h3
              id="background-library-picker-title"
              className="font-display text-2xl text-cos-text"
            >
              Background Library
            </h3>
            <p className="mt-1 text-sm text-cos-muted">
              Search by collection or tag — results mix for variety, not likeness.
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

        <div className="space-y-3 border-b border-cos-border px-5 py-3">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              applySearch(draftQuery);
            }}
          >
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search backgrounds</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
              <input
                type="search"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder='Try “back to school” or “fall”'
                className="w-full rounded-xl border border-cos-border bg-cos-bg/40 py-2.5 pr-3 pl-10 text-sm text-cos-text outline-none focus:border-cos-accent"
              />
            </label>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
          {libraries.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applySearch("")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  !query
                    ? "border-cos-accent bg-cos-accent/10 text-cos-text"
                    : "border-cos-border text-cos-muted hover:border-cos-accent/50 hover:text-cos-text",
                )}
              >
                All
              </button>
              {libraries.map((library) => {
                const active =
                  normalizeChip(query) === normalizeChip(library.name);
                return (
                  <button
                    key={library.id}
                    type="button"
                    onClick={() => applySearch(library.name)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-cos-accent bg-cos-accent/10 text-cos-text"
                        : "border-cos-border text-cos-muted hover:border-cos-accent/50 hover:text-cos-text",
                    )}
                  >
                    {library.name}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-cos-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading backgrounds…
            </div>
          ) : assets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-cos-border bg-cos-bg/30 px-4 py-12 text-center text-sm text-cos-muted">
              {query
                ? `No published backgrounds match “${query}”.`
                : "No published backgrounds yet."}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {assets.map((asset) => {
                const busy = isSelecting && selectingId === asset.id;
                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      disabled={isSelecting}
                      onClick={() => handleSelect(asset)}
                      className={cn(
                        "group flex w-full flex-col overflow-hidden rounded-xl border border-cos-border bg-cos-bg/20 text-left transition",
                        "hover:border-cos-accent hover:shadow-md disabled:opacity-60",
                      )}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-cos-bg">
                        <AppImage
                          src={asset.publicUrl}
                          alt={asset.title || "Background"}
                          fill
                          preset="card"
                          displayWidth={BACKGROUND_LIBRARY_GRID_THUMB_WIDTH}
                          className="object-cover transition duration-300 group-hover:scale-[1.03]"
                          sizes="(max-width: 640px) 45vw, 180px"
                        />
                        {busy ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-cos-card/70">
                            <Loader2 className="h-5 w-5 animate-spin text-cos-accent" />
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-1 p-2.5">
                        <p className="line-clamp-1 text-sm font-medium text-cos-text">
                          {asset.title || "Untitled"}
                        </p>
                        <p className="line-clamp-1 text-[11px] text-cos-muted">
                          {asset.libraryNames.length > 0
                            ? asset.libraryNames.join(" · ")
                            : "Uncategorized"}
                        </p>
                        <p className="text-[11px] text-cos-muted">
                          Used {asset.usageCount.toLocaleString()}
                          {asset.usageCount === 1 ? " time" : " times"}
                        </p>
                      </div>
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

function normalizeChip(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
