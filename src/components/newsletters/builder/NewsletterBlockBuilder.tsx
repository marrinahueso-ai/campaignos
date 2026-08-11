"use client";

import { BlockSettingsPanel } from "@/components/newsletters/builder/BlockSettingsPanel";
import { CanvasBlockFrame } from "@/components/newsletters/builder/CanvasBlockFrame";
import { EventPickerModal } from "@/components/newsletters/builder/EventPickerModal";
import { uploadNewsletterComposerArtworkAction } from "@/lib/newsletter-composer/artwork-actions";
import {
  buildBlocksFromEventSelection,
  buildInitialState,
  duplicateCanvasBlock,
  ensureStoriesForEvents,
  insertCanvasBlockAfter,
  insertCanvasBlocksAfter,
  newCanvasBlock,
  normalizeComposerState,
} from "@/lib/newsletter-composer/defaults";
import type {
  NewsletterCanvasBlock,
  NewsletterCanvasBlockKind,
  NewsletterComposerEvent,
  NewsletterComposerState,
  NewsletterEventInsertLayout,
} from "@/lib/newsletter-composer/types";
import {
  saveDraft as saveNewsletterDraftAction,
} from "@/lib/newsletter/actions";
import type { NewsletterStatus } from "@/lib/newsletter/types";
import { cn } from "@/lib/utils/cn";
import {
  AlignLeft,
  ArrowLeft,
  Award,
  CalendarDays,
  Columns2,
  GalleryHorizontal,
  Heading1,
  HeartHandshake,
  Image as ImageIcon,
  LayoutGrid,
  List,
  MessageSquare,
  Minus,
  Palette,
  RotateCcw,
  SeparatorHorizontal,
  ToggleRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

type EventPickerState =
  | { mode: "add" }
  | { mode: "replace"; blockId: string }
  | {
      mode: "convert";
      blockId: string;
      layout: NewsletterEventInsertLayout;
      seedEventIds: string[];
    };

type Props = {
  organizationId: string | null;
  organizationName: string | null;
  events: NewsletterComposerEvent[];
  initialNewsletterId?: string | null;
  initialComposerState?: NewsletterComposerState | null;
  status?: NewsletterStatus;
  changeRequestNote?: string | null;
};

type PaletteItem = {
  kind: NewsletterCanvasBlockKind | "event-picker";
  label: string;
  icon: typeof CalendarDays;
};

const HEY_RALLI_ITEMS: PaletteItem[] = [
  { kind: "event-picker", label: "Event", icon: CalendarDays },
  { kind: "calendar", label: "Upcoming", icon: List },
  { kind: "volunteer", label: "Volunteer", icon: HeartHandshake },
  { kind: "image", label: "Artwork", icon: Palette },
  { kind: "sponsors", label: "Sponsor", icon: Award },
];

const ADD_YOUR_OWN_ITEMS: PaletteItem[] = [
  { kind: "heading", label: "Heading", icon: Heading1 },
  { kind: "text", label: "Text", icon: AlignLeft },
  { kind: "image", label: "Image", icon: ImageIcon },
  { kind: "button", label: "Button", icon: ToggleRight },
  { kind: "textImage", label: "Text + Image", icon: Columns2 },
  { kind: "columns", label: "2/3 Column", icon: Columns2 },
  { kind: "grid", label: "Grid", icon: LayoutGrid },
  { kind: "carousel", label: "Carousel", icon: GalleryHorizontal },
  { kind: "list", label: "List", icon: List },
  { kind: "divider", label: "Divider", icon: Minus },
  { kind: "spacer", label: "Spacer", icon: SeparatorHorizontal },
  { kind: "footer", label: "Footer", icon: MessageSquare },
];

export function NewsletterBlockBuilder({
  organizationId,
  organizationName,
  events,
  initialNewsletterId = null,
  initialComposerState = null,
  status = "draft",
  changeRequestNote = null,
}: Props) {
  const router = useRouter();

  const [state, setState] = useState<NewsletterComposerState>(() =>
    initialComposerState
      ? normalizeComposerState(initialComposerState, organizationName, events)
      : buildInitialState(organizationName, events),
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [eventPicker, setEventPicker] = useState<EventPickerState | null>(null);
  const [saveLabel, setSaveLabel] = useState<string>("");
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const selectedBlockIdRef = useRef<string | null>(selectedBlockId);
  selectedBlockIdRef.current = selectedBlockId;
  const newsletterIdRef = useRef(initialNewsletterId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const canvasScrollRef = useRef<HTMLElement | null>(null);

  const canvasBlocks = state.canvasBlocks ?? [];
  const selectedBlock = canvasBlocks.find((b) => b.id === selectedBlockId) ?? null;

  const eventPickerCurrentEventId = (() => {
    if (!eventPicker || eventPicker.mode !== "replace") return null;
    const targetBlock = canvasBlocks.find((b) => b.id === eventPicker.blockId);
    if (!targetBlock?.storyId) return null;
    return state.stories.find((s) => s.id === targetBlock.storyId)?.eventId ?? null;
  })();

  const eventPickerSeedIds =
    eventPicker?.mode === "convert" ? eventPicker.seedEventIds : undefined;
  const eventPickerInitialLayout =
    eventPicker?.mode === "convert" ? eventPicker.layout : "card";
  const eventPickerMulti =
    eventPicker?.mode === "add" || eventPicker?.mode === "convert";

  const setNewsletterId = useCallback(
    (id: string) => {
      newsletterIdRef.current = id;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        params.set("newsletterId", id);
        router.replace(`/newsletter-composer?${params.toString()}`, { scroll: false });
      }
    },
    [router],
  );

  const patch = useCallback(
    (fn: (prev: NewsletterComposerState) => NewsletterComposerState) => {
      setState((prev) => fn(prev));
    },
    [],
  );

  const patchSelectedBlock = useCallback(
    (fn: (b: NewsletterCanvasBlock) => Partial<NewsletterCanvasBlock>) => {
      if (!selectedBlockId) return;
      patch((prev) => ({
        ...prev,
        canvasBlocks: (prev.canvasBlocks ?? []).map((b) =>
          b.id === selectedBlockId ? { ...b, ...fn(b) } : b,
        ),
      }));
    },
    [patch, selectedBlockId],
  );

  const flushDraft = useCallback(async () => {
    if (!organizationId) {
      setSaveLabel("Sign in to save");
      return;
    }
    const snapshot = stateRef.current;
    setSaveLabel("Saving…");
    try {
      const result = await saveNewsletterDraftAction({
        newsletterId: newsletterIdRef.current,
        fields: {
          title: snapshot.issueName?.trim() || snapshot.subject?.trim() || "Untitled newsletter",
          subject: snapshot.subject,
          fromDisplayName: snapshot.fromName,
          composerState: snapshot,
        },
      });
      if (!result.ok) {
        setSaveLabel(result.error || "Could not save");
        return;
      }
      if (!newsletterIdRef.current) {
        setNewsletterId(result.newsletterId);
      }
      setSaveLabel("Saved");
    } catch {
      setSaveLabel("Could not save");
    }
  }, [organizationId, setNewsletterId]);

  // Debounced autosave.
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveLabel("Saving…");
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushDraft();
    }, 600);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    const onLeave = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void flushDraft();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onLeave();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [flushDraft]);

  async function uploadImage(dataUrl: string, assetId: string): Promise<string | null> {
    const uploaded = await uploadNewsletterComposerArtworkAction({ assetId, dataUrl });
    if (!uploaded.success || !uploaded.url) {
      window.alert(uploaded.error || "Upload failed.");
      return null;
    }
    return uploaded.url;
  }

  function selectBlock(blockId: string) {
    selectedBlockIdRef.current = blockId;
    setSelectedBlockId(blockId);
  }

  function insertBlock(kind: NewsletterCanvasBlockKind) {
    const block = newCanvasBlock(kind);
    // Read from ref so palette clicks never use a stale selection
    // (React Compiler / memoized handlers can otherwise append at end).
    const afterId = selectedBlockIdRef.current;
    patch((prev) => ({
      ...prev,
      canvasBlocks: insertCanvasBlockAfter(
        prev.canvasBlocks ?? [],
        block,
        afterId,
      ),
    }));
    selectBlock(block.id);
    requestAnimationFrame(() => {
      const el = canvasScrollRef.current?.querySelector(
        `[data-canvas-block-id="${CSS.escape(block.id)}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function handlePaletteClick(kind: NewsletterCanvasBlockKind | "event-picker") {
    if (kind === "event-picker") {
      setEventPicker({ mode: "add" });
      return;
    }
    insertBlock(kind);
  }

  function scrollToBlock(blockId: string) {
    requestAnimationFrame(() => {
      const el = canvasScrollRef.current?.querySelector(
        `[data-canvas-block-id="${CSS.escape(blockId)}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  /** Change-event on an existing single event block (single pick). */
  function handlePickEvent(event: NewsletterComposerEvent) {
    const target = eventPicker;
    setEventPicker(null);
    if (!target || target.mode !== "replace") return;
    const prev = stateRef.current;
    const { stories, storyIds } = ensureStoriesForEvents(prev.stories, [event]);
    const storyId = storyIds[0]!;
    patch((p) => ({
      ...p,
      stories,
      canvasBlocks: (p.canvasBlocks ?? []).map((b) =>
        b.id === target.blockId ? { ...b, storyId } : b,
      ),
    }));
    selectBlock(target.blockId);
  }

  /** Multi-add from palette, or convert an event block into grid/columns/text+image. */
  function handleConfirmMultiEvents(
    selectedEvents: NewsletterComposerEvent[],
    layout: NewsletterEventInsertLayout,
  ) {
    const target = eventPicker;
    setEventPicker(null);
    if (!target || selectedEvents.length === 0) return;
    if (target.mode === "replace") return;

    const prev = stateRef.current;
    const { stories, storyIds } = ensureStoriesForEvents(
      prev.stories,
      selectedEvents,
    );
    const newBlocks = buildBlocksFromEventSelection(
      selectedEvents,
      layout,
      storyIds,
    );
    if (newBlocks.length === 0) return;

    if (target.mode === "convert") {
      patch((p) => {
        const blocks = p.canvasBlocks ?? [];
        const idx = blocks.findIndex((b) => b.id === target.blockId);
        if (idx < 0) {
          return {
            ...p,
            stories,
            canvasBlocks: [...blocks, ...newBlocks],
          };
        }
        return {
          ...p,
          stories,
          canvasBlocks: [
            ...blocks.slice(0, idx),
            ...newBlocks,
            ...blocks.slice(idx + 1),
          ],
        };
      });
    } else {
      const afterId = selectedBlockIdRef.current;
      patch((p) => ({
        ...p,
        stories,
        canvasBlocks: insertCanvasBlocksAfter(
          p.canvasBlocks ?? [],
          newBlocks,
          afterId,
        ),
      }));
    }

    const focusId = newBlocks[0]!.id;
    selectBlock(focusId);
    scrollToBlock(focusId);
  }

  function openConvertEventLayout(
    blockId: string,
    layout: NewsletterEventInsertLayout,
  ) {
    const block = stateRef.current.canvasBlocks?.find((b) => b.id === blockId);
    const story = block?.storyId
      ? stateRef.current.stories.find((s) => s.id === block.storyId)
      : null;
    const seedEventIds = story?.eventId ? [story.eventId] : [];
    setEventPicker({
      mode: "convert",
      blockId,
      layout,
      seedEventIds,
    });
  }

  function handleDuplicate(blockId: string) {
    patch((prev) => {
      const blocks = prev.canvasBlocks ?? [];
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx < 0) return prev;
      const copy = duplicateCanvasBlock(blocks[idx]!);
      const next = [...blocks.slice(0, idx + 1), copy, ...blocks.slice(idx + 1)];
      selectBlock(copy.id);
      return { ...prev, canvasBlocks: next };
    });
  }

  function handleDelete(blockId: string) {
    patch((prev) => {
      const blocks = prev.canvasBlocks ?? [];
      const removed = blocks.find((b) => b.id === blockId);
      const next = blocks.filter((b) => b.id !== blockId);
      let stories = prev.stories;
      if (removed?.kind === "event" && removed.storyId) {
        const stillReferenced = next.some(
          (b) => b.kind === "event" && b.storyId === removed.storyId,
        );
        if (!stillReferenced) {
          stories = prev.stories.map((s) =>
            s.id === removed.storyId ? { ...s, included: false } : s,
          );
        }
      }
      return { ...prev, stories, canvasBlocks: next };
    });
    if (selectedBlockIdRef.current === blockId) {
      selectedBlockIdRef.current = null;
      setSelectedBlockId(null);
    }
  }

  function handleDragStart(blockId: string) {
    dragIdRef.current = blockId;
  }

  function handleDragOver(e: DragEvent, overId: string) {
    e.preventDefault();
    const fromId = dragIdRef.current;
    if (!fromId || fromId === overId) return;
    patch((prev) => {
      const blocks = prev.canvasBlocks ?? [];
      const fromIdx = blocks.findIndex((b) => b.id === fromId);
      const toIdx = blocks.findIndex((b) => b.id === overId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...blocks];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved!);
      return { ...prev, canvasBlocks: next };
    });
  }

  const isChangesRequested = status === "changes_requested" && Boolean(changeRequestNote);
  const primaryCtaHref = newsletterIdRef.current
    ? `/newsletters/${newsletterIdRef.current}/preview`
    : null;
  const primaryCtaLabel =
    status === "changes_requested" ? "Preview & Resubmit" : "Preview & Send Details";

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100dvh-3.75rem)] min-h-[640px] flex-col overflow-hidden bg-cos-bg lg:-mx-8 lg:-my-10">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-cos-border bg-cos-card px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/create-with-ai"
            className="flex items-center gap-2 text-sm font-medium text-cos-muted transition hover:text-cos-text"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="h-6 w-px bg-cos-border" />
          <div className="flex items-center gap-3">
            <input
              value={state.issueName}
              onChange={(e) => patch((p) => ({ ...p, issueName: e.target.value }))}
              className="bg-transparent text-sm font-bold text-cos-text outline-none"
              style={{ width: `${Math.max(12, state.issueName.length)}ch` }}
            />
            {saveLabel ? (
              <span className="rounded bg-cos-bg-alt px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-cos-muted">
                {saveLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {primaryCtaHref ? (
            <Link
              href={primaryCtaHref}
              className="inline-flex items-center gap-2 rounded-full bg-cos-primary px-5 py-2.5 text-sm font-bold text-[#f6f2eb] shadow-md transition hover:bg-cos-primary-hover"
            >
              {primaryCtaLabel}
              {status === "changes_requested" ? <RotateCcw className="h-3.5 w-3.5" /> : null}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void flushDraft()}
              className="inline-flex items-center gap-2 rounded-full bg-cos-primary px-5 py-2.5 text-sm font-bold text-[#f6f2eb] shadow-md transition hover:bg-cos-primary-hover"
            >
              Save to continue
            </button>
          )}
        </div>
      </header>

      {isChangesRequested && !bannerDismissed ? (
        <div className="flex items-center justify-between gap-4 border-b border-cos-brand-terracotta/25 bg-cos-brand-terracotta-soft px-6 py-3">
          <p className="text-xs leading-tight text-cos-brand-terracotta">
            <span className="font-bold">Changes requested: </span>
            {changeRequestNote}
          </p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="shrink-0 text-cos-brand-terracotta transition hover:opacity-70"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}

      <main className="flex flex-1 overflow-hidden">
        {/* Left palette */}
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-cos-border bg-cos-bg-alt p-5">
          <div className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-cos-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-cos-brand-sage" /> From Hey Ralli
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {HEY_RALLI_ITEMS.map((item) => (
                <PaletteButton key={item.label} item={item} onClick={handlePaletteClick} />
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-cos-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-cos-brand-terracotta" /> Add your own
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {ADD_YOUR_OWN_ITEMS.map((item) => (
                <PaletteButton key={item.label} item={item} onClick={handlePaletteClick} />
              ))}
            </div>
          </div>
        </aside>

        {/* Center canvas */}
        <section
          ref={canvasScrollRef}
          className="relative flex-1 overflow-y-auto bg-[#f4f1ea] p-10"
        >
          <div className="mx-auto max-w-2xl space-y-0 rounded-sm bg-white shadow-[0_10px_30px_-15px_rgba(44,40,37,0.15)]">
            {canvasBlocks.length === 0 ? (
              <div className="p-16 text-center text-sm text-cos-muted">
                Add a block from the left to start building this issue.
              </div>
            ) : (
              canvasBlocks.map((block) => (
                <CanvasBlockFrame
                  key={block.id}
                  block={block}
                  state={state}
                  selected={block.id === selectedBlockId}
                  onSelect={() => selectBlock(block.id)}
                  onDuplicate={() => handleDuplicate(block.id)}
                  onDelete={() => handleDelete(block.id)}
                  onDragStart={() => handleDragStart(block.id)}
                  onDragOver={(e) => handleDragOver(e, block.id)}
                />
              ))
            )}
          </div>
        </section>

        {/* Right settings */}
        {selectedBlock ? (
          <BlockSettingsPanel
            state={state}
            block={selectedBlock}
            events={events}
            onPatchState={patch}
            onPatchBlock={(p) => patchSelectedBlock(() => p)}
            onUploadImage={uploadImage}
            onChangeEvent={() =>
              setEventPicker({ mode: "replace", blockId: selectedBlock.id })
            }
            onConvertEventLayout={(layout) =>
              openConvertEventLayout(selectedBlock.id, layout)
            }
            onDuplicate={() => handleDuplicate(selectedBlock.id)}
            onDelete={() => handleDelete(selectedBlock.id)}
          />
        ) : null}
      </main>

      <EventPickerModal
        open={eventPicker !== null}
        events={events}
        multiSelect={eventPickerMulti}
        selectedEventId={eventPickerCurrentEventId}
        initialSelectedEventIds={eventPickerSeedIds}
        initialLayout={eventPickerInitialLayout}
        onClose={() => setEventPicker(null)}
        onSelect={handlePickEvent}
        onConfirmMulti={handleConfirmMultiEvents}
      />
    </div>
  );
}

function PaletteButton({
  item,
  onClick,
}: {
  item: PaletteItem;
  onClick: (kind: NewsletterCanvasBlockKind | "event-picker") => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onClick(item.kind)}
      className={cn(
        "group flex flex-col items-center justify-center gap-2 rounded-xl border border-cos-border bg-cos-card p-3 transition hover:border-cos-brand-sage hover:shadow-sm",
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cos-brand-sage-soft text-cos-brand-sage transition group-hover:bg-cos-brand-sage group-hover:text-white">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-cos-text">
        {item.label}
      </span>
    </button>
  );
}
