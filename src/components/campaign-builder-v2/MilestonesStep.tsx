"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Sparkles } from "lucide-react";
import { useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { CampaignBuilderFooter } from "@/components/campaign-builder-v2/CampaignBuilderFooter";
import { CampaignBuilderMilestoneRow } from "@/components/campaign-builder-v2/CampaignBuilderMilestoneRow";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const MilestoneEditorModal = dynamic(
  () =>
    import("@/components/campaign-builder-v2/MilestoneEditorModal").then(
      (module) => ({
        default: module.MilestoneEditorModal,
      }),
    ),
  { ssr: false },
);

const ROW_GRID =
  "grid items-center gap-x-4 gap-y-2 px-4 py-4 sm:grid-cols-[2rem_2rem_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto_7rem]";

export function MilestonesStep() {
  const {
    session,
    addMilestone,
    goToStep,
    reorderMilestones,
    moveMilestone,
    updateMilestone,
    removeMilestone,
    duplicateMilestone,
    suggestMilestones,
    generateMilestoneContent,
    generatingMilestoneId,
    setSelectedMilestoneId,
  } = useCampaignBuilder();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const milestones = useMemo(
    () => [...session.milestones].sort((a, b) => a.sortOrder - b.sortOrder),
    [session.milestones],
  );
  const milestoneIds = useMemo(
    () => milestones.map((milestone) => milestone.id),
    [milestones],
  );
  const editingMilestone = milestones.find((m) => m.id === editingId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleSuggestMilestones() {
    setIsSuggesting(true);
    try {
      await suggestMilestones();
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleGenerateMilestone(milestoneId: string) {
    setSelectedMilestoneId(milestoneId);
    goToStep("preview");
    await generateMilestoneContent(milestoneId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const fromIndex = milestones.findIndex((milestone) => milestone.id === active.id);
    const toIndex = milestones.findIndex((milestone) => milestone.id === over.id);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
      return;
    }

    reorderMilestones(fromIndex, toIndex);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-8">
        <div className="studio-page space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-4xl text-cos-text">Milestones</h1>
              <p className="mt-1 text-sm text-cos-muted">
                Plan your campaign milestones, then generate content one at a time in
                Preview.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSuggestMilestones}
                disabled={isSuggesting}
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                {isSuggesting ? "Suggesting…" : "Suggest milestones"}
              </Button>
              <Button variant="secondary" size="sm" onClick={addMilestone}>
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                Add milestone
              </Button>
            </div>
          </header>

          <div className="cos-card !p-0 overflow-hidden">
            <div
              className={cn(
                ROW_GRID,
                "hidden border-b border-cos-border py-3 text-xs font-semibold uppercase tracking-wide text-cos-muted sm:grid",
              )}
            >
              <span aria-hidden />
              <span>#</span>
              <span>Milestone</span>
              <span>Purpose</span>
              <span>Suggested date</span>
              <span>Platforms</span>
              <span>Actions</span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={milestoneIds}
                strategy={verticalListSortingStrategy}
              >
                {milestones.map((milestone, index) => (
                  <CampaignBuilderMilestoneRow
                    key={milestone.id}
                    milestone={milestone}
                    index={index}
                    menuOpenId={menuOpenId}
                    isGenerating={generatingMilestoneId === milestone.id}
                    onEdit={setEditingId}
                    onGenerate={(id) => void handleGenerateMilestone(id)}
                    onToggleMenu={(id) =>
                      setMenuOpenId(menuOpenId === id ? null : id)
                    }
                    onDuplicate={(id) => {
                      duplicateMilestone(id);
                      setMenuOpenId(null);
                    }}
                    onMoveUp={(id) => {
                      moveMilestone(id, "up");
                      setMenuOpenId(null);
                    }}
                    onMoveDown={(id) => {
                      moveMilestone(id, "down");
                      setMenuOpenId(null);
                    }}
                    onDelete={(id) => {
                      removeMilestone(id);
                      setMenuOpenId(null);
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <button
            type="button"
            onClick={addMilestone}
            className="flex w-full items-center justify-center border border-dashed border-cos-border bg-cos-bg/20 px-4 py-3 text-sm font-medium text-cos-muted transition-colors hover:border-cos-accent hover:text-cos-text"
          >
            + Add another milestone
          </button>

          <section className="cos-card space-y-2">
            <h2 className="font-display text-lg text-cos-text">
              AI guidance per milestone
            </h2>
            <p className="text-sm text-cos-muted">
              Add specific instructions for the AI for each milestone. Use the
              pencil icon to edit artwork and caption notes, or the sparkle icon
              to generate content for one milestone at a time in Preview.
            </p>
          </section>
        </div>
      </div>

      <CampaignBuilderFooter
        onBack={() => goToStep("inspiration")}
        onContinue={() => goToStep("preview")}
        continueLabel="Continue to Preview"
        continueDisabled={milestones.length === 0}
      />

      {editingMilestone && (
        <MilestoneEditorModal
          // Force a full remount per milestone: the form fields below are
          // uncontrolled (defaultValue), so without a key React would keep
          // showing the previous milestone's artwork/caption notes if the
          // edited milestone ever changed while the modal stayed mounted.
          key={editingMilestone.id}
          milestone={editingMilestone}
          onClose={() => setEditingId(null)}
          onSave={(patch) => updateMilestone(editingMilestone.id, patch)}
          onDelete={() => {
            removeMilestone(editingMilestone.id);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}
