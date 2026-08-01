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
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/20 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-builder-modal-title"
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-xl",
          sizeClasses[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-cos-border px-6 py-5">
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

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="border-t border-cos-border px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
