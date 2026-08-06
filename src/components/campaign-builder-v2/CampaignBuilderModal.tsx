"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

  const sheet = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-cos-text/25 p-5 backdrop-blur-sm sm:p-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-builder-modal-title"
        className={cn(
          // Content-sized sheet, capped well below the viewport so margins stay
          // visible and Report-a-Problem doesn’t sit on the Generate button.
          "flex w-full flex-col overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-xl",
          sizeClasses[size],
          className,
        )}
        style={{
          // xl + footer (Edit Post): definite height so the body can scroll and
          // the regenerate bar stays pinned with clear viewport margins.
          maxHeight: "min(82dvh, calc(100dvh - 4rem))",
          ...(size === "xl" && footer
            ? { height: "min(82dvh, calc(100dvh - 4rem))" }
            : null),
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-cos-border px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2
              id="campaign-builder-modal-title"
              className="font-display text-xl text-cos-text sm:text-2xl"
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

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6"
          style={{ minHeight: 0 }}
        >
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-cos-border bg-cos-card px-5 py-3 sm:px-6 sm:py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return sheet;
  }

  return createPortal(sheet, document.body);
}
