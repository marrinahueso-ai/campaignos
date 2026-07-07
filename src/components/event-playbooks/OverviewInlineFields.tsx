"use client";

import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";

const inputClassName =
  "w-full rounded-sm border border-cos-border bg-cos-card px-2 py-1 text-sm text-cos-text focus:outline-none focus:ring-1 focus:ring-cos-text/20 disabled:opacity-50";

interface OverviewInlineTextProps {
  value: string;
  displayValue?: string;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  inputType?: "text" | "date";
  valueClassName?: string;
  onSave: (value: string) => Promise<void> | void;
}

export function OverviewInlineText({
  value,
  displayValue,
  placeholder = "Not set",
  disabled = false,
  multiline = false,
  rows = 2,
  inputType = "text",
  valueClassName,
  onSave,
}: OverviewInlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const shown = displayValue ?? (value.trim() || placeholder);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === value.trim()) {
      return;
    }

    startTransition(async () => {
      await onSave(trimmed);
    });
  }

  if (editing) {
    const sharedProps = {
      value: draft,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(event.target.value),
      onBlur: commit,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Enter" && !multiline) {
          event.preventDefault();
          (event.target as HTMLInputElement).blur();
        }
        if (event.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      },
      autoFocus: true,
      disabled: disabled || isPending,
      placeholder,
      className: inputClassName,
    };

    return multiline ? (
      <textarea {...sharedProps} rows={rows} />
    ) : (
      <input type={inputType} {...sharedProps} />
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && !isPending && setEditing(true)}
      disabled={disabled || isPending}
      className={cn(
        "block w-full text-left hover:underline disabled:cursor-default disabled:opacity-50 disabled:hover:no-underline",
        valueClassName,
        !value.trim() && "text-cos-muted",
      )}
    >
      {shown}
    </button>
  );
}

interface OverviewInlineSelectProps {
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  valueClassName?: string;
  onSave: (value: string) => Promise<void> | void;
}

export function OverviewInlineSelect({
  value,
  options,
  placeholder = "Not set",
  disabled = false,
  valueClassName,
  onSave,
}: OverviewInlineSelectProps) {
  const [isPending, startTransition] = useTransition();
  const label = options.find((option) => option.value === value)?.label ?? placeholder;

  function handleChange(nextValue: string) {
    if (nextValue === value) {
      return;
    }

    startTransition(async () => {
      await onSave(nextValue);
    });
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        disabled={disabled || isPending}
        className={cn(
          inputClassName,
          "cursor-pointer appearance-none pr-7 font-medium",
          valueClassName,
          !value && "text-cos-muted",
        )}
        aria-label={placeholder}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-cos-muted">
        ▾
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
