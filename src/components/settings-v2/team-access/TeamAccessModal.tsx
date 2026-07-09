"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface TeamAccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  wide?: boolean;
}

export function TeamAccessModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
  wide,
}: TeamAccessModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/20 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[90vh] w-full flex-col border border-cos-border bg-cos-card shadow-2xl",
          wide ? "max-w-4xl" : "max-w-lg",
          className,
        )}
      >
        <div className="flex items-start justify-between border-b border-cos-border px-6 py-5">
          <div>
            <h2 className="font-display text-2xl text-cos-text">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-cos-muted">{subtitle}</p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="border-t border-cos-border px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
