"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

interface TasksV2AddTaskRowProps {
  disabled?: boolean;
  isPending?: boolean;
  onAdd: (title: string) => void;
}

export function TasksV2AddTaskRow({
  disabled,
  isPending,
  onAdd,
}: TasksV2AddTaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed || disabled || isPending) {
      return;
    }
    onAdd(trimmed);
    setTitle("");
    setExpanded(false);
  }

  if (!expanded) {
    return (
      <tr>
        <td colSpan={8} className="px-4 py-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-accent hover:text-cos-text disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-cos-bg/30">
      <td className="w-8 px-2 py-2" />
      <td colSpan={6} className="px-3 py-2">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSubmit();
            }
            if (event.key === "Escape") {
              setExpanded(false);
              setTitle("");
            }
          }}
          placeholder="Task name…"
          disabled={disabled || isPending}
          autoFocus
          className="w-full rounded-md border border-cos-border bg-cos-card px-2 py-1.5 text-sm text-cos-text placeholder:text-cos-muted focus:outline-none focus:ring-1 focus:ring-cos-accent/25 disabled:opacity-50"
        />
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || isPending || !title.trim()}
          className="rounded-md bg-[#2a2622] px-2.5 py-1 text-xs font-medium text-[#f6f2eb] disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Adding" />
          ) : (
            "Add"
          )}
        </button>
      </td>
    </tr>
  );
}
