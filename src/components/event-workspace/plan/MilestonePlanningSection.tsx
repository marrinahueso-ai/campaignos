"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { MilestonePlanningEditor } from "@/components/event-workspace/plan/MilestonePlanningEditor";
import { MilestonePlanningRow } from "@/components/event-workspace/plan/MilestonePlanningRow";
import { MilestonePlanningSmartBanner } from "@/components/event-workspace/plan/MilestonePlanningSmartBanner";
import {
  applySuggestedTimes,
  createDefaultMilestone,
  milestoneItemsFromSteps,
  milestoneItemsToPlaybookSteps,
  MILESTONE_PLANNING_COLORS,
  suggestTimeline,
  type MilestonePlanningItem,
} from "@/components/event-workspace/plan/milestone-planning-utils";
import { updateEventCommunicationTimelineAction } from "@/lib/playbooks/actions";
import type { EventCommunicationStep } from "@/types/playbooks";

interface MilestonePlanningSectionProps {
  eventId: string;
  eventDate: string;
  assignedSteps: EventCommunicationStep[];
  onSaveReady?: (save: () => void, state: { isPending: boolean }) => void;
}

function reorderMilestones(
  items: MilestonePlanningItem[],
  fromIndex: number,
  toIndex: number,
): MilestonePlanningItem[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function MilestonePlanningSection({
  eventId,
  eventDate,
  assignedSteps,
  onSaveReady,
}: MilestonePlanningSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const initialItems = useMemo(
    () => milestoneItemsFromSteps(assignedSteps),
    [assignedSteps],
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

  const persistPlan = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const payload = milestoneItemsToPlaybookSteps(itemsRef.current, assignedSteps);
      const result = await updateEventCommunicationTimelineAction(eventId, payload);
      if (!result.success) {
        setError(result.error ?? "Unable to save plan.");
        return;
      }
      router.refresh();
    });
  }, [assignedSteps, eventId, router]);

  useEffect(() => {
    onSaveReady?.(persistPlan, { isPending });
  }, [isPending, onSaveReady, persistPlan]);

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
  }

  function deleteMilestone(relativeDay: number) {
    setItems((current) => current.filter((item) => item.relativeDay !== relativeDay));
    setExpandedRelativeDay(null);
    setEditorDraft(null);
  }

  function handleAddMilestone() {
    const next = createDefaultMilestone(items, eventDate);
    setItems((current) => [...current, next].sort((a, b) => a.relativeDay - b.relativeDay));
    setExpandedRelativeDay(next.relativeDay);
    setEditorDraft({ ...next });
  }

  function handleSuggestTimeline() {
    const suggested = suggestTimeline(items, eventDate);
    setItems(suggested);
    setExpandedRelativeDay(suggested[0]?.relativeDay ?? null);
    setEditorDraft(null);
  }

  function handleApplySuggestedTimes() {
    setItems((current) => applySuggestedTimes(current));
  }

  function handleDragEnd() {
    if (dragIndex != null && dragOverIndex != null) {
      setItems((current) => reorderMilestones(current, dragIndex, dragOverIndex));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium" style={{ color: MILESTONE_PLANNING_COLORS.text }}>
            Milestones
          </h2>
          <p className="mt-1 text-sm" style={{ color: "#7A7268" }}>
            Drag to reorder. Click a milestone to edit details.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAddMilestone}
            className="inline-flex h-9 items-center justify-center gap-1.5 border px-4 text-xs font-medium"
            style={{
              borderColor: MILESTONE_PLANNING_COLORS.border,
              color: MILESTONE_PLANNING_COLORS.text,
              backgroundColor: "#FFFFFF",
            }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add milestone
          </button>
          <button
            type="button"
            onClick={handleSuggestTimeline}
            className="inline-flex h-9 items-center justify-center gap-1.5 border px-4 text-xs font-medium"
            style={{
              borderColor: MILESTONE_PLANNING_COLORS.border,
              color: MILESTONE_PLANNING_COLORS.text,
              backgroundColor: "#FFFFFF",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Suggest timeline
          </button>
        </div>
      </div>

      <div
        className="mt-4 overflow-hidden border bg-white"
        style={{ borderColor: MILESTONE_PLANNING_COLORS.border }}
      >
        <div
          className="hidden border-b px-4 py-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em] sm:grid sm:grid-cols-[auto_1fr_0.7fr_1fr_auto_auto]"
          style={{ borderColor: MILESTONE_PLANNING_COLORS.border, color: "#7A7268" }}
        >
          <span aria-hidden className="w-4" />
          <span>Title / Description</span>
          <span>Content</span>
          <span>Timing</span>
          <span>Status</span>
          <span aria-hidden className="w-4" />
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm" style={{ color: "#7A7268" }}>
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
        <p className="mt-3 text-sm text-[#B42318]" role="alert">
          {error}
        </p>
      )}

      <MilestonePlanningSmartBanner onApplySuggestedTimes={handleApplySuggestedTimes} />
    </div>
  );
}
