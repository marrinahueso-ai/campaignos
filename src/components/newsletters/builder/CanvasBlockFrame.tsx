"use client";

import { exportCanvasBlockFragment } from "@/lib/newsletter-composer/export-html";
import type {
  NewsletterCanvasBlock,
  NewsletterComposerState,
} from "@/lib/newsletter-composer/types";
import { cn } from "@/lib/utils/cn";
import { Copy, GripVertical, Pencil, Trash2 } from "lucide-react";
import type { DragEvent } from "react";

type Props = {
  block: NewsletterCanvasBlock;
  state: NewsletterComposerState;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: DragEvent) => void;
};

/** Hoverable / selectable wrapper — the block content itself is the exact email-export HTML. */
export function CanvasBlockFrame({
  block,
  state,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
}: Props) {
  const fragment = exportCanvasBlockFragment(block, state);
  if (!fragment.trim()) {
    return (
      <div
        role="button"
        tabIndex={0}
        draggable
        data-canvas-block-id={block.id}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onPointerDown={onSelect}
        onClick={onSelect}
        className={cn(
          "group relative cursor-pointer border border-dashed px-6 py-4 text-center text-xs font-semibold text-cos-muted transition",
          selected
            ? "border-cos-brand-sage bg-cos-brand-sage-soft"
            : "border-cos-border hover:border-cos-brand-sage/60",
        )}
      >
        Empty {block.kind} block — click to edit in the panel on the right.
        <BlockControls
          visible={selected}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      data-canvas-block-id={block.id}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onPointerDown={onSelect}
      onClick={onSelect}
      className={cn(
        "group relative cursor-pointer border border-transparent px-6 py-3 transition [&_a]:pointer-events-none",
        selected
          ? "border-cos-brand-sage shadow-[0_0_0_1px_var(--cos-brand-sage)]"
          : "hover:border-cos-brand-sage/40",
      )}
    >
      <div dangerouslySetInnerHTML={{ __html: fragment }} />
      <BlockControls
        visible={selected}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </div>
  );
}

function BlockControls({
  visible,
  onDuplicate,
  onDelete,
}: {
  visible: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 transition-opacity",
        visible ? "opacity-100" : "opacity-0 group-hover:opacity-100",
      )}
    >
      <div className="pointer-events-auto flex items-center rounded-full border border-cos-border bg-white/95 p-1 shadow-[0_8px_20px_rgba(28,36,48,0.14)] backdrop-blur-sm">
        <span className="flex h-8 w-8 cursor-grab items-center justify-center text-cos-muted">
          <GripVertical className="h-3.5 w-3.5" />
        </span>
        <div className="mx-1 h-4 w-px bg-cos-border" />
        <span className="flex h-8 w-8 items-center justify-center text-cos-muted">
          <Pencil className="h-3.5 w-3.5" />
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="flex h-8 w-8 items-center justify-center text-cos-muted transition hover:text-cos-brand-sage"
          aria-label="Duplicate block"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-8 w-8 items-center justify-center text-cos-muted transition hover:text-cos-error"
          aria-label="Delete block"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
