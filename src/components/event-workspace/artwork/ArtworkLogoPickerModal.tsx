"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import type { SetupLogoOption } from "@/lib/artwork-v2/setup-logos";
import { cn } from "@/lib/utils/cn";

interface ArtworkLogoPickerModalProps {
  logos: SetupLogoOption[];
  onSelect: (logo: SetupLogoOption) => void;
  onClose: () => void;
}

export function ArtworkLogoPickerModal({
  logos,
  onSelect,
  onClose,
}: ArtworkLogoPickerModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/20 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="artwork-logo-picker-title"
        className="w-full max-w-md border border-cos-border bg-cos-card shadow-xl"
      >
        <div className="border-b border-cos-border px-5 py-4">
          <h2 id="artwork-logo-picker-title" className="text-base font-semibold text-cos-text">
            Choose a logo
          </h2>
          <p className="mt-1 text-xs text-cos-muted">
            Pick a logo from your organization setup to include in this artwork.
          </p>
        </div>

        <div className="space-y-2 px-5 py-4">
          {logos.map((logo) => (
            <button
              key={logo.id}
              type="button"
              onClick={() => onSelect(logo)}
              className={cn(
                "flex w-full items-center gap-3 border border-cos-border bg-cos-card px-3 py-3 text-left transition-colors hover:border-cos-dark/30 hover:bg-cos-bg/60",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.url}
                alt=""
                className="h-12 w-12 shrink-0 object-contain"
              />
              <span className="text-sm font-medium text-cos-text">{logo.label}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-cos-border px-5 py-3">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
