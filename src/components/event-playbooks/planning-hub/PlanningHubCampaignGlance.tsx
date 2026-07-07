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

function GlanceField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-cos-dark-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
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

  const inlineValueClass = "text-sm font-medium";

  return (
    <PlanningHubCard className="flex h-full flex-col p-5">
      <PlanningHubSectionTitle icon={Sun} title="Campaign at a Glance" />

      {showArtwork && artwork?.imageUrl && (
        <figure className="mt-4">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[12px] border border-cos-border bg-[#f7f6f3] shadow-[0_1px_2px_rgba(42,38,34,0.04)]">
            <Image
              src={artwork.imageUrl}
              alt={artwork.label ?? "Event artwork"}
              fill
              className="object-cover object-center"
              unoptimized
              priority
            />
          </div>
          <figcaption className="mt-2 flex items-center gap-1.5 text-xs font-medium text-cos-success-text">
            <span className="h-1.5 w-1.5 rounded-full bg-cos-success" />
            {artwork.caption ?? "Artwork ready"}
          </figcaption>
        </figure>
      )}

      <div className="mt-4 min-w-0">
        <dl className="grid grid-cols-2 gap-x-5 gap-y-3">
          <GlanceField label="Goal">
            <OverviewInlineText
              value={overview.goal}
              placeholder="Not set"
              valueClassName={inlineValueClass}
              onSave={async (goal) => saveField({ goal })}
            />
          </GlanceField>
          <GlanceField label="Audience">
            <OverviewInlineText
              value={overview.audience}
              placeholder="Not set"
              valueClassName={inlineValueClass}
              onSave={async (audience) => saveField({ audience })}
            />
          </GlanceField>
          <GlanceField label="Location">
            <OverviewInlineText
              value={overview.location}
              placeholder="Not set"
              valueClassName={inlineValueClass}
              onSave={async (location) => saveField({ location })}
            />
          </GlanceField>
          <GlanceField label="Event Type">
            <OverviewInlineSelect
              value={overview.eventType}
              options={EVENT_TYPES.map(({ value, label }) => ({ value, label }))}
              placeholder={EVENT_TYPE_LABELS[DEFAULT_EVENT_TYPE]}
              valueClassName={inlineValueClass}
              onSave={async (eventType) =>
                saveField({ eventType: eventType as EventType })
              }
            />
          </GlanceField>
        </dl>

        <div className="mt-3">
          <GlanceField label="Chair">
            {chairOptions.length > 0 ? (
              <OverviewInlineSelect
                value={chairValue}
                options={[{ value: "", label: "Unassigned" }, ...chairOptions]}
                placeholder="Unassigned"
                valueClassName={inlineValueClass}
                onSave={async (eventOwner) => {
                  await saveEventDetails({ eventOwner: eventOwner || null });
                }}
              />
            ) : (
              <OverviewInlineText
                value={event.eventOwner ?? ""}
                displayValue={chairDisplay}
                placeholder="Unassigned"
                valueClassName={inlineValueClass}
                onSave={async (eventOwner) => {
                  await saveEventDetails({ eventOwner: eventOwner || null });
                }}
              />
            )}
          </GlanceField>
        </div>

        <PlanningHubActionLink
          onClick={() => onNavigateTab("settings")}
          className="mt-3"
        >
          Assign lead →
        </PlanningHubActionLink>
      </div>
    </PlanningHubCard>
  );
}
