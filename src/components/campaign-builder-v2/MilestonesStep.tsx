"use client";

import { useMemo, useState } from "react";
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
import {
  MilestoneEditorModal,
  readMilestoneEditorPatch,
} from "@/components/campaign-builder-v2/MilestoneEditorModal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

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
    generateAllContent,
    isGeneratingContent,
  } = useCampaignBuilder();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

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

  async function handleGenerateContent() {
    setGenerateError(null);

    try {
      if (editingMilestone) {
        const form = document.getElementById(
          "milestone-editor-form",
        ) as HTMLFormElement | null;
        if (form) {
          const patch = readMilestoneEditorPatch(form);
          const result = await generateAllContent({
            id: editingMilestone.id,
            ...patch,
          });
          setEditingId(null);
          if (!result.success) {
            setGenerateError(result.message);
          }
          return;
        }
      }

      const result = await generateAllContent();
      if (!result.success) {
        setGenerateError(result.message);
      }
    } catch (error) {
      setGenerateError(
        error instanceof Error
          ? error.message
          : "Could not generate artwork and captions.",
      );
    }
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
            <h1 className="font-display text-4xl text-cos-text">Milestones</h1>
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
                    onEdit={setEditingId}
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
              pencil icon to edit artwork and caption notes.
            </p>
          </section>

          {generateError && (
            <p
              className="rounded border border-cos-warning/40 bg-cos-warning/10 px-4 py-3 text-sm text-cos-warning-text"
              role="alert"
            >
              {generateError}
            </p>
          )}

          {isGeneratingContent && (
            <p className="text-center text-sm text-cos-muted">
              Generating artwork and captions…
            </p>
          )}
        </div>
      </div>

      <CampaignBuilderFooter
        onBack={() => goToStep("inspiration")}
        onContinue={handleGenerateContent}
        continueLabel={
          isGeneratingContent
            ? "Generating artwork and captions…"
            : "Generate Content"
        }
        continueDisabled={milestones.length === 0 || isGeneratingContent}
        continueLoading={isGeneratingContent}
      />

      {editingMilestone && (
        <MilestoneEditorModal
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
