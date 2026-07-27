"use client";

import { useActionState, useEffect, useState } from "react";
import { createEvent } from "@/lib/events/actions";
import {
  type CreateEventFields,
  type CreateEventFormState,
} from "@/lib/events/create-event-form-state";
import { DEFAULT_EVENT_TYPE, SYSTEM_PLAYBOOK_IDS } from "@/lib/playbooks/constants";
import type { EventType } from "@/types/playbooks";
import { OnboardingEaseStepMeter } from "@/components/onboarding/OnboardingEaseStepMeter";
import { cn } from "@/lib/utils/cn";

export interface OnboardingCreateEventPlaybookOption {
  id: string;
  name: string;
  eventType: EventType;
}

interface OnboardingCreateEventEaseProps {
  organizationName: string;
  playbookOptions: OnboardingCreateEventPlaybookOption[];
}

function defaultPlaybookId(
  options: OnboardingCreateEventPlaybookOption[],
): string {
  const general =
    options.find((option) => option.id === SYSTEM_PLAYBOOK_IDS.general_event) ??
    options.find((option) => option.eventType === "general_event") ??
    options[0];
  return general?.id ?? "";
}

function buildDefaultFields(
  playbookOptions: OnboardingCreateEventPlaybookOption[],
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
  "w-full rounded-[14px] border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-3.5 py-3 text-[15px] text-[#2a2622] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#7a7166]/70 focus:border-[rgba(47,74,60,0.45)] focus:shadow-[0_0_0_3px_rgba(47,74,60,0.1)]";

/**
 * First-time setup page 1 — Create your first event.
 * Exact Ease look from `public/onboarding-setup-ease-mockup.html?view=event`.
 */
export function OnboardingCreateEventEase({
  organizationName,
  playbookOptions,
}: OnboardingCreateEventEaseProps) {
  const [fields, setFields] = useState<CreateEventFields>(() =>
    buildDefaultFields(playbookOptions),
  );
  const [state, formAction, isPending] = useActionState(
    createEvent,
    initialState,
  );

  useEffect(() => {
    if (state.fields) {
      setFields(state.fields);
    }
  }, [state.fields]);

  function updateField<K extends keyof CreateEventFields>(
    field: K,
    value: CreateEventFields[K],
  ) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  const orgLabel = organizationName.trim() || "your organization";

  return (
    <div
      className={cn(
        "-mx-4 -my-8 min-h-[calc(100vh-4rem)] px-5 pb-16 pt-5",
        "lg:-mx-8 lg:-my-10 lg:px-5",
        "bg-[radial-gradient(ellipse_80%_50%_at_10%_-10%,rgba(107,129,113,0.14),transparent_55%),radial-gradient(ellipse_60%_40%_at_90%_0%,rgba(196,146,46,0.11),transparent_50%),radial-gradient(ellipse_50%_35%_at_50%_100%,rgba(42,122,134,0.07),transparent_55%),#f6f2eb]",
      )}
      data-onboarding-ease="event"
    >
      <div className="mx-auto flex min-h-[56vh] max-w-[480px] flex-col justify-center">
        <OnboardingEaseStepMeter step={1} />

        <p className="mb-1 inline-flex items-center gap-1.5 text-[13px] text-[#5c554c]">
          Setting up <strong className="font-bold text-[#2a2622]">{orgLabel}</strong>
        </p>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-[#6b8171]">
          Welcome to Hey Ralli
        </p>
        <h1
          className="m-0 text-[clamp(32px,5vw,42px)] font-semibold leading-[1.08] tracking-[-0.02em] text-[#2a2622]"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Create your first event
        </h1>
        <p className="mt-2.5 max-w-[46ch] text-[15px] leading-normal text-[#5c554c]">
          Title and date are enough. Calendar, brand, team, and Meta can wait —
          everything after this is skippable.
        </p>

        <form
          action={formAction}
          className="mt-[26px] rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] p-[22px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
        >
          <input type="hidden" name="onboarding" value="1" />
          <input type="hidden" name="communicationStrategy" value="full_campaign" />
          <input type="hidden" name="playbookId" value={fields.playbookId} />
          <input type="hidden" name="eventType" value={fields.eventType} />
          <input type="hidden" name="status" value="draft" />
          <input
            type="hidden"
            name="description"
            value={
              fields.description.trim() ||
              "Created during Get started — add details anytime."
            }
          />

          {state.error ? (
            <div
              role="alert"
              className="mb-4 rounded-[14px] border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              {state.error}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="onboarding-event-title"
              className="mb-1.5 block text-[13px] font-semibold text-[#2a2622]"
            >
              Event title
            </label>
            <input
              id="onboarding-event-title"
              name="title"
              type="text"
              autoComplete="off"
              required
              placeholder="Fall Festival"
              value={fields.title}
              onChange={(event) => updateField("title", event.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="onboarding-event-date"
                className="mb-1.5 block text-[13px] font-semibold text-[#2a2622]"
              >
                Event date
              </label>
              <input
                id="onboarding-event-date"
                name="date"
                type="date"
                required
                value={fields.date}
                onChange={(event) => updateField("date", event.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label
                htmlFor="onboarding-event-time"
                className="mb-1.5 block text-[13px] font-semibold text-[#2a2622]"
              >
                Time <span className="font-medium text-[#7a7166]">(optional)</span>
              </label>
              <input
                id="onboarding-event-time"
                name="time"
                type="text"
                autoComplete="off"
                placeholder="10:00 AM"
                value={fields.time}
                onChange={(event) => updateField("time", event.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#2a2622] px-[22px] py-3.5 text-[15px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Creating…" : "Save & continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
