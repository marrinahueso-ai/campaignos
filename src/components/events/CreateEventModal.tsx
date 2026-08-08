"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useState } from "react";
import {
  Bell,
  Calendar,
  CalendarCheck,
  Clock,
  MapPin,
  Megaphone,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { EventBriefDescriptionSection } from "@/components/events/EventBriefDescriptionSection";
import { createEvent } from "@/lib/events/actions";
import {
  COMMUNICATION_STRATEGY_OPTIONS,
  shouldAssignPlaybook,
} from "@/lib/events/communication-strategy";
import {
  type CreateEventFields,
  type CreateEventFormState,
} from "@/lib/events/create-event-form-state";
import { EVENT_TIME_INPUT_HINT } from "@/lib/events/time-input";
import { DEFAULT_EVENT_TYPE, SYSTEM_PLAYBOOK_IDS } from "@/lib/playbooks/constants";
import type { EventBriefInput } from "@/lib/ai/types";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";
import { cn } from "@/lib/utils/cn";

export type CreateEventPlaybookOption = {
  id: string;
  name: string;
  eventType: EventType;
};

type Props = {
  open: boolean;
  onClose: () => void;
  playbookOptions: CreateEventPlaybookOption[];
};

const AUDIENCE_OPTIONS = [
  "",
  "Everyone",
  "Parents Only",
  "Teachers & Staff",
  "Active Volunteers",
] as const;

const THEME_OPTIONS = [
  "",
  "Default Theme",
  "Festive & Bright",
  "Elegant & Professional",
  "Seasonal Backgrounds",
] as const;

const STRATEGY_CARDS: Array<{
  value: CommunicationStrategy;
  label: string;
  description: string;
  icon: typeof Megaphone;
  disabled?: boolean;
}> = [
  {
    value: "full_campaign",
    label: "Full campaign",
    description:
      "A complete communication plan with timeline, drafts, and publishing.",
    icon: Megaphone,
  },
  {
    value: "reminder_only",
    label: "Reminders only",
    description: "A lighter plan for a few key reminders.",
    icon: Bell,
  },
  {
    value: "calendar_only",
    label: "On the calendar only",
    description: "Add the event without creating a communication campaign.",
    icon: CalendarCheck,
  },
  {
    value: "custom",
    label: "Custom",
    description: "More flexible options coming soon.",
    icon: SlidersHorizontal,
    disabled: true,
  },
];

function defaultPlaybookId(options: CreateEventPlaybookOption[]): string {
  const general =
    options.find((option) => option.id === SYSTEM_PLAYBOOK_IDS.general_event) ??
    options.find((option) => option.eventType === "general_event") ??
    options[0];
  return general?.id ?? "";
}

function buildDefaultFields(
  playbookOptions: CreateEventPlaybookOption[],
): CreateEventFields {
  const playbookId = defaultPlaybookId(playbookOptions);
  const selected = playbookOptions.find((option) => option.id === playbookId);
  return {
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    audience: "",
    theme: "",
    status: "draft",
    eventType: selected?.eventType ?? DEFAULT_EVENT_TYPE,
    communicationStrategy: "full_campaign",
    playbookId,
  };
}

const initialState: CreateEventFormState = { error: null };

const fieldClass =
  "w-full rounded-xl border border-[#e6dfd5] bg-white px-4 py-3 text-sm text-[#1c352d] outline-none transition placeholder:text-[#5e6b65]/40 focus:border-[#8ea89d]";

export function CreateEventModal({ open, onClose, playbookOptions }: Props) {
  const titleId = useId();
  const [fields, setFields] = useState<CreateEventFields>(() =>
    buildDefaultFields(playbookOptions),
  );
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createEvent,
    initialState,
  );

  useEffect(() => {
    if (!open) return;
    setFields(buildDefaultFields(playbookOptions));
    setOptionalOpen(false);
  }, [open, playbookOptions]);

  useEffect(() => {
    if (state.fields) {
      setFields(state.fields);
    }
  }, [state.fields]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, isPending]);

  if (!open) return null;

  function updateField<K extends keyof CreateEventFields>(
    field: K,
    value: CreateEventFields[K],
  ) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function selectPlaybook(playbookId: string) {
    const selected = playbookOptions.find((option) => option.id === playbookId);
    setFields((current) => ({
      ...current,
      playbookId,
      eventType: selected?.eventType ?? current.eventType,
    }));
  }

  function updateStrategy(value: CommunicationStrategy) {
    setFields((current) => {
      const next = { ...current, communicationStrategy: value };
      if (
        shouldAssignPlaybook(value) &&
        !current.playbookId &&
        playbookOptions.length > 0
      ) {
        const playbookId = defaultPlaybookId(playbookOptions);
        const selected = playbookOptions.find(
          (option) => option.id === playbookId,
        );
        next.playbookId = playbookId;
        next.eventType = selected?.eventType ?? current.eventType;
      }
      return next;
    });
  }

  function getBriefInput(): EventBriefInput {
    const playbookName =
      playbookOptions.find((option) => option.id === fields.playbookId)?.name ??
      null;
    const communicationStrategyLabel =
      COMMUNICATION_STRATEGY_OPTIONS.find(
        (entry) => entry.value === fields.communicationStrategy,
      )?.label ?? null;

    return {
      title: fields.title,
      roughDescription: fields.description,
      audience: fields.audience.trim() || null,
      theme: fields.theme.trim() || null,
      category: playbookName,
      eventTypeLabel: playbookName,
      communicationStrategyLabel,
      location: fields.location.trim() || null,
      date: fields.date.trim() || null,
      time: fields.time.trim() || null,
      volunteerNeeds: null,
    };
  }

  const showPlaybook = shouldAssignPlaybook(
    fields.communicationStrategy as CommunicationStrategy,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close create event"
        className="absolute inset-0 bg-[rgba(28,53,45,0.35)] backdrop-blur-[2px]"
        onClick={() => {
          if (!isPending) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(94vh,920px)] w-full max-w-[720px] flex-col overflow-hidden rounded-t-2xl border border-[#e6dfd5] bg-[#faf8f5] shadow-[0_28px_80px_rgba(28,53,45,0.22)] sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e6dfd5] bg-white px-6 py-5 sm:px-8">
          <div>
            <h2
              id={titleId}
              className="font-display text-3xl text-[#1c352d] sm:text-4xl"
            >
              Create Event
            </h2>
            <p className="mt-1 text-sm text-[#5e6b65]">
              Add the basics now. You can fine-tune everything after the event
              is created.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#5e6b65] transition hover:bg-[#f4f0ea] hover:text-[#1c352d]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form
          action={formAction}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-12 overflow-y-auto px-6 py-8 sm:px-8">
            {state.error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {state.error}
              </div>
            ) : null}

            <section className="space-y-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6efe9] text-sm font-bold text-[#5a7568]">
                  1
                </div>
                <h3 className="font-display text-2xl text-[#1c352d]">
                  Event basics
                </h3>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="create-event-title"
                  className="flex items-center gap-1 text-sm font-semibold text-[#1c352d]"
                >
                  Event title <span className="text-[#c5a880]">*</span>
                </label>
                <input
                  id="create-event-title"
                  name="title"
                  required
                  value={fields.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Fall Harvest Festival"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="create-event-date"
                    className="flex items-center gap-1 text-sm font-semibold text-[#1c352d]"
                  >
                    Event date <span className="text-[#c5a880]">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#c5a880]" />
                    <input
                      id="create-event-date"
                      name="date"
                      type="date"
                      required
                      value={fields.date}
                      onChange={(e) => updateField("date", e.target.value)}
                      className={cn(fieldClass, "pl-11")}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="create-event-time"
                    className="text-sm font-semibold text-[#1c352d]"
                  >
                    Event time{" "}
                    <span className="ml-1 font-normal text-[#5e6b65]/40">
                      (optional)
                    </span>
                  </label>
                  <div className="relative">
                    <Clock className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#c5a880]" />
                    <input
                      id="create-event-time"
                      name="time"
                      type="text"
                      placeholder="6p or 6:15 PM"
                      title={EVENT_TIME_INPUT_HINT}
                      value={fields.time}
                      onChange={(e) => updateField("time", e.target.value)}
                      className={cn(fieldClass, "pl-11")}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="create-event-location"
                  className="text-sm font-semibold text-[#1c352d]"
                >
                  Location{" "}
                  <span className="ml-1 font-normal text-[#5e6b65]/40">
                    (optional)
                  </span>
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#c5a880]" />
                  <input
                    id="create-event-location"
                    name="location"
                    value={fields.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="e.g. School Gymnasium"
                    className={cn(fieldClass, "pl-11")}
                  />
                </div>
              </div>

              <EventBriefDescriptionSection
                description={fields.description}
                onDescriptionChange={(value) =>
                  updateField("description", value)
                }
                getBriefInput={getBriefInput}
                disabled={isPending}
                required
                textareaId="create-event-description"
                hint="Tell us a little bit about this event. Generate turns rough notes into a short planning brief."
              />
            </section>

            <section className="space-y-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6efe9] text-sm font-bold text-[#5a7568]">
                  2
                </div>
                <h3 className="font-display text-2xl text-[#1c352d]">
                  How much communication do you need?
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {STRATEGY_CARDS.map((card) => {
                  const selected =
                    fields.communicationStrategy === card.value &&
                    !card.disabled;
                  const Icon = card.icon;
                  return (
                    <label
                      key={card.value}
                      className={cn(
                        "relative cursor-pointer",
                        card.disabled && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <input
                        type="radio"
                        name="communicationStrategy"
                        value={card.value}
                        checked={fields.communicationStrategy === card.value}
                        disabled={card.disabled || isPending}
                        onChange={() => {
                          if (!card.disabled) updateStrategy(card.value);
                        }}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          "flex h-full flex-col gap-2 rounded-2xl border-2 bg-white p-5 transition",
                          selected
                            ? "border-[#1c352d] shadow-[0_4px_12px_rgba(28,53,45,0.05)]"
                            : "border-[#e6dfd5] hover:border-[#c5a880]",
                          card.disabled &&
                            "border-[#e6dfd5]/50 bg-[#faf8f5]/50 hover:border-[#e6dfd5]/50",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <Icon
                            className={cn(
                              "h-6 w-6",
                              card.disabled
                                ? "text-[#5e6b65]/40"
                                : "text-[#c5a880]",
                            )}
                          />
                          {!card.disabled ? (
                            <span
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full border-2",
                                selected
                                  ? "border-[#1c352d]"
                                  : "border-[#e6dfd5]",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full bg-[#1c352d] transition",
                                  selected ? "opacity-100" : "opacity-0",
                                )}
                              />
                            </span>
                          ) : null}
                        </div>
                        <h4
                          className={cn(
                            "font-bold",
                            card.disabled
                              ? "text-[#5e6b65]"
                              : "text-[#1c352d]",
                          )}
                        >
                          {card.label}
                        </h4>
                        <p
                          className={cn(
                            "text-sm leading-relaxed",
                            card.disabled
                              ? "text-[#5e6b65]/60 italic"
                              : "text-[#5e6b65]",
                          )}
                        >
                          {card.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {showPlaybook ? (
                <div className="mt-2 space-y-3 border-t border-[#e6dfd5] pt-6">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="create-event-playbook"
                      className="text-sm font-semibold text-[#1c352d]"
                    >
                      Communication Plan
                    </label>
                    <p className="mb-2 text-xs text-[#5e6b65]">
                      Choose the plan that best matches this event.
                    </p>
                    {playbookOptions.length > 0 ? (
                      <select
                        id="create-event-playbook"
                        name="playbookId"
                        required
                        value={fields.playbookId}
                        onChange={(e) => selectPlaybook(e.target.value)}
                        className={fieldClass}
                      >
                        <option value="" disabled>
                          Select a plan...
                        </option>
                        {playbookOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex flex-col items-center gap-2 rounded-xl border border-[#e6dfd5] bg-[#faf8f5] p-4 text-center">
                        <p className="text-sm font-medium text-[#1c352d]">
                          No communication plans yet
                        </p>
                        <p className="text-xs text-[#5e6b65]">
                          Set up communication plans in Settings, or choose
                          Calendar only.
                        </p>
                        <Link
                          href="/settings/playbooks-milestones"
                          className="text-xs font-bold text-[#5a7568] hover:underline"
                        >
                          Go to Communication Plans
                        </Link>
                      </div>
                    )}
                    <input type="hidden" name="eventType" value={fields.eventType} />
                  </div>
                </div>
              ) : (
                <input type="hidden" name="eventType" value={fields.eventType} />
              )}
            </section>

            <section className="border-t border-[#e6dfd5] pt-6">
              <button
                type="button"
                onClick={() => setOptionalOpen((v) => !v)}
                className="group flex items-center gap-2 text-[#5e6b65] transition hover:text-[#1c352d]"
              >
                <span
                  className={cn(
                    "inline-block transition-transform",
                    optionalOpen && "rotate-90",
                  )}
                >
                  ▸
                </span>
                <span className="text-sm font-semibold tracking-wider uppercase">
                  Optional details
                </span>
              </button>

              {optionalOpen ? (
                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="create-event-audience"
                        className="text-sm font-semibold text-[#5e6b65]"
                      >
                        Audience
                      </label>
                      <select
                        id="create-event-audience"
                        name="audience"
                        value={fields.audience}
                        onChange={(e) =>
                          updateField("audience", e.target.value)
                        }
                        className={cn(fieldClass, "bg-white/50")}
                      >
                        <option value="">Select…</option>
                        {AUDIENCE_OPTIONS.filter(Boolean).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="create-event-theme"
                        className="text-sm font-semibold text-[#5e6b65]"
                      >
                        Theme
                      </label>
                      <select
                        id="create-event-theme"
                        name="theme"
                        value={fields.theme}
                        onChange={(e) => updateField("theme", e.target.value)}
                        className={cn(fieldClass, "bg-white/50")}
                      >
                        <option value="">Select…</option>
                        {THEME_OPTIONS.filter(Boolean).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#5e6b65]">
                      Status
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      {(
                        [
                          ["draft", "Draft"],
                          ["scheduled", "Scheduled"],
                          ["published", "Published"],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <input
                            type="radio"
                            name="status"
                            value={value}
                            checked={fields.status === value}
                            onChange={() => updateField("status", value)}
                            className="h-4 w-4 accent-[#8ea89d]"
                          />
                          <span className="text-sm text-[#1c352d]">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <input type="hidden" name="audience" value={fields.audience} />
                  <input type="hidden" name="theme" value={fields.theme} />
                  <input type="hidden" name="status" value={fields.status} />
                </>
              )}
            </section>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e6dfd5] bg-white px-6 py-5 sm:px-8">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#5e6b65] transition hover:text-[#1c352d]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-full bg-[#1c352d] px-6 py-3 text-xs font-bold tracking-widest text-white uppercase transition hover:bg-[#5e6b65] disabled:opacity-50"
            >
              {isPending ? (
                "Creating…"
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Create Event
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
