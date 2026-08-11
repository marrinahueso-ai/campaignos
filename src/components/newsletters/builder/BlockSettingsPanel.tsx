"use client";

import { ImageFieldEditor } from "@/components/newsletters/builder/ImageFieldEditor";
import { Button } from "@/components/ui/Button";
import { compressImageForUpload } from "@/lib/homepage-composer/compress-image";
import {
  addCanvasColumn,
  addCanvasListItem,
  calendarChipFromEvent,
  newId,
} from "@/lib/newsletter-composer/defaults";
import type {
  NewsletterCanvasBlock,
  NewsletterCanvasBlockKind,
  NewsletterCanvasColumn,
  NewsletterComposerEvent,
  NewsletterComposerState,
  NewsletterEventBlockLayout,
  NewsletterEventInsertLayout,
  NewsletterStory,
} from "@/lib/newsletter-composer/types";
import { cn } from "@/lib/utils/cn";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

type PatchState = (fn: (prev: NewsletterComposerState) => NewsletterComposerState) => void;

type Props = {
  state: NewsletterComposerState;
  block: NewsletterCanvasBlock;
  events: NewsletterComposerEvent[];
  onPatchState: PatchState;
  onPatchBlock: (patch: Partial<NewsletterCanvasBlock>) => void;
  onUploadImage: (dataUrl: string, assetId: string) => Promise<string | null>;
  onChangeEvent: () => void;
  /** Convert this event block into grid / columns / text+image via multi-select. */
  onConvertEventLayout?: (layout: NewsletterEventInsertLayout) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const KIND_LABELS: Record<NewsletterCanvasBlockKind, string> = {
  hero: "Hero image",
  message: "Leadership message",
  event: "Event",
  calendar: "Upcoming calendar",
  volunteer: "Volunteer",
  sponsors: "Sponsors",
  links: "Helpful links",
  cta: "Get Involved CTA",
  socials: "Social footer",
  heading: "Heading",
  text: "Text",
  image: "Image",
  button: "Button",
  textImage: "Text + Image",
  columns: "Columns",
  grid: "Grid",
  carousel: "Carousel",
  list: "List",
  divider: "Divider",
  spacer: "Spacer",
  footer: "Footer",
};

function fieldLabelClass() {
  return "text-[10px] font-bold uppercase tracking-widest text-cos-muted";
}

function textInputClass() {
  return "w-full rounded-lg border border-cos-border bg-cos-bg px-3 py-2 text-xs text-cos-text outline-none focus:border-cos-brand-sage";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={fieldLabelClass()}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm font-medium text-cos-text">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-cos-brand-sage" : "bg-cos-border",
        )}
        aria-pressed={checked}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function BlockSettingsPanel({
  state,
  block,
  events,
  onPatchState,
  onPatchBlock,
  onUploadImage,
  onChangeEvent,
  onConvertEventLayout,
  onDuplicate,
  onDelete,
}: Props) {
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  async function upload(key: string, file: File, assetId: string, onDone: (url: string) => void) {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      const compressed = await compressImageForUpload(file, {
        maxEdge: 1200,
        maxBytes: 700 * 1024,
      });
      const url = await onUploadImage(compressed.dataUrl, assetId);
      if (url) onDone(url);
    } catch {
      window.alert("Could not upload that image — try again.");
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  }

  function updateStory(storyId: string, patch: Partial<NewsletterStory>) {
    onPatchState((prev) => ({
      ...prev,
      stories: prev.stories.map((s) => (s.id === storyId ? { ...s, ...patch } : s)),
    }));
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-cos-border bg-cos-bg-alt">
      <div className="border-b border-cos-border bg-cos-card p-5">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cos-muted">
            Block settings
          </p>
          <span className="rounded bg-cos-brand-sage-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cos-brand-sage">
            {KIND_LABELS[block.kind]}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {block.kind === "hero" ? (
          <HeroSettings state={state} onPatchState={onPatchState} upload={upload} busy={busy} />
        ) : null}

        {block.kind === "message" ? (
          <MessageSettings state={state} onPatchState={onPatchState} />
        ) : null}

        {block.kind === "event" ? (
          <EventSettings
            state={state}
            block={block}
            onPatchBlock={onPatchBlock}
            updateStory={updateStory}
            onChangeEvent={onChangeEvent}
            onConvertEventLayout={onConvertEventLayout}
            upload={upload}
            busy={busy}
          />
        ) : null}

        {block.kind === "calendar" ? (
          <CalendarSettings state={state} events={events} onPatchState={onPatchState} />
        ) : null}

        {block.kind === "volunteer" ? (
          <VolunteerSettings
            state={state}
            onPatchState={onPatchState}
            upload={upload}
            busy={busy}
          />
        ) : null}

        {block.kind === "sponsors" ? (
          <SponsorsSettings
            state={state}
            onPatchState={onPatchState}
            upload={upload}
            busy={busy}
          />
        ) : null}

        {block.kind === "links" ? (
          <LinksSettings state={state} onPatchState={onPatchState} />
        ) : null}

        {block.kind === "cta" ? <CtaSettings state={state} onPatchState={onPatchState} /> : null}

        {block.kind === "socials" ? (
          <SocialsSettings state={state} onPatchState={onPatchState} />
        ) : null}

        {block.kind === "heading" ? (
          <Field label="Heading text">
            <input
              className={textInputClass()}
              value={block.heading}
              onChange={(e) => onPatchBlock({ heading: e.target.value })}
            />
          </Field>
        ) : null}

        {block.kind === "text" ? (
          <Field label="Paragraph">
            <textarea
              className={cn(textInputClass(), "min-h-[110px]")}
              value={block.text}
              onChange={(e) => onPatchBlock({ text: e.target.value })}
            />
          </Field>
        ) : null}

        {block.kind === "image" ? (
          <ImageFieldEditor
            imageUrl={block.imageUrl}
            imageLink={block.imageLink}
            imageAlt={block.imageAlt}
            uploading={Boolean(busy[`block:${block.id}`])}
            onUpload={(file) =>
              upload(`block:${block.id}`, file, `block-${block.id}`, (url) =>
                onPatchBlock({ imageUrl: url }),
              )
            }
            onRemove={() => onPatchBlock({ imageUrl: null })}
            onChangeLink={(v) => onPatchBlock({ imageLink: v })}
            onChangeAlt={(v) => onPatchBlock({ imageAlt: v })}
          />
        ) : null}

        {block.kind === "button" ? (
          <div className="space-y-3">
            <Field label="Button label">
              <input
                className={textInputClass()}
                value={block.buttonLabel}
                onChange={(e) => onPatchBlock({ buttonLabel: e.target.value })}
              />
            </Field>
            <Field label="Button link">
              <input
                className={textInputClass()}
                value={block.buttonUrl}
                onChange={(e) => onPatchBlock({ buttonUrl: e.target.value })}
                placeholder="https://…"
              />
            </Field>
          </div>
        ) : null}

        {block.kind === "textImage" ? (
          <div className="space-y-4">
            <Field label="Heading">
              <input
                className={textInputClass()}
                value={block.heading}
                onChange={(e) => onPatchBlock({ heading: e.target.value })}
              />
            </Field>
            <Field label="Text">
              <textarea
                className={cn(textInputClass(), "min-h-[80px]")}
                value={block.text}
                onChange={(e) => onPatchBlock({ text: e.target.value })}
              />
            </Field>
            <ImageFieldEditor
              imageUrl={block.imageUrl}
              imageLink={block.imageLink}
              imageAlt={block.imageAlt}
              uploading={Boolean(busy[`block:${block.id}`])}
              onUpload={(file) =>
                upload(`block:${block.id}`, file, `block-${block.id}`, (url) =>
                  onPatchBlock({ imageUrl: url }),
                )
              }
              onRemove={() => onPatchBlock({ imageUrl: null })}
              onChangeLink={(v) => onPatchBlock({ imageLink: v })}
              onChangeAlt={(v) => onPatchBlock({ imageAlt: v })}
            />
            <Field label="Button label (optional)">
              <input
                className={textInputClass()}
                value={block.buttonLabel}
                onChange={(e) => onPatchBlock({ buttonLabel: e.target.value })}
              />
            </Field>
            <Field label="Button link">
              <input
                className={textInputClass()}
                value={block.buttonUrl}
                onChange={(e) => onPatchBlock({ buttonUrl: e.target.value })}
                placeholder="https://…"
              />
            </Field>
          </div>
        ) : null}

        {block.kind === "columns" || block.kind === "grid" || block.kind === "carousel" ? (
          <ColumnsSettings block={block} onPatchBlock={onPatchBlock} upload={upload} busy={busy} />
        ) : null}

        {block.kind === "list" ? (
          <ListSettings block={block} onPatchBlock={onPatchBlock} />
        ) : null}

        {block.kind === "divider" ? (
          <p className="text-sm text-cos-muted">
            A plain horizontal rule — no settings needed. Drag to reposition.
          </p>
        ) : null}

        {block.kind === "spacer" ? (
          <Field label={`Height — ${block.spacingPx}px`}>
            <input
              type="range"
              min={8}
              max={96}
              step={4}
              value={block.spacingPx}
              onChange={(e) => onPatchBlock({ spacingPx: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
        ) : null}

        {block.kind === "footer" ? (
          <Field label="Fine print (blank uses your footer default)">
            <textarea
              className={cn(textInputClass(), "min-h-[90px]")}
              value={block.text}
              onChange={(e) => onPatchBlock({ text: e.target.value })}
              placeholder={state.footerFinePrint}
            />
          </Field>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-cos-border bg-cos-card p-5">
        <Button type="button" variant="secondary" className="w-full" onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5" /> Duplicate block
        </Button>
        <Button type="button" variant="ghost" className="w-full text-cos-error" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" /> Delete block
        </Button>
      </div>
    </aside>
  );
}

type UploadFn = (key: string, file: File, assetId: string, onDone: (url: string) => void) => void;

// ---------------------------------------------------------------------------
// Per-kind settings sections
// ---------------------------------------------------------------------------

function HeroSettings({
  state,
  onPatchState,
  upload,
  busy,
}: {
  state: NewsletterComposerState;
  onPatchState: PatchState;
  upload: UploadFn;
  busy: Record<string, boolean>;
}) {
  return (
    <div className="space-y-4">
      <ImageFieldEditor
        imageUrl={state.headerImageUrl}
        imageLink={state.headerImageLink}
        imageAlt={state.headerImageAlt}
        uploading={Boolean(busy.hero)}
        onUpload={(file) =>
          upload("hero", file, "header", (url) =>
            onPatchState((p) => ({ ...p, headerImageUrl: url })),
          )
        }
        onRemove={() => onPatchState((p) => ({ ...p, headerImageUrl: null }))}
        onChangeLink={(v) => onPatchState((p) => ({ ...p, headerImageLink: v }))}
        onChangeAlt={(v) => onPatchState((p) => ({ ...p, headerImageAlt: v }))}
      />
      <Field label="Newsletter name">
        <input
          className={textInputClass()}
          value={state.issueName}
          placeholder="e.g. Edmondson Scoop"
          onChange={(e) => onPatchState((p) => ({ ...p, issueName: e.target.value }))}
        />
        <p className="mt-1 text-[11px] text-cos-muted">
          Line 1 on the header — also saves as this newsletter&apos;s name.
        </p>
      </Field>
      <Field label="Edition">
        <input
          className={textInputClass()}
          value={state.issueEdition}
          placeholder="e.g. August 2026 edition"
          onChange={(e) => onPatchState((p) => ({ ...p, issueEdition: e.target.value }))}
        />
        <p className="mt-1 text-[11px] text-cos-muted">Line 2 on the header.</p>
      </Field>
    </div>
  );
}

function MessageSettings({
  state,
  onPatchState,
}: {
  state: NewsletterComposerState;
  onPatchState: PatchState;
}) {
  return (
    <div className="space-y-4">
      <Field label="From names">
        <input
          className={textInputClass()}
          value={state.leadershipNames}
          onChange={(e) => onPatchState((p) => ({ ...p, leadershipNames: e.target.value }))}
        />
      </Field>
      <Field label="Message">
        <textarea
          className={cn(textInputClass(), "min-h-[110px]")}
          value={state.leadershipMessage}
          onChange={(e) => onPatchState((p) => ({ ...p, leadershipMessage: e.target.value }))}
        />
      </Field>
      <Field label="Optional org note">
        <textarea
          className={cn(textInputClass(), "min-h-[70px]")}
          value={state.ptoNote}
          onChange={(e) => onPatchState((p) => ({ ...p, ptoNote: e.target.value }))}
        />
      </Field>
    </div>
  );
}

const EVENT_LAYOUT_TILES: {
  id: NewsletterEventInsertLayout;
  label: string;
  kind: "single" | "composite";
}[] = [
  { id: "featured", label: "Featured", kind: "single" },
  { id: "card", label: "Card", kind: "single" },
  { id: "artwork-only", label: "Artwork only", kind: "single" },
  { id: "compact", label: "Compact", kind: "single" },
  { id: "textImage", label: "Text + image", kind: "composite" },
  { id: "columns", label: "2/3 column", kind: "composite" },
  { id: "grid", label: "Grid", kind: "composite" },
];

function EventSettings({
  state,
  block,
  onPatchBlock,
  updateStory,
  onChangeEvent,
  onConvertEventLayout,
  upload,
  busy,
}: {
  state: NewsletterComposerState;
  block: NewsletterCanvasBlock;
  onPatchBlock: (patch: Partial<NewsletterCanvasBlock>) => void;
  updateStory: (storyId: string, patch: Partial<NewsletterStory>) => void;
  onChangeEvent: () => void;
  onConvertEventLayout?: (layout: NewsletterEventInsertLayout) => void;
  upload: UploadFn;
  busy: Record<string, boolean>;
}) {
  const story = state.stories.find((s) => s.id === block.storyId) ?? null;

  return (
    <div className="space-y-5">
      <Button type="button" variant="secondary" className="w-full" onClick={onChangeEvent}>
        {story ? "Change event" : "Choose an event"}
      </Button>

      {!story ? (
        <p className="text-sm text-cos-muted">Pick an event to fill in this block.</p>
      ) : (
        <>
          <div className="space-y-3">
            <label className={fieldLabelClass()}>Event layout</label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_LAYOUT_TILES.map((l) => {
                const selected =
                  l.kind === "single" && block.eventLayout === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      if (l.kind === "composite") {
                        onConvertEventLayout?.(l.id);
                        return;
                      }
                      onPatchBlock({ eventLayout: l.id as NewsletterEventBlockLayout });
                    }}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-[11px] font-bold transition",
                      selected
                        ? "border-2 border-cos-brand-sage bg-cos-brand-sage-soft text-cos-brand-sage"
                        : "border-cos-border bg-cos-card text-cos-muted hover:border-cos-brand-sage",
                    )}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 border-t border-cos-border pt-4">
            <label className={fieldLabelClass()}>Show / hide</label>
            <Toggle
              label="Event artwork"
              checked={block.showArtwork}
              onChange={(v) => onPatchBlock({ showArtwork: v })}
            />
            <Toggle
              label="Description"
              checked={block.showDescription}
              onChange={(v) => onPatchBlock({ showDescription: v })}
            />
            <Toggle
              label="Location"
              checked={block.showLocation}
              onChange={(v) => onPatchBlock({ showLocation: v })}
            />
            <Toggle
              label="Volunteer / CTA link"
              checked={block.showVolunteerLink}
              onChange={(v) => onPatchBlock({ showVolunteerLink: v })}
            />
          </div>

          <div className="space-y-3 border-t border-cos-border pt-4">
            <label className={fieldLabelClass()}>Artwork</label>
            <ImageFieldEditor
              imageUrl={story.imageUrl}
              imageLink={story.imageLink}
              imageAlt={story.imageAlt}
              uploading={Boolean(busy[`story:${story.id}`])}
              onUpload={(file) =>
                upload(`story:${story.id}`, file, `story-${story.id}`, (url) =>
                  updateStory(story.id, { imageUrl: url }),
                )
              }
              onRemove={() => updateStory(story.id, { imageUrl: null })}
              onChangeLink={(v) => updateStory(story.id, { imageLink: v })}
              onChangeAlt={(v) => updateStory(story.id, { imageAlt: v })}
            />
          </div>

          <div className="space-y-3 border-t border-cos-border pt-4">
            <Field label="Title">
              <input
                className={textInputClass()}
                value={story.title}
                onChange={(e) => updateStory(story.id, { title: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <textarea
                className={cn(textInputClass(), "min-h-[80px]")}
                value={story.messaging}
                onChange={(e) => updateStory(story.id, { messaging: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="CTA label">
                <input
                  className={textInputClass()}
                  value={story.ctaLabel}
                  onChange={(e) => updateStory(story.id, { ctaLabel: e.target.value })}
                />
              </Field>
              <Field label="CTA link">
                <input
                  className={textInputClass()}
                  value={story.ctaUrl}
                  onChange={(e) => updateStory(story.id, { ctaUrl: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CalendarSettings({
  state,
  events,
  onPatchState,
}: {
  state: NewsletterComposerState;
  events: NewsletterComposerEvent[];
  onPatchState: PatchState;
}) {
  const selectedEventIds = new Set(
    state.calendarChips.map((c) => c.eventId).filter((id): id is string => Boolean(id)),
  );
  const manualChips = state.calendarChips.filter((c) => !c.eventId);
  const sortedEvents = [...events].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  function toggleEvent(event: NewsletterComposerEvent) {
    onPatchState((prev) => {
      const exists = prev.calendarChips.some((c) => c.eventId === event.id);
      return {
        ...prev,
        calendarChips: exists
          ? prev.calendarChips.filter((c) => c.eventId !== event.id)
          : [...prev.calendarChips, calendarChipFromEvent(event)],
      };
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className={fieldLabelClass()}>From your events</label>
        {sortedEvents.length === 0 ? (
          <p className="text-sm text-cos-muted">No events yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sortedEvents.map((event) => {
              const on = selectedEventIds.has(event.id);
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => toggleEvent(event)}
                  className={cn(
                    "rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition",
                    on
                      ? "border-cos-brand-sage bg-cos-brand-sage-soft text-cos-brand-sage"
                      : "border-cos-border text-cos-muted hover:border-cos-brand-sage",
                  )}
                >
                  {event.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-cos-border pt-4">
        <div className="flex items-center justify-between">
          <label className={fieldLabelClass()}>Manual dates</label>
          <button
            type="button"
            onClick={() =>
              onPatchState((prev) => ({
                ...prev,
                calendarChips: [
                  ...prev.calendarChips,
                  { id: newId("cal"), label: "New date", eventId: null, date: null },
                ],
              }))
            }
            className="text-cos-muted hover:text-cos-text"
            aria-label="Add manual date"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {manualChips.map((chip) => (
          <div key={chip.id} className="flex gap-2">
            <input
              className={textInputClass()}
              value={chip.label}
              onChange={(e) =>
                onPatchState((prev) => ({
                  ...prev,
                  calendarChips: prev.calendarChips.map((c) =>
                    c.id === chip.id ? { ...c, label: e.target.value } : c,
                  ),
                }))
              }
            />
            <button
              type="button"
              onClick={() =>
                onPatchState((prev) => ({
                  ...prev,
                  calendarChips: prev.calendarChips.filter((c) => c.id !== chip.id),
                }))
              }
              className="text-cos-muted hover:text-cos-error"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VolunteerSettings({
  state,
  onPatchState,
  upload,
  busy,
}: {
  state: NewsletterComposerState;
  onPatchState: PatchState;
  upload: UploadFn;
  busy: Record<string, boolean>;
}) {
  return (
    <div className="space-y-3">
      {state.volunteerAsks.length === 0 ? (
        <p className="text-sm text-cos-muted">
          No volunteer signup links yet — add one on an event&apos;s Volunteer page, or add one
          manually below.
        </p>
      ) : (
        state.volunteerAsks.map((ask) => (
          <div key={ask.id} className="space-y-2 rounded-xl border border-cos-border bg-cos-card p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-cos-text">
              <input
                type="checkbox"
                checked={ask.included}
                onChange={() =>
                  onPatchState((prev) => ({
                    ...prev,
                    volunteerAsks: prev.volunteerAsks.map((v) =>
                      v.id === ask.id ? { ...v, included: !v.included } : v,
                    ),
                  }))
                }
              />
              {ask.title}
            </label>
            {ask.included ? (
              <>
                <input
                  className={textInputClass()}
                  value={ask.details}
                  onChange={(e) =>
                    onPatchState((prev) => ({
                      ...prev,
                      volunteerAsks: prev.volunteerAsks.map((v) =>
                        v.id === ask.id ? { ...v, details: e.target.value } : v,
                      ),
                    }))
                  }
                />
                <input
                  className={textInputClass()}
                  value={ask.signupUrl}
                  placeholder="Signup URL"
                  onChange={(e) =>
                    onPatchState((prev) => ({
                      ...prev,
                      volunteerAsks: prev.volunteerAsks.map((v) =>
                        v.id === ask.id ? { ...v, signupUrl: e.target.value } : v,
                      ),
                    }))
                  }
                />
                <ImageFieldEditor
                  imageUrl={ask.imageUrl}
                  imageLink={ask.imageLink}
                  imageAlt={ask.imageAlt}
                  uploading={Boolean(busy[`vol:${ask.id}`])}
                  onUpload={(file) =>
                    upload(`vol:${ask.id}`, file, `vol-${ask.id}`, (url) =>
                      onPatchState((prev) => ({
                        ...prev,
                        volunteerAsks: prev.volunteerAsks.map((v) =>
                          v.id === ask.id ? { ...v, imageUrl: url } : v,
                        ),
                      })),
                    )
                  }
                  onRemove={() =>
                    onPatchState((prev) => ({
                      ...prev,
                      volunteerAsks: prev.volunteerAsks.map((v) =>
                        v.id === ask.id ? { ...v, imageUrl: null } : v,
                      ),
                    }))
                  }
                  onChangeLink={(val) =>
                    onPatchState((prev) => ({
                      ...prev,
                      volunteerAsks: prev.volunteerAsks.map((v) =>
                        v.id === ask.id ? { ...v, imageLink: val } : v,
                      ),
                    }))
                  }
                  onChangeAlt={(val) =>
                    onPatchState((prev) => ({
                      ...prev,
                      volunteerAsks: prev.volunteerAsks.map((v) =>
                        v.id === ask.id ? { ...v, imageAlt: val } : v,
                      ),
                    }))
                  }
                />
              </>
            ) : null}
          </div>
        ))
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() =>
          onPatchState((prev) => ({
            ...prev,
            volunteerAsks: [
              ...prev.volunteerAsks,
              {
                id: newId("vol"),
                eventId: null,
                source: "manual",
                title: "Volunteer ask",
                date: null,
                details: "",
                signupUrl: "",
                imageUrl: null,
                imageLink: "",
                imageAlt: "",
                included: true,
              },
            ],
          }))
        }
      >
        <Plus className="h-3.5 w-3.5" /> Add volunteer ask
      </Button>
    </div>
  );
}

function SponsorsSettings({
  state,
  onPatchState,
  upload,
  busy,
}: {
  state: NewsletterComposerState;
  onPatchState: PatchState;
  upload: UploadFn;
  busy: Record<string, boolean>;
}) {
  return (
    <div className="space-y-4">
      {state.sponsors.map((sp) => (
        <div key={sp.id} className="space-y-2 rounded-xl border border-cos-border bg-cos-card p-3">
          <div className="flex items-center justify-between">
            <input
              className={cn(textInputClass(), "font-semibold")}
              value={sp.name}
              onChange={(e) =>
                onPatchState((prev) => ({
                  ...prev,
                  sponsors: prev.sponsors.map((s) =>
                    s.id === sp.id ? { ...s, name: e.target.value } : s,
                  ),
                }))
              }
            />
            <button
              type="button"
              className="ml-2 text-cos-muted hover:text-cos-error"
              onClick={() =>
                onPatchState((prev) => ({
                  ...prev,
                  sponsors: prev.sponsors.filter((s) => s.id !== sp.id),
                }))
              }
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input
            className={textInputClass()}
            value={sp.note}
            placeholder="Thank-you note"
            onChange={(e) =>
              onPatchState((prev) => ({
                ...prev,
                sponsors: prev.sponsors.map((s) =>
                  s.id === sp.id ? { ...s, note: e.target.value } : s,
                ),
              }))
            }
          />
          <input
            className={textInputClass()}
            value={sp.url}
            placeholder="Sponsor link"
            onChange={(e) =>
              onPatchState((prev) => ({
                ...prev,
                sponsors: prev.sponsors.map((s) =>
                  s.id === sp.id ? { ...s, url: e.target.value } : s,
                ),
              }))
            }
          />
          <ImageFieldEditor
            imageUrl={sp.imageUrl}
            imageLink={sp.imageLink}
            imageAlt={sp.imageAlt}
            uploading={Boolean(busy[`sponsor:${sp.id}`])}
            onUpload={(file) =>
              upload(`sponsor:${sp.id}`, file, `sponsor-${sp.id}`, (url) =>
                onPatchState((prev) => ({
                  ...prev,
                  sponsors: prev.sponsors.map((s) =>
                    s.id === sp.id ? { ...s, imageUrl: url } : s,
                  ),
                })),
              )
            }
            onRemove={() =>
              onPatchState((prev) => ({
                ...prev,
                sponsors: prev.sponsors.map((s) =>
                  s.id === sp.id ? { ...s, imageUrl: null } : s,
                ),
              }))
            }
            onChangeLink={(val) =>
              onPatchState((prev) => ({
                ...prev,
                sponsors: prev.sponsors.map((s) =>
                  s.id === sp.id ? { ...s, imageLink: val } : s,
                ),
              }))
            }
            onChangeAlt={(val) =>
              onPatchState((prev) => ({
                ...prev,
                sponsors: prev.sponsors.map((s) =>
                  s.id === sp.id ? { ...s, imageAlt: val } : s,
                ),
              }))
            }
          />
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() =>
          onPatchState((prev) => ({
            ...prev,
            sponsors: [
              ...prev.sponsors,
              {
                id: newId("sp"),
                name: "New partner",
                note: "",
                url: "",
                imageUrl: null,
                imageLink: "",
                imageAlt: "",
              },
            ],
          }))
        }
      >
        <Plus className="h-3.5 w-3.5" /> Add sponsor
      </Button>
      <div className="grid grid-cols-1 gap-2 border-t border-cos-border pt-4">
        <Field label="Sponsor CTA label">
          <input
            className={textInputClass()}
            value={state.sponsorCtaLabel}
            onChange={(e) => onPatchState((p) => ({ ...p, sponsorCtaLabel: e.target.value }))}
          />
        </Field>
        <Field label="Sponsor CTA link">
          <input
            className={textInputClass()}
            value={state.sponsorCtaUrl}
            onChange={(e) => onPatchState((p) => ({ ...p, sponsorCtaUrl: e.target.value }))}
          />
        </Field>
      </div>
    </div>
  );
}

function LinksSettings({
  state,
  onPatchState,
}: {
  state: NewsletterComposerState;
  onPatchState: PatchState;
}) {
  return (
    <div className="space-y-2">
      {state.helpfulLinks.map((link) => (
        <div key={link.id} className="grid grid-cols-[36px_1fr] gap-2">
          <input
            className={textInputClass()}
            value={link.emoji}
            onChange={(e) =>
              onPatchState((prev) => ({
                ...prev,
                helpfulLinks: prev.helpfulLinks.map((l) =>
                  l.id === link.id ? { ...l, emoji: e.target.value } : l,
                ),
              }))
            }
          />
          <input
            className={textInputClass()}
            value={link.label}
            onChange={(e) =>
              onPatchState((prev) => ({
                ...prev,
                helpfulLinks: prev.helpfulLinks.map((l) =>
                  l.id === link.id ? { ...l, label: e.target.value } : l,
                ),
              }))
            }
          />
          <input
            className={cn(textInputClass(), "col-span-2")}
            value={link.url}
            placeholder="https://…"
            onChange={(e) =>
              onPatchState((prev) => ({
                ...prev,
                helpfulLinks: prev.helpfulLinks.map((l) =>
                  l.id === link.id ? { ...l, url: e.target.value } : l,
                ),
              }))
            }
          />
        </div>
      ))}
    </div>
  );
}

function CtaSettings({
  state,
  onPatchState,
}: {
  state: NewsletterComposerState;
  onPatchState: PatchState;
}) {
  return (
    <div className="space-y-3">
      <Field label="Headline">
        <input
          className={textInputClass()}
          value={state.footerCtaHeadline}
          onChange={(e) => onPatchState((p) => ({ ...p, footerCtaHeadline: e.target.value }))}
        />
      </Field>
      <Field label="Button label">
        <input
          className={textInputClass()}
          value={state.footerCtaLabel}
          onChange={(e) => onPatchState((p) => ({ ...p, footerCtaLabel: e.target.value }))}
        />
      </Field>
      <Field label="Button link">
        <input
          className={textInputClass()}
          value={state.footerCtaUrl}
          onChange={(e) => onPatchState((p) => ({ ...p, footerCtaUrl: e.target.value }))}
        />
      </Field>
    </div>
  );
}

function SocialsSettings({
  state,
  onPatchState,
}: {
  state: NewsletterComposerState;
  onPatchState: PatchState;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {state.socials.map((social) => (
          <div key={social.id} className="grid grid-cols-[90px_1fr] items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-cos-text">
              <input
                type="checkbox"
                checked={social.enabled}
                onChange={() =>
                  onPatchState((prev) => ({
                    ...prev,
                    socials: prev.socials.map((s) =>
                      s.id === social.id ? { ...s, enabled: !s.enabled } : s,
                    ),
                  }))
                }
              />
              {social.label}
            </label>
            <input
              className={textInputClass()}
              value={social.url}
              placeholder="URL"
              onChange={(e) =>
                onPatchState((prev) => ({
                  ...prev,
                  socials: prev.socials.map((s) =>
                    s.id === social.id ? { ...s, url: e.target.value } : s,
                  ),
                }))
              }
            />
          </div>
        ))}
      </div>
      <Field label="Footer fine print">
        <textarea
          className={cn(textInputClass(), "min-h-[70px]")}
          value={state.footerFinePrint}
          onChange={(e) => onPatchState((p) => ({ ...p, footerFinePrint: e.target.value }))}
        />
      </Field>
    </div>
  );
}

function ColumnCardEditor({
  col,
  onChange,
  onRemove,
  upload,
  busy,
}: {
  col: NewsletterCanvasColumn;
  onChange: (patch: Partial<NewsletterCanvasColumn>) => void;
  onRemove?: () => void;
  upload: UploadFn;
  busy: Record<string, boolean>;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-cos-border bg-cos-card p-3">
      {onRemove ? (
        <div className="flex justify-end">
          <button type="button" onClick={onRemove} className="text-cos-muted hover:text-cos-error">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <ImageFieldEditor
        imageUrl={col.imageUrl}
        imageLink={col.imageLink}
        imageAlt={col.imageAlt}
        uploading={Boolean(busy[`col:${col.id}`])}
        onUpload={(file) =>
          upload(`col:${col.id}`, file, `col-${col.id}`, (url) => onChange({ imageUrl: url }))
        }
        onRemove={() => onChange({ imageUrl: null })}
        onChangeLink={(v) => onChange({ imageLink: v })}
        onChangeAlt={(v) => onChange({ imageAlt: v })}
      />
      <input
        className={textInputClass()}
        value={col.heading}
        placeholder="Heading"
        onChange={(e) => onChange({ heading: e.target.value })}
      />
      <textarea
        className={cn(textInputClass(), "min-h-[60px]")}
        value={col.text}
        placeholder="Text"
        onChange={(e) => onChange({ text: e.target.value })}
      />
      <input
        className={textInputClass()}
        value={col.buttonLabel}
        placeholder="Button label (optional)"
        onChange={(e) => onChange({ buttonLabel: e.target.value })}
      />
      <input
        className={textInputClass()}
        value={col.buttonUrl}
        placeholder="Button link"
        onChange={(e) => onChange({ buttonUrl: e.target.value })}
      />
    </div>
  );
}

function ColumnsSettings({
  block,
  onPatchBlock,
  upload,
  busy,
}: {
  block: NewsletterCanvasBlock;
  onPatchBlock: (patch: Partial<NewsletterCanvasBlock>) => void;
  upload: UploadFn;
  busy: Record<string, boolean>;
}) {
  function updateColumn(colId: string, patch: Partial<NewsletterCanvasColumn>) {
    onPatchBlock({
      columns: block.columns.map((c) => (c.id === colId ? { ...c, ...patch } : c)),
    });
  }

  return (
    <div className="space-y-3">
      {block.columns.map((col) => (
        <ColumnCardEditor
          key={col.id}
          col={col}
          upload={upload}
          busy={busy}
          onChange={(patch) => updateColumn(col.id, patch)}
          onRemove={
            block.columns.length > 1
              ? () => onPatchBlock({ columns: block.columns.filter((c) => c.id !== col.id) })
              : undefined
          }
        />
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() => onPatchBlock(addCanvasColumn(block))}
      >
        <Plus className="h-3.5 w-3.5" /> Add card
      </Button>
    </div>
  );
}

function ListSettings({
  block,
  onPatchBlock,
}: {
  block: NewsletterCanvasBlock;
  onPatchBlock: (patch: Partial<NewsletterCanvasBlock>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Heading">
        <input
          className={textInputClass()}
          value={block.heading}
          onChange={(e) => onPatchBlock({ heading: e.target.value })}
        />
      </Field>
      <div className="space-y-2">
        {block.items.map((item) => (
          <div key={item.id} className="flex gap-2">
            <input
              className={textInputClass()}
              value={item.text}
              onChange={(e) =>
                onPatchBlock({
                  items: block.items.map((i) =>
                    i.id === item.id ? { ...i, text: e.target.value } : i,
                  ),
                })
              }
            />
            <button
              type="button"
              onClick={() =>
                onPatchBlock({ items: block.items.filter((i) => i.id !== item.id) })
              }
              className="text-cos-muted hover:text-cos-error"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() => onPatchBlock(addCanvasListItem(block))}
      >
        <Plus className="h-3.5 w-3.5" /> Add item
      </Button>
    </div>
  );
}
