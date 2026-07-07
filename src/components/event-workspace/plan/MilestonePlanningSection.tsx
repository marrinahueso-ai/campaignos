"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Plus, Sparkles } from "lucide-react";
import { MilestonePlanningContextSelectors } from "@/components/event-workspace/plan/MilestonePlanningContextSelectors";
import { MilestonePlanningEditor } from "@/components/event-workspace/plan/MilestonePlanningEditor";
import { MilestonePlanningRow } from "@/components/event-workspace/plan/MilestonePlanningRow";
import { MilestonePlanningSmartBanner } from "@/components/event-workspace/plan/MilestonePlanningSmartBanner";
import {
  applySuggestedTimes,
  createDefaultMilestone,
  enrichMilestoneItemsWithBundles,
  milestoneItemsFromSteps,
  milestoneItemsToPlaybookSteps,
  reorderMilestonesPreservingDays,
  suggestTimeline,
  type MilestonePlanningItem,
} from "@/components/event-workspace/plan/milestone-planning-utils";
import { updateEventCommunicationTimelineAction } from "@/lib/playbooks/actions";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";
import type { MilestonePlanningVpRoleOption } from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { Event } from "@/types";
import type { CommunicationPlaybook, EventCommunicationStep } from "@/types/playbooks";

interface MilestonePlanningSectionProps {
  event: Event;
  eventId: string;
  eventDate: string;
  assignedSteps: EventCommunicationStep[];
  metaPublishBundles?: MetaPublishBundle[];
  postingHeatmap?: PostingHeatmapData | null;
  playbookId: string;
  availablePlaybooks: CommunicationPlaybook[];
  vpRoles: MilestonePlanningVpRoleOption[];
  defaultVpRoleId: string;
  committeePersonOptions: string[];
  defaultCommitteePerson: string;
  onAddMilestoneReady?: (addMilestone: () => void) => void;
}

