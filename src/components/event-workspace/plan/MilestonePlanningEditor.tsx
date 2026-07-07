"use client";

import { Trash2 } from "lucide-react";
import {
  FacebookPlatformIcon,
  InstagramPlatformIcon,
} from "@/components/communications-planning-calendar/MetaPlatformIcons";
import {
  relativeDayFromDate,
  type MilestoneContentPlatforms,
  type MilestonePlanningItem,
  type MilestonePlanningStatus,
} from "@/components/event-workspace/plan/milestone-planning-utils";
import { cn } from "@/lib/utils/cn";

interface MilestonePlanningEditorProps {
  milestone: MilestonePlanningItem;
  eventDate: string;
  onChange: (patch: Partial<MilestonePlanningItem>) => void;
  onDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
}

const fieldClassName =
  "border border-cos-border bg-cos-card px-3 text-sm text-cos-text focus:outline-none focus:ring-1 focus:ring-cos-text/10";

const labelClassName =
  "text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-cos-muted";

function CharCount({ current, max }: { current: number; max: number }) {
  return (
    <span className="text-xs tabular-nums text-cos-muted">
      {current}/{max}
    </span>
  );
}

function PlatformCheckbox({
  checked,
  label,
  sublabel,
  icon,
  onChange,
}: {
  checked: boolean;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1",
            checked
              ? "border-transparent bg-cos-success text-white"
              : "border-cos-border bg-cos-card",
          )}
        >
          {checked && (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
              <path
                d="M2 6l3 3 5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm text-cos-text">
          {icon}
          {label}
          {sublabel && <span className="text-xs text-cos-muted">{sublabel}</span>}
        </span>
      </span>
    </label>
  );
}

function updateContentPlatforms(
  current: MilestoneContentPlatforms,
  key: keyof MilestoneContentPlatforms,
  value: boolean,
): MilestoneContentPlatforms {
  return { ...current, [key]: value };
}

export function MilestonePlanningEditor({
  milestone,
  eventDate,
  onChange,
  onDelete,
  onCancel,
  onSave,
}: MilestonePlanningEditorProps) {
  function handleDateChange(nextDate: string) {
    const relativeDay = relativeDayFromDate(eventDate, nextDate);
    onChange({
      dueDate: nextDate,
      relativeDay,
      status: "scheduled",
    });
  }

  function handleStatusChange(status: MilestonePlanningStatus) {
    onChange({
      status,
      dueDate: status === "not_started" ? "" : milestone.dueDate || eventDate.slice(0, 10),
    });
  }

  return (
    <div className="relative mx-4 mb-4 border border-cos-success bg-cos-card px-4 py-5 sm:px-5">
      <div
        className="absolute -top-2 left-12 h-4 w-4 rotate-45 border-t border-l border-cos-success bg-cos-card"
        aria-hidden
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={`milestone-title-${milestone.relativeDay}`}
                className={labelClassName}
              >
                Title
              </label>
              <CharCount current={milestone.title.length} max={50} />
            </div>
            <input
              id={`milestone-title-${milestone.relativeDay}`}
              value={milestone.title}
              maxLength={50}
              onChange={(event) => onChange({ title: event.target.value })}
              className={cn(fieldClassName, "h-10 w-full")}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={`milestone-description-${milestone.relativeDay}`}
                className={labelClassName}
              >
                Description
              </label>
              <CharCount current={milestone.description.length} max={120} />
            </div>
            <textarea
              id={`milestone-description-${milestone.relativeDay}`}
              value={milestone.description}
              maxLength={120}
              rows={2}
              onChange={(event) => onChange({ description: event.target.value })}
              className={cn(fieldClassName, "w-full py-2")}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={`milestone-notes-${milestone.relativeDay}`}
                className={labelClassName}
              >
                Internal notes
              </label>
              <CharCount current={milestone.internalNotes.length} max={200} />
            </div>
            <textarea
              id={`milestone-notes-${milestone.relativeDay}`}
              value={milestone.internalNotes}
              maxLength={200}
              rows={2}
              placeholder="Team-only context (not shown in posts)"
              onChange={(event) => onChange({ internalNotes: event.target.value })}
              className={cn(
                fieldClassName,
                "w-full py-2 placeholder:text-cos-dark-muted",
              )}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className={labelClassName}>Content to create</p>
          <div className="space-y-3">
            <PlatformCheckbox
              checked={milestone.contentPlatforms.instagramFeed}
              label="Instagram Feed"
              sublabel="1:1"
              icon={<InstagramPlatformIcon className="h-3.5 w-3.5" />}
              onChange={(checked) =>
                onChange({
                  contentPlatforms: updateContentPlatforms(
                    milestone.contentPlatforms,
                    "instagramFeed",
                    checked,
                  ),
                })
              }
            />
            <PlatformCheckbox
              checked={milestone.contentPlatforms.instagramStory}
              label="Instagram Story"
              sublabel="9:16"
              icon={<InstagramPlatformIcon className="h-3.5 w-3.5" />}
              onChange={(checked) =>
                onChange({
                  contentPlatforms: updateContentPlatforms(
                    milestone.contentPlatforms,
                    "instagramStory",
                    checked,
                  ),
                })
              }
            />
            <PlatformCheckbox
              checked={milestone.contentPlatforms.facebookFeed}
              label="Facebook Feed"
              icon={<FacebookPlatformIcon className="h-3.5 w-3.5" />}
              onChange={(checked) =>
                onChange({
                  contentPlatforms: updateContentPlatforms(
                    milestone.contentPlatforms,
                    "facebookFeed",
                    checked,
                  ),
                })
              }
            />
            <PlatformCheckbox
              checked={milestone.contentPlatforms.facebookStory}
              label="Facebook Story"
              icon={<FacebookPlatformIcon className="h-3.5 w-3.5" />}
              onChange={(checked) =>
                onChange({
                  contentPlatforms: updateContentPlatforms(
                    milestone.contentPlatforms,
                    "facebookStory",
                    checked,
                  ),
                })
              }
            />
          </div>
          <button type="button" className="text-xs font-medium text-cos-status-todo-text">
            + Add another platform
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className={labelClassName}>Schedule</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={milestone.dueDate ? milestone.dueDate.slice(0, 10) : ""}
                onChange={(event) => handleDateChange(event.target.value)}
                className={cn(fieldClassName, "h-10 w-full")}
              />
              <input
                type="time"
                value={milestone.scheduleTime}
                onChange={(event) =>
                  onChange({ scheduleTime: event.target.value, status: "scheduled" })
                }
                className={cn(fieldClassName, "h-10 w-full")}
              />
            </div>
            <p className="text-xs text-cos-muted">Times shown in your local timezone</p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`milestone-status-${milestone.relativeDay}`}
              className={labelClassName}
            >
              Status
            </label>
            <select
              id={`milestone-status-${milestone.relativeDay}`}
              value={milestone.status}
              onChange={(event) =>
                handleStatusChange(event.target.value as MilestonePlanningStatus)
              }
              className={cn(
                fieldClassName,
                "h-10 w-full",
                milestone.status === "scheduled"
                  ? "bg-cos-success-bg text-cos-success-text"
                  : "bg-cos-warning text-cos-warning-text",
              )}
            >
              <option value="scheduled">Scheduled</option>
              <option value="not_started">Not started</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-cos-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-cos-error"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete milestone
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center justify-center border border-cos-border bg-cos-card px-4 text-xs font-medium text-cos-text transition-colors hover:bg-cos-bg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex h-9 items-center justify-center bg-cos-text px-4 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
