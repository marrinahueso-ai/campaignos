"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface VendorDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function VendorDrawer({
  open,
  onClose,
  children,
  className,
}: VendorDrawerProps) {
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
          "relative flex h-full w-full max-w-md flex-col border-l border-cos-border bg-cos-card shadow-2xl",
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
