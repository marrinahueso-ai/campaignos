"use client";

import {
  ArrowLeftRight,
  CircleUser,
  Maximize2,
  Palette,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ArtworkCustomizeAction =
  | "edit-text"
  | "change-colors"
  | "swap-elements"
  | "resize"
  | "add-logo";

const TOOLBAR_ITEMS: {
  id: ArtworkCustomizeAction;
  label: string;
  icon: typeof Type;
}[] = [
  { id: "edit-text", label: "Edit text", icon: Type },
  { id: "change-colors", label: "Change colors", icon: Palette },
  { id: "swap-elements", label: "Swap elements", icon: ArrowLeftRight },
  { id: "resize", label: "Resize", icon: Maximize2 },
  { id: "add-logo", label: "Add logo", icon: CircleUser },
];

interface ArtworkCustomizeToolbarProps {
  onAction?: (action: ArtworkCustomizeAction) => void;
  disabled?: boolean;
}

export function ArtworkCustomizeToolbar({
  onAction,
  disabled = false,
}: ArtworkCustomizeToolbarProps) {
  return (
    <section className="space-y-3">
      <p className="cos-section-title">Customize your artwork</p>
      <div className="flex flex-wrap items-center gap-2">
        {TOOLBAR_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onAction?.(id)}
            title={label}
            aria-label={label}
            className={cn(
              "group relative flex h-10 w-10 items-center justify-center border border-cos-border bg-cos-card text-cos-text transition-colors hover:bg-cos-bg disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            <span
              className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap border border-cos-border bg-cos-card px-2 py-1 text-[11px] text-cos-text shadow-sm group-hover:block"
              role="tooltip"
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
