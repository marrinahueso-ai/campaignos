"use client";

import {
  exportCanvasBlockFragment,
  exportCanvasColumnFragment,
} from "@/lib/newsletter-composer/export-html";
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
  onColumnDragStart?: (columnId: string) => void;
  onColumnDragOver?: (e: DragEvent, columnId: string) => void;
  onDragEnd?: () => void;
};

function isColumnCardBlock(kind: NewsletterCanvasBlock["kind"]): boolean {
  return kind === "grid" || kind === "columns" || kind === "carousel";
}

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
  onColumnDragStart,
  onColumnDragOver,
  onDragEnd,
}: Props) {
  const fragment = exportCanvasBlockFragment(block, state);
  const showColumnCards =
    isColumnCardBlock(block.kind) && block.columns.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      data-canvas-block-id={block.id}
      onDragOver={onDragOver}
      onPointerDown={onSelect}
      onClick={onSelect}
      className={cn(
        "group relative cursor-pointer border border-transparent px-6 py-3 transition [&_a]:pointer-events-none",
        selected
          ? "border-cos-brand-sage shadow-[0_0_0_1px_var(--cos-brand-sage)]"
          : showColumnCards
            ? "hover:border-cos-brand-sage/40"
            : fragment.trim()
              ? "hover:border-cos-brand-sage/40"
              : "border-dashed border-cos-border hover:border-cos-brand-sage/60",
        !fragment.trim() && !showColumnCards
          ? "bg-cos-brand-sage-soft/0 py-4 text-center text-xs font-semibold text-cos-muted"
          : null,
      )}
    >
      {showColumnCards ? (
        <ColumnCardGrid
          block={block}
          onColumnDragStart={onColumnDragStart}
          onColumnDragOver={onColumnDragOver}
          onDragEnd={onDragEnd}
        />
      ) : fragment.trim() ? (
        <div dangerouslySetInnerHTML={{ __html: fragment }} />
      ) : (
        <>Empty {block.kind} block — click to edit in the panel on the right.</>
      )}
      <BlockControls
        visible={selected}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    </div>
  );
}

function ColumnCardGrid({
  block,
  onColumnDragStart,
  onColumnDragOver,
  onDragEnd,
}: {
  block: NewsletterCanvasBlock;
  onColumnDragStart?: (columnId: string) => void;
  onColumnDragOver?: (e: DragEvent, columnId: string) => void;
  onDragEnd?: () => void;
}) {
  const columnCount =
    block.kind === "grid" ? 2 : Math.min(Math.max(block.columns.length, 1), 3);

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {block.columns.map((column) => (
        <article
          key={column.id}
          draggable
          data-canvas-column-id={column.id}
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", column.id);
            onColumnDragStart?.(column.id);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onColumnDragOver?.(event, column.id);
          }}
          onDragEnd={onDragEnd}
          className="relative cursor-grab rounded-xl border border-transparent p-1 hover:border-cos-brand-sage/50"
        >
          <span className="pointer-events-none absolute top-2 left-2 z-[1] flex h-7 w-7 items-center justify-center rounded-full border border-cos-border bg-white/95 text-cos-muted shadow-sm">
            <GripVertical className="h-3.5 w-3.5" />
          </span>
          <div
            className="[&_img]:pointer-events-none"
            dangerouslySetInnerHTML={{
              __html: exportCanvasColumnFragment(column),
            }}
          />
        </article>
      ))}
    </div>
  );
}

function BlockControls({
  visible,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragEnd,
}: {
  visible: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd?: () => void;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 transition-opacity",
        visible ? "opacity-100" : "opacity-0 group-hover:opacity-100",
      )}
    >
      <div className="pointer-events-auto flex items-center rounded-full border border-cos-border bg-white/95 p-1 shadow-[0_8px_20px_rgba(28,36,48,0.14)] backdrop-blur-sm">
        <span
          draggable
          aria-label="Reorder block"
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", "block");
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          className="flex h-8 w-8 cursor-grab items-center justify-center text-cos-muted"
        >
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
