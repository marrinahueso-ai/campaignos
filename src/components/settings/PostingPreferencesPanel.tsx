"use client";

import { FormEvent, useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  COMMON_US_TIMEZONES,
} from "@/lib/organizations/posting-preferences";
import {
  savePostingPreferencesAction,
  type PostingPreferencesActionState,
} from "@/lib/organizations/posting-preferences-actions";
import type { PostingPreferencesInput } from "@/types/posting-preferences";

const DAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: formatHourOption(hour),
}));

interface PostingPreferencesPanelProps {
  initialInput: PostingPreferencesInput;
}

const INITIAL_ACTION_STATE: PostingPreferencesActionState = {
  error: null,
  success: false,
};

export function PostingPreferencesPanel({ initialInput }: PostingPreferencesPanelProps) {
  const [useCustomWindows, setUseCustomWindows] = useState(initialInput.useCustomWindows);
  const [selectedDays, setSelectedDays] = useState<number[]>(initialInput.daysOfWeek);
  const [state, formAction, isPending] = useActionState(
    savePostingPreferencesAction,
    INITIAL_ACTION_STATE,
  );

  function toggleDay(day: number) {
    setSelectedDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (useCustomWindows && selectedDays.length === 0) {
      event.preventDefault();
      return;
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="cos-card space-y-4 p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Posting schedule</CardTitle>
        <CardDescription>
          Timezone and preferred posting windows power the calendar week-view heatmap.
        </CardDescription>
      </CardHeader>

      <Select
        name="timezone"
        label="Organization timezone"
        defaultValue={initialInput.timezone}
      >
        {COMMON_US_TIMEZONES.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replace("_", " ")}
          </option>
        ))}
      </Select>

      <label className="flex items-start gap-3 rounded-xl border border-cos-border bg-cos-bg/40 px-4 py-3">
        <input
          type="checkbox"
          name="useCustomWindows"
          checked={useCustomWindows}
          onChange={(event) => setUseCustomWindows(event.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="block text-sm font-medium text-cos-text">
            Set custom best times to post
          </span>
          <span className="mt-1 block text-sm text-cos-muted">
            When off, CampaignOS suggests weekday evenings (5–8pm) for PTO audiences.
          </span>
        </span>
      </label>

      {useCustomWindows && (
        <div className="space-y-4 rounded-xl border border-cos-border bg-white p-4">
          <fieldset>
            <legend className="text-sm font-medium text-cos-text">Days</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAY_OPTIONS.map(({ value, label }) => {
                const active = selectedDays.includes(value);
                return (
                  <label
                    key={value}
                    className={`inline-flex cursor-pointer items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                      active
                        ? "bg-cos-text text-cos-card ring-cos-text"
                        : "bg-cos-bg text-cos-muted ring-cos-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="daysOfWeek"
                      value={value}
                      checked={active}
                      onChange={() => toggleDay(value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              name="startHour"
              label="Start hour"
              defaultValue={String(initialInput.startHour)}
            >
              {HOUR_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              name="endHour"
              label="End hour"
              defaultValue={String(initialInput.endHour)}
            >
              {HOUR_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-emerald-600">Posting preferences saved.</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save posting preferences"}
        </Button>
      </div>
    </form>
  );
}

function formatHourOption(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
