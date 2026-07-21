"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type {
  CalendarEventCategory,
  CalendarEventReviewStatus,
  CalendarReviewEvent,
} from "@/types/calendar-review";
import type { EventType } from "@/types/playbooks";
import { CampaignPlanPreview } from "@/components/calendar-review/CampaignPlanPreview";
import {
  buildCalendarReviewPlanOptions,
  CALENDAR_ONLY_PLAN_VALUE,
  defaultPlaybookIdForReview,
  getSelectedReviewPlanValue,
  resolveReviewPlanSelection,
  type ReviewPlaybookOption,
} from "@/lib/calendar-import/review-plan-options";
import { defaultStrategyForCalendarImport } from "@/lib/events/communication-strategy";
import { inferEventTypeFromTitle } from "@/lib/events/event-type-inference";
import { EVENT_TYPES } from "@/lib/playbooks/constants";

interface CalendarReviewEditDialogProps {
  event: CalendarReviewEvent;
  playbookOptions: ReviewPlaybookOption[];
  onClose: () => void;
  onSave: (event: CalendarReviewEvent) => void;
}

const categories: CalendarEventCategory[] = [
  "PTO Event",
  "School Event",
  "Holiday",
  "Early Release",
];

const statuses: CalendarEventReviewStatus[] = [
  "ready",
  "needs_review",
  "conflict",
  "duplicate",
  "update",
];

const statusLabels: Record<CalendarEventReviewStatus, string> = {
  ready: "New",
  needs_review: "Needs Review",
  conflict: "Conflict",
  duplicate: "Duplicate",
  update: "Update",
};

export function CalendarReviewEditDialog({
  event,
  playbookOptions,
  onClose,
  onSave,
}: CalendarReviewEditDialogProps) {
  const planOptions = buildCalendarReviewPlanOptions(playbookOptions);
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [category, setCategory] = useState<CalendarEventCategory>(event.category);
  const [status, setStatus] = useState<CalendarEventReviewStatus>(event.status);
  const [eventType, setEventType] = useState<EventType>(
    event.eventType ?? inferEventTypeFromTitle(event.name, event.category),
  );
  const [planValue, setPlanValue] = useState(() =>
    getSelectedReviewPlanValue(event, playbookOptions),
  );

  function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const resolved = resolveReviewPlanSelection(planValue, playbookOptions);
    onSave({
      ...event,
      name,
      date,
      category,
      status,
      eventType: resolved.eventType ?? eventType,
      communicationStrategy: resolved.communicationStrategy,
      playbookId: resolved.playbookId,
      planManuallySet: true,
    });
  }

  function handleCategoryChange(nextCategory: CalendarEventCategory) {
    setCategory(nextCategory);
    const nextType = inferEventTypeFromTitle(name, nextCategory);
    setEventType(nextType);
    const strategy = defaultStrategyForCalendarImport(name, nextCategory);
    const nextPlaybookId = defaultPlaybookIdForReview(
      nextType,
      strategy,
      playbookOptions,
    );
    setPlanValue(
      nextPlaybookId ??
        (strategy === "calendar_only" ? CALENDAR_ONLY_PLAN_VALUE : planValue),
    );
  }

  function handleNameChange(nextName: string) {
    setName(nextName);
    setEventType(inferEventTypeFromTitle(nextName, category));
  }

  function handlePlanChange(nextValue: string) {
    setPlanValue(nextValue);
    const resolved = resolveReviewPlanSelection(nextValue, playbookOptions);
    if (resolved.eventType) {
      setEventType(resolved.eventType);
    }
  }

  const selectedOption = planOptions.find((option) => option.value === planValue);
  const previewStrategy = resolveReviewPlanSelection(
    planValue,
    playbookOptions,
  ).communicationStrategy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cos-dark/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-event-title"
        className="w-full max-w-lg rounded-2xl border border-cos-border bg-white p-6 shadow-xl"
      >
        <div className="mb-6">
          <h2 id="edit-event-title" className="text-lg font-semibold text-cos-text">
            Edit event
          </h2>
          <p className="mt-1 text-sm text-cos-muted">
            Adjust event details before importing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Event Name"
            value={name}
            onChange={(changeEvent) => handleNameChange(changeEvent.target.value)}
            required
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(changeEvent) => setDate(changeEvent.target.value)}
            required
          />
          <Select
            label="Category"
            value={category}
            onChange={(changeEvent) =>
              handleCategoryChange(changeEvent.target.value as CalendarEventCategory)
            }
          >
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Select
            label="Event type"
            value={eventType}
            onChange={(changeEvent) =>
              setEventType(changeEvent.target.value as EventType)
            }
          >
            {EVENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Plan type"
            value={planValue}
            onChange={(changeEvent) => handlePlanChange(changeEvent.target.value)}
          >
            {planOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.summary}
              </option>
            ))}
          </Select>
          <div className="rounded-xl border border-cos-border bg-cos-bg/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
              Campaign plan preview
            </p>
            <div className="mt-3">
              <CampaignPlanPreview
                eventType={eventType}
                communicationStrategy={previewStrategy}
                planSummary={
                  selectedOption?.kind === "playbook"
                    ? selectedOption.summary
                    : undefined
                }
              />
            </div>
            <p className="mt-3 text-xs text-cos-muted">
              Plan types come from Settings → Playbooks. You can change these again
              after import from the event workspace.
            </p>
          </div>
          <Select
            label="Status"
            value={status}
            onChange={(changeEvent) =>
              setStatus(changeEvent.target.value as CalendarEventReviewStatus)
            }
          >
            {statuses.map((option) => (
              <option key={option} value={option}>
                {statusLabels[option]}
              </option>
            ))}
          </Select>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
