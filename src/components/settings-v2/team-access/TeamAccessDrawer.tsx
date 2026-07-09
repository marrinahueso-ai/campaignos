"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface TeamAccessDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  width?: "md" | "lg" | "xl";
}

const widthStyles = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function TeamAccessDrawer({
  open,
  onClose,
  children,
  className,
  width = "xl",
}: TeamAccessDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-cos-text/20 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close drawer"
        className="flex-1"
        onClick={onClose}
      />
      <aside
        className={cn(
          "flex h-full w-full flex-col border-l border-cos-border bg-cos-card shadow-2xl",
          widthStyles[width],
          className,
        )}
      >
        <div className="absolute right-4 top-4 z-10">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </aside>
    </div>
  );
}