export function MilestonePlanningSection({
  event,
  eventId,
  eventDate,
  assignedSteps,
  metaPublishBundles = [],
  postingHeatmap = null,
  playbookId,
  availablePlaybooks,
  vpRoles,
  defaultVpRoleId,
  committeePersonOptions,
  defaultCommitteePerson,
  onAddMilestoneReady,
}: MilestonePlanningSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const baseItems = useMemo(
    () => milestoneItemsFromSteps(assignedSteps),
    [assignedSteps],
  );
  const initialItems = useMemo(
    () => enrichMilestoneItemsWithBundles(baseItems, metaPublishBundles),
    [baseItems, metaPublishBundles],
  );
  const [items, setItems] = useState<MilestonePlanningItem[]>(initialItems);
  const [expandedRelativeDay, setExpandedRelativeDay] = useState<number | null>(
    initialItems[0]?.relativeDay ?? null,
  );
  const [editorDraft, setEditorDraft] = useState<MilestonePlanningItem | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    setItems(initialItems);
    setExpandedRelativeDay(initialItems[0]?.relativeDay ?? null);
    setEditorDraft(null);
  }, [initialItems]);

  const persistPlan = useCallback(
    (nextItems?: MilestonePlanningItem[]) => {
      const payloadItems = nextItems ?? itemsRef.current;
      itemsRef.current = payloadItems;
      setError(null);
      startTransition(async () => {
        const payload = milestoneItemsToPlaybookSteps(payloadItems, assignedSteps);
        const result = await updateEventCommunicationTimelineAction(eventId, payload);
        if (!result.success) {
          setError(result.error ?? "Unable to save plan.");
          return;
        }
        router.refresh();
      });
    },
    [assignedSteps, eventId, router],
  );

  function openEditor(relativeDay: number) {
    const milestone = items.find((item) => item.relativeDay === relativeDay);
    if (!milestone) {
      return;
    }
    setExpandedRelativeDay(relativeDay);
    setEditorDraft({ ...milestone });
  }

  function closeEditor() {
    setEditorDraft(null);
  }

  function saveEditorChanges() {
    if (!editorDraft) {
      return;
    }
    setItems((current) =>
      current.map((item) =>
        item.relativeDay === editorDraft.relativeDay ? editorDraft : item,
      ),
    );
    setEditorDraft(null);
    persistPlan();
  }

  function deleteMilestone(relativeDay: number) {
    setItems((current) => current.filter((item) => item.relativeDay !== relativeDay));
    setExpandedRelativeDay(null);
    setEditorDraft(null);
    persistPlan();
  }

  const handleAddMilestone = useCallback(() => {
    setItems((current) => {
      const next = createDefaultMilestone(current, eventDate);
      setExpandedRelativeDay(next.relativeDay);
      setEditorDraft({ ...next });
      return [...current, next].sort((a, b) => a.relativeDay - b.relativeDay);
    });
  }, [eventDate]);

  useEffect(() => {
    onAddMilestoneReady?.(handleAddMilestone);
  }, [handleAddMilestone, onAddMilestoneReady]);

  function handleSuggestTimeline() {
    const suggested = suggestTimeline(items, eventDate, postingHeatmap);
    setItems(suggested);
    itemsRef.current = suggested;
    setExpandedRelativeDay(suggested[0]?.relativeDay ?? null);
    setEditorDraft(null);
    persistPlan(suggested);
  }

  function handleApplySuggestedTimes() {
    const nextItems = applySuggestedTimes(items, postingHeatmap);
    setItems(nextItems);
    itemsRef.current = nextItems;
    persistPlan(nextItems);
  }

  function handleDragEnd() {
    if (dragIndex != null && dragOverIndex != null && dragIndex !== dragOverIndex) {
      const nextItems = reorderMilestonesPreservingDays(
        items,
        dragIndex,
        dragOverIndex,
        eventDate,
      );
      setItems(nextItems);
      itemsRef.current = nextItems;
      setExpandedRelativeDay(null);
      setEditorDraft(null);
      persistPlan(nextItems);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div className="border border-cos-border bg-cos-card">
      <div className="flex flex-col gap-4 border-b border-cos-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cos-warning text-cos-accent">
            <Megaphone className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl text-cos-text">Milestone planning</h2>
            <p className="mt-1 text-sm leading-relaxed text-cos-muted">
              Define your posting milestones for Facebook and Instagram. Drag to reorder,
              edit times, and choose platforms.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSuggestTimeline}
            disabled={isPending}
            className="inline-flex h-9 items-center justify-center gap-1.5 border border-cos-border bg-cos-card px-4 text-xs font-medium text-cos-text transition-colors hover:bg-cos-bg disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Suggest timeline
          </button>
          <button
            type="button"
            onClick={handleAddMilestone}
            disabled={isPending}
            className="inline-flex h-9 items-center justify-center gap-1.5 bg-cos-text px-4 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add milestone
          </button>
        </div>
      </div>

      <MilestonePlanningContextSelectors
        event={event}
        playbookId={playbookId}
        availablePlaybooks={availablePlaybooks}
        vpRoles={vpRoles}
        defaultVpRoleId={defaultVpRoleId}
        committeePersonOptions={committeePersonOptions}
        defaultCommitteePerson={defaultCommitteePerson}
        layout="inline"
        committeeLabel="Committee"
        idPrefix="milestone-planning"
        className="border-b border-cos-border px-4 py-3 sm:px-5"
      />

      <div>
        <div className="hidden border-b border-cos-border px-4 py-2.5 text-[0.6875rem] font-medium tracking-[0.12em] text-cos-muted uppercase sm:grid sm:grid-cols-[auto_1fr_0.85fr_1fr_auto_auto]">
          <span aria-hidden className="w-4" />
          <span>Milestone</span>
          <span>Platform</span>
          <span>Date &amp; Time</span>
          <span>Status</span>
          <span aria-hidden className="w-4" />
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-cos-muted">
            No milestones yet. Add one or use Suggest timeline to get started.
          </div>
        ) : (
          items.map((milestone, index) => {
            const isExpanded = expandedRelativeDay === milestone.relativeDay;
            const draft = isExpanded ? editorDraft : null;

            return (
              <div key={milestone.relativeDay}>
                <MilestonePlanningRow
                  milestone={milestone}
                  index={index}
                  isExpanded={isExpanded}
                  isDragging={dragIndex === index}
                  isDragOver={dragOverIndex === index}
                  onToggleExpand={() => {
                    if (isExpanded && editorDraft) {
                      closeEditor();
                      return;
                    }
                    openEditor(milestone.relativeDay);
                  }}
                  onDragStart={() => setDragIndex(index)}
                  onDragEnter={() => setDragOverIndex(index)}
                  onDragEnd={handleDragEnd}
                />
                {isExpanded && draft && (
                  <MilestonePlanningEditor
                    milestone={draft}
                    eventDate={eventDate}
                    onChange={(patch) => {
                      setEditorDraft((current) => {
                        if (!current) {
                          return current;
                        }
                        if (patch.relativeDay != null) {
                          setExpandedRelativeDay(patch.relativeDay);
                        }
                        return { ...current, ...patch };
                      });
                    }}
                    onDelete={() => deleteMilestone(milestone.relativeDay)}
                    onCancel={closeEditor}
                    onSave={saveEditorChanges}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {error && (
        <p className="px-4 py-3 text-sm text-cos-error" role="alert">
          {error}
        </p>
      )}

      <MilestonePlanningSmartBanner
        postingHeatmap={postingHeatmap}
        onApplySuggestedTimes={handleApplySuggestedTimes}
      />
    </div>
  );
}
