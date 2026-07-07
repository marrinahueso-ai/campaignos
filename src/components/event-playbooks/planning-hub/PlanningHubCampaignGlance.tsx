"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Image from "next/image";
import { Sun } from "lucide-react";
import {
  OverviewInlineSelect,
  OverviewInlineText,
} from "@/components/event-playbooks/OverviewInlineFields";
import {
  PlanningHubActionLink,
  PlanningHubCard,
  PlanningHubSectionTitle,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import { buildPlanningOverviewFromEvent } from "@/lib/event-playbooks/build-planning-overview-state";
import { saveEventPlanningOverviewAction } from "@/lib/event-playbooks/planning-actions";
import {
  buildEventDetailsFormState,
  normalizeEventDetailsInput,
} from "@/lib/event-workspace/event-form-utils";
import { updateEventDetailsAction } from "@/lib/event-workspace/actions";
import { withCommitteePersonOption } from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import {
  DEFAULT_EVENT_TYPE,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
} from "@/lib/playbooks/constants";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { Event } from "@/types";
import type { EventType } from "@/types/playbooks";

interface PlanningHubCampaignGlanceProps {
  event: Event;
  ownership: EventRosterOwnership | null;
  artwork: HeroArtworkSelection | null;
  committeePersonOptions?: string[];
  defaultCommitteePerson?: string;
  onNavigateTab: (tab: EventPlaybookTab) => void;
}

function formatChairDisplay(
  event: Event,
  ownership: EventRosterOwnership | null,
): string {
  const owner = event.eventOwner?.trim();
  if (owner) {
    return owner;
  }
  if (ownership?.chairNames.length) {
    return ownership.chairNames.join(", ");
  }
  return "Unassigned";
}

export function PlanningHubCampaignGlance({
  event,
  ownership,
  artwork,
  committeePersonOptions = [],
  defaultCommitteePerson = "",
  onNavigateTab,
}: PlanningHubCampaignGlanceProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const overview = buildPlanningOverviewFromEvent(event);
  const showArtwork = hasDisplayableArtwork(artwork);
  const chairValue = event.eventOwner?.trim() ?? "";
  const chairDisplay = formatChairDisplay(event, ownership);

  const chairOptions = withCommitteePersonOption(
    [
      ...committeePersonOptions,
      ...(defaultCommitteePerson ? [defaultCommitteePerson] : []),
      ...(ownership?.chairNames ?? []),
    ].filter((name, index, all) => all.indexOf(name) === index),
    chairValue,
  ).map((name) => ({ value: name, label: name }));

  function refreshAfterSave() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function saveField(
    patch: Partial<ReturnType<typeof buildPlanningOverviewFromEvent>>,
  ) {
    const result = await saveEventPlanningOverviewAction(event.id, {
      ...overview,
      ...patch,
    });
    if (result.success) {
      refreshAfterSave();
    }
  }

  async function saveEventDetails(
    patch: Partial<ReturnType<typeof buildEventDetailsFormState>>,
  ) {
    const merged = { ...buildEventDetailsFormState(event), ...patch };
    const normalized = normalizeEventDetailsInput(merged);
    if ("error" in normalized) {
      return;
    }
    const result = await updateEventDetailsAction(event.id, normalized);
    if (result.success) {
      refreshAfterSave();
    }
  }

  const fields = [
    {
      label: "Goal",
      content: (
        <OverviewInlineText
          value={overview.goal}
          placeholder="Not set"
          valueClassName="text-sm font-medium text-[#2a2622]"
          onSave={async (goal) => saveField({ goal })}
        />
      ),
    },
    {
      label: "Audience",
      content: (
        <OverviewInlineText
          value={overview.audience}
          placeholder="Not set"
          valueClassName="text-sm font-medium text-[#2a2622]"
          onSave={async (audience) => saveField({ audience })}
        />
      ),
    },
    {
      label: "Location",
      content: (
        <OverviewInlineText
          value={overview.location}
          placeholder="Not set"
          valueClassName="text-sm font-medium text-[#2a2622]"
          onSave={async (location) => saveField({ location })}
        />
      ),
    },
    {
      label: "Event Type",
      content: (
        <OverviewInlineSelect
          value={overview.eventType}
          options={EVENT_TYPES.map(({ value, label }) => ({ value, label }))}
          placeholder={EVENT_TYPE_LABELS[DEFAULT_EVENT_TYPE]}
          valueClassName="text-sm font-medium text-[#2a2622]"
          onSave={async (eventType) =>
            saveField({ eventType: eventType as EventType })
          }
        />
      ),
    },
    {
      label: "Chair",
      content:
        chairOptions.length > 0 ? (
          <OverviewInlineSelect
            value={chairValue}
            options={[{ value: "", label: "Unassigned" }, ...chairOptions]}
            placeholder="Unassigned"
            valueClassName="text-sm font-medium text-[#2a2622]"
            onSave={async (eventOwner) => {
              await saveEventDetails({ eventOwner: eventOwner || null });
            }}
          />
        ) : (
          <OverviewInlineText
            value={event.eventOwner ?? ""}
            displayValue={chairDisplay}
            placeholder="Unassigned"
            valueClassName="text-sm font-medium text-[#2a2622]"
            onSave={async (eventOwner) => {
              await saveEventDetails({ eventOwner: eventOwner || null });
            }}
          />
        ),
    },
  ];

  return (
    <PlanningHubCard className="flex h-full flex-col p-5">
      <PlanningHubSectionTitle icon={Sun} title="Campaign at a Glance" />

      <div className="mt-4 flex flex-1 flex-col gap-4 sm:flex-row">
        <dl className="min-w-0 flex-1 space-y-3">
          {fields.map(({ label, content }) => (
            <div key={label}>
              <dt className="text-[10px] font-semibold tracking-[0.12em] text-[#a89f94] uppercase">
                {label}
              </dt>
              <dd className="mt-0.5">{content}</dd>
            </div>
          ))}
        </dl>

        {showArtwork && artwork?.imageUrl && (
          <div className="shrink-0 sm:w-28">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-[#e8e0d4]">
              <Image
                src={artwork.imageUrl}
                alt={artwork.label ?? "Event artwork"}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#3d7a4a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5a9e6f]" />
              {artwork.caption ?? "Artwork ready"}
            </p>
          </div>
        )}
      </div>

      <PlanningHubActionLink
        onClick={() => onNavigateTab("settings")}
        className="mt-4"
      >
        Assign lead →
      </PlanningHubActionLink>
    </PlanningHubCard>
  );
}
