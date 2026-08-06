"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CampaignBuilderModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Extra controls in the header (e.g. Apply & close), left of the X. */
  headerActions?: ReactNode;
  className?: string;
  size?: "md" | "lg" | "xl";
}

const sizeClasses = {
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function CampaignBuilderModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  headerActions,
  className,
  size = "lg",
}: CampaignBuilderModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-cos-text/20 p-3 backdrop-blur-sm sm:p-4"
      role="presentation"
    >
      {/*
        flex-1 + min-h-0 gives the sheet a definite height budget (viewport
        minus padding). Grid rows then keep header/footer visible while the
        middle pane scrolls — avoids Safari clipping Edit Post below the fold.
      */}
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="campaign-builder-modal-title"
          className={cn(
            "grid max-h-full min-h-0 w-full overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-xl",
            footer
              ? "grid-rows-[auto_minmax(0,1fr)_auto]"
              : "grid-rows-[auto_minmax(0,1fr)]",
            sizeClasses[size],
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-cos-border px-5 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0">
              <h2
                id="campaign-builder-modal-title"
                className="font-display text-2xl text-cos-text"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-sm text-cos-muted">{subtitle}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1.5 text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
            {children}
          </div>

          {footer ? (
            <div className="border-t border-cos-border bg-cos-card px-5 py-3 sm:px-6 sm:py-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
