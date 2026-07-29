"use client";

import { SettingsBox } from "@/components/homepage-composer/SettingsBox";
import {
  EmailPreviewDesktop,
  EmailPreviewPhone,
} from "@/components/newsletter-composer/EmailPreviewPhone";
import { Button } from "@/components/ui/Button";
import {
  buildInitialState,
  calendarChipFromEvent,
  newId,
  normalizeComposerState,
  syncLayoutWithStories,
} from "@/lib/newsletter-composer/defaults";
import {
  loadComposerDraftRaw,
  parseComposerDraftRaw,
  saveComposerDraft,
  type DraftSaveStatus,
} from "@/lib/newsletter-composer/draft-storage";
import { exportNewsletterHtml } from "@/lib/newsletter-composer/export-html";
import { uploadNewsletterComposerArtworkAction } from "@/lib/newsletter-composer/artwork-actions";
import { compressImageForUpload } from "@/lib/homepage-composer/compress-image";
import type {
  NewsletterComposerEvent,
  NewsletterComposerState,
  NewsletterComposerStep,
  NewsletterSponsor,
  NewsletterStory,
  NewsletterVolunteerAsk,
} from "@/lib/newsletter-composer/types";
import { cn } from "@/lib/utils/cn";
import {
  ChevronDown,
  GripVertical,
  Plus,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";

const STEPS: {
  id: NewsletterComposerStep;
  label: string;
  hint: string;
}[] = [
  { id: "header", label: "Header", hint: "Issue · colors · image" },
  { id: "message", label: "Message", hint: "Leadership note" },
  { id: "stories", label: "Stories", hint: "Events · manual · ★" },
  { id: "mustdos", label: "Must-dos", hint: "Cal · vol · sponsors" },
  { id: "footer", label: "Footer", hint: "Socials · CTA" },
  { id: "layout", label: "Layout", hint: "Sort · drag" },
  { id: "preview", label: "Preview", hint: "Phone · desktop" },
  { id: "send", label: "Send", hint: "Copy HTML" },
];

function currentMonthYyyyMm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map((p) => parseInt(p, 10));
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function monthOptionsFromDates(dates: Array<string | null | undefined>): string[] {
  const months = new Set<string>();
  for (const date of dates) {
    if (date && date.length >= 7) months.add(date.slice(0, 7));
  }
  months.add(currentMonthYyyyMm());
  return [...months].sort();
}

function ArtThumb({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn(
          "h-12 w-12 shrink-0 rounded-[10px] object-cover",
          className,
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "h-12 w-12 shrink-0 rounded-[10px] bg-[linear-gradient(145deg,#2f4a3c,#d4a84b)]",
        className,
      )}
      aria-hidden
    />
  );
}

type Props = {
  organizationId: string | null;
  organizationName: string | null;
  events: NewsletterComposerEvent[];
};

export function NewsletterComposer({
  organizationId,
  organizationName,
  events,
}: Props) {
  const [step, setStep] = useState<NewsletterComposerStep>("header");
  const [state, setState] = useState<NewsletterComposerState>(() =>
    buildInitialState(organizationName, events),
  );
  const [hydrated, setHydrated] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftSaveStatus>({
    kind: "idle",
  });
  const [previewMode, setPreviewMode] = useState<"phone" | "desktop">("phone");
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [manualStoryOpen, setManualStoryOpen] = useState(false);
  const [manualVolOpen, setManualVolOpen] = useState(false);
  const [layoutSort, setLayoutSort] = useState("manual");
  const [monthFilter, setMonthFilter] = useState(currentMonthYyyyMm);
  const dragId = useRef<string | null>(null);
  const headerFileRef = useRef<HTMLInputElement>(null);
  const organizationNameRef = useRef(organizationName);
  const organizationIdRef = useRef(organizationId);
  const eventsRef = useRef(events);
  const stateRef = useRef(state);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0);
  organizationNameRef.current = organizationName;
  organizationIdRef.current = organizationId;
  eventsRef.current = events;
  stateRef.current = state;

  const monthOptions = useMemo(
    () =>
      monthOptionsFromDates([
        ...events.map((e) => e.date),
        ...state.stories.map((s) => s.date),
        ...state.volunteerAsks.map((v) => v.date),
      ]),
    [events, state.stories, state.volunteerAsks],
  );

  useEffect(() => {
    if (!monthOptions.includes(monthFilter) && monthOptions.length > 0) {
      setMonthFilter(monthOptions[monthOptions.length - 1]!);
    }
  }, [monthOptions, monthFilter]);

  const flushDraft = useCallback(async () => {
    if (!hydratedRef.current) return;
    const seq = ++saveSeqRef.current;
    const snapshot = stateRef.current;
    const orgId = organizationIdRef.current;
    setDraftStatus({ kind: "saving" });
    try {
      await saveComposerDraft(orgId, snapshot);
      if (seq !== saveSeqRef.current) return;
      setDraftStatus({ kind: "saved", at: Date.now() });
    } catch {
      if (seq !== saveSeqRef.current) return;
      setDraftStatus({ kind: "error", message: "Could not save draft" });
    }
  }, []);

  // Load draft once per organization (IndexedDB ↔ localStorage, newest wins).
  // Do not re-hydrate when events/name change — that wiped in-progress edits.
  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    hydratedRef.current = false;

    void (async () => {
      try {
        const raw = await loadComposerDraftRaw(organizationId);
        if (cancelled) return;
        if (raw) {
          const parsed = parseComposerDraftRaw(raw);
          if (parsed) {
            setState(
              normalizeComposerState(
                parsed,
                organizationNameRef.current,
                eventsRef.current,
              ),
            );
          }
        }
      } catch {
        /* keep initial */
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  // Debounced autosave — localStorage (sync) + IndexedDB.
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setDraftStatus({ kind: "saving" });
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushDraft();
    }, 450);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [state, organizationId, hydrated, flushDraft]);

  // Flush pending debounce on unmount / tab hide so navigate-away cannot drop edits.
  useEffect(() => {
    const onLeave = () => {
      if (!hydratedRef.current) return;
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
      onLeave();
    };
  }, [flushDraft]);

  const patch = useCallback(
    (fn: (prev: NewsletterComposerState) => NewsletterComposerState) => {
      setState((prev) => fn(prev));
    },
    [],
  );

  const setStories = useCallback(
    (updater: (stories: NewsletterStory[]) => NewsletterStory[]) => {
      patch((prev) => {
        const stories = updater(prev.stories);
        const next = { ...prev, stories };
        next.layoutBlocks = syncLayoutWithStories(next);
        return next;
      });
    },
    [patch],
  );

  const nextStep = (id: NewsletterComposerStep) => setStep(id);

  async function onHeaderImage(file: File | null) {
    if (!file) return;
    setUploadingHeader(true);
    try {
      const compressed = await compressImageForUpload(file, {
        maxEdge: 1200,
        maxBytes: 700 * 1024,
      });
      const uploaded = await uploadNewsletterComposerArtworkAction({
        assetId: "header",
        dataUrl: compressed.dataUrl,
      });
      if (!uploaded.success || !uploaded.url) {
        throw new Error(uploaded.error || "Upload failed");
      }
      patch((p) => ({ ...p, headerImageUrl: uploaded.url }));
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Could not upload header image.",
      );
    } finally {
      setUploadingHeader(false);
    }
  }

  async function copyHtml() {
    const html = exportNewsletterHtml(state);
    try {
      await navigator.clipboard.writeText(html);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    } catch {
      window.alert("Could not copy — select and copy from a download instead.");
    }
  }

  function sortLayout(mode: string) {
    setLayoutSort(mode);
    if (mode === "manual") return;
    patch((prev) => {
      const header = prev.layoutBlocks.find((b) => b.kind === "header");
      const stories = prev.layoutBlocks.filter((b) => b.kind === "story");
      const structs = prev.layoutBlocks.filter(
        (b) => b.kind !== "story" && b.kind !== "header",
      );
      const sorted = [...stories].sort((a, b) => {
        const sa = prev.stories.find((s) => s.id === a.storyId);
        const sb = prev.stories.find((s) => s.id === b.storyId);
        if (mode === "featured") {
          return (
            Number(sb?.featured) - Number(sa?.featured) ||
            (sa?.title || "").localeCompare(sb?.title || "")
          );
        }
        if (mode === "alpha")
          return (sa?.title || "").localeCompare(sb?.title || "");
        if (mode === "alpha-desc")
          return (sb?.title || "").localeCompare(sa?.title || "");
        if (mode === "date-asc")
          return (sa?.date || "").localeCompare(sb?.date || "");
        if (mode === "date-desc")
          return (sb?.date || "").localeCompare(sa?.date || "");
        return 0;
      });
      const message = structs.filter((b) => b.kind === "message");
      const tail = structs.filter((b) => b.kind !== "message");
      const pinned = header
        ? [header, ...message, ...sorted, ...tail]
        : [...message, ...sorted, ...tail];
      return { ...prev, layoutBlocks: pinned };
    });
  }

  const draftLabel = useMemo(() => {
    if (draftStatus.kind === "saving") return "Saving…";
    if (draftStatus.kind === "saved") return "Draft saved";
    if (draftStatus.kind === "error") return draftStatus.message;
    return "";
  }, [draftStatus]);

  return (
    <div className="studio-page relative space-y-6 pb-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 top-0 h-56 w-56 rounded-full bg-cos-brand-sage/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 top-20 h-48 w-48 rounded-full bg-cos-brand-mustard/15 blur-3xl"
      />

      <div>
        <Link
          href="/create-with-ai"
          className="mb-2 inline-block text-sm font-semibold text-cos-muted hover:text-cos-text"
        >
          ← Create with AI
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl text-cos-text sm:text-5xl">
              Newsletter Composer
            </h1>
            <p className="mt-2 max-w-xl text-sm text-cos-muted sm:text-base">
              Community email — message, stories, calendar, volunteers,
              sponsors, and footer socials.
            </p>
          </div>
          {draftLabel ? (
            <p className="text-xs font-semibold text-cos-muted">{draftLabel}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[22px] bg-cos-bg-alt p-3.5 lg:sticky lg:top-4">
          <p className="mb-2 px-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-cos-muted">
            Steps
          </p>
          {STEPS.map((s, index) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                "mb-1 w-full rounded-[14px] px-3 py-2.5 text-left text-sm font-semibold text-cos-text transition",
                step === s.id
                  ? "bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                  : "hover:bg-white/45",
              )}
            >
              {index + 1} · {s.label}
              <small className="mt-0.5 block text-xs font-medium text-cos-muted">
                {s.hint}
              </small>
            </button>
          ))}
        </aside>

        <div className="min-w-0 space-y-4">
          {step === "header" && (
            <HeaderStep
              state={state}
              patch={patch}
              uploadingHeader={uploadingHeader}
              headerFileRef={headerFileRef}
              onHeaderImage={onHeaderImage}
              onNext={() => nextStep("message")}
            />
          )}
          {step === "message" && (
            <MessageStep
              state={state}
              patch={patch}
              onBack={() => nextStep("header")}
              onNext={() => nextStep("stories")}
            />
          )}
          {step === "stories" && (
            <StoriesStep
              state={state}
              setStories={setStories}
              monthFilter={monthFilter}
              setMonthFilter={setMonthFilter}
              monthOptions={monthOptions}
              manualOpen={manualStoryOpen}
              setManualOpen={setManualStoryOpen}
              onBack={() => nextStep("message")}
              onNext={() => nextStep("mustdos")}
            />
          )}
          {step === "mustdos" && (
            <MustDosStep
              state={state}
              events={events}
              patch={patch}
              monthFilter={monthFilter}
              setMonthFilter={setMonthFilter}
              monthOptions={monthOptions}
              manualVolOpen={manualVolOpen}
              setManualVolOpen={setManualVolOpen}
              onBack={() => nextStep("stories")}
              onNext={() => nextStep("footer")}
            />
          )}
          {step === "footer" && (
            <FooterStep
              state={state}
              patch={patch}
              onBack={() => nextStep("mustdos")}
              onNext={() => nextStep("layout")}
            />
          )}
          {step === "layout" && (
            <LayoutStep
              state={state}
              patch={patch}
              layoutSort={layoutSort}
              onSort={sortLayout}
              dragId={dragId}
              onBack={() => nextStep("footer")}
              onNext={() => nextStep("preview")}
            />
          )}
          {step === "preview" && (
            <PreviewStep
              state={state}
              previewMode={previewMode}
              setPreviewMode={setPreviewMode}
              onBack={() => nextStep("layout")}
              onNext={() => nextStep("send")}
            />
          )}
          {step === "send" && (
            <SendStep
              state={state}
              copyDone={copyDone}
              onCopy={copyHtml}
              onBack={() => nextStep("preview")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PanelHead({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl text-cos-text sm:text-3xl">
          {title}
        </h2>
        <p className="mt-1 max-w-xl text-sm text-cos-muted">{body}</p>
      </div>
      {actions}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-cos-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="rounded-[14px] border border-cos-border bg-cos-bg p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-cos-muted">
        {label}
      </p>
      <div className="flex items-center gap-2.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-11 cursor-pointer rounded-[10px] border-0 bg-transparent p-0"
        />
        <span className="font-mono text-xs font-semibold text-cos-muted">
          {value}
        </span>
      </div>
    </div>
  );
}

function inputClass() {
  return "w-full rounded-xl border border-cos-border bg-cos-card px-3 py-2.5 text-sm text-cos-text outline-none focus:border-cos-brand-sage";
}

function LivePane({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)] lg:sticky lg:top-4">
      <p className="border-b border-cos-border px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-cos-muted">
        {label}
      </p>
      <div className="bg-[linear-gradient(160deg,rgba(107,129,113,0.08),rgba(212,168,75,0.1))] p-3.5">
        {children}
      </div>
    </div>
  );
}

/* ——— Steps ——— */

function HeaderStep({
  state,
  patch,
  uploadingHeader,
  headerFileRef,
  onHeaderImage,
  onNext,
}: {
  state: NewsletterComposerState;
  patch: (fn: (p: NewsletterComposerState) => NewsletterComposerState) => void;
  uploadingHeader: boolean;
  headerFileRef: RefObject<HTMLInputElement | null>;
  onHeaderImage: (file: File | null) => void;
  onNext: () => void;
}) {
  return (
    <section className="space-y-4">
      <PanelHead
        title="Header & issue"
        body="Subject, brand colors, and optional header image — live preview on the right."
        actions={
          <Button type="button" onClick={onNext}>
            Save → Message
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <SettingsBox
            title="Issue details"
            description="What people see in the inbox before they open."
          >
            <div className="space-y-3">
              <Field label="Subject line">
                <input
                  className={inputClass()}
                  value={state.subject}
                  onChange={(e) =>
                    patch((p) => ({ ...p, subject: e.target.value }))
                  }
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Issue name">
                  <input
                    className={inputClass()}
                    value={state.issueName}
                    onChange={(e) =>
                      patch((p) => ({ ...p, issueName: e.target.value }))
                    }
                  />
                </Field>
                <Field label="From">
                  <input
                    className={inputClass()}
                    value={state.fromName}
                    onChange={(e) =>
                      patch((p) => ({ ...p, fromName: e.target.value }))
                    }
                  />
                </Field>
              </div>
            </div>
          </SettingsBox>

          <SettingsBox
            title="Brand colors"
            description="Updates the live preview as you pick."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ColorField
                label="Primary"
                value={state.colors.primary}
                onChange={(hex) =>
                  patch((p) => ({
                    ...p,
                    colors: { ...p.colors, primary: hex },
                  }))
                }
              />
              <ColorField
                label="Accent"
                value={state.colors.accent}
                onChange={(hex) =>
                  patch((p) => ({
                    ...p,
                    colors: { ...p.colors, accent: hex },
                  }))
                }
              />
              <ColorField
                label="Message bar"
                value={state.colors.messageBar}
                onChange={(hex) =>
                  patch((p) => ({
                    ...p,
                    colors: { ...p.colors, messageBar: hex },
                  }))
                }
              />
              <ColorField
                label="CTA / featured"
                value={state.colors.cta}
                onChange={(hex) =>
                  patch((p) => ({
                    ...p,
                    colors: { ...p.colors, cta: hex },
                  }))
                }
              />
            </div>
          </SettingsBox>

          <SettingsBox
            title="Header image"
            description="Optional banner. Large files compress automatically."
          >
            <input
              ref={headerFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onHeaderImage(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={uploadingHeader}
              onClick={() => headerFileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-cos-brand-sage/40 bg-cos-bg px-4 py-8 text-center transition hover:border-cos-brand-sage hover:bg-[#f6f3ec] disabled:opacity-60"
            >
              <Upload className="h-5 w-5 text-cos-muted" />
              <strong className="text-sm text-cos-text">
                {uploadingHeader
                  ? "Compressing & uploading…"
                  : "Click to upload header image"}
              </strong>
              <span className="text-xs text-cos-muted">
                JPG, PNG, or WebP · compressed if too large
              </span>
            </button>
            {state.headerImageUrl ? (
              <div className="mt-3 space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state.headerImageUrl}
                  alt="Header"
                  className="max-h-40 w-full rounded-xl object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    patch((p) => ({ ...p, headerImageUrl: null }))
                  }
                >
                  Remove image
                </Button>
              </div>
            ) : null}
          </SettingsBox>
        </div>
        <LivePane label="Live header preview">
          <EmailPreviewPhone state={state} maxHeightClass="max-h-[440px]" />
        </LivePane>
      </div>
    </section>
  );
}

function MessageStep({
  state,
  patch,
  onBack,
  onNext,
}: {
  state: NewsletterComposerState;
  patch: (fn: (p: NewsletterComposerState) => NewsletterComposerState) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <section className="space-y-4">
      <PanelHead
        title="Opening message"
        body="Leadership welcome — short, scannable, human."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onBack}>
              ← Header
            </Button>
            <Button type="button" onClick={onNext}>
              Save → Stories
            </Button>
          </div>
        }
      />
      <SettingsBox title="From leadership">
        <div className="space-y-3">
          <Field label="From names">
            <input
              className={inputClass()}
              value={state.leadershipNames}
              onChange={(e) =>
                patch((p) => ({ ...p, leadershipNames: e.target.value }))
              }
              placeholder="Trent Satterfield · Marie Miller"
            />
          </Field>
          <Field label="Message">
            <textarea
              className={cn(inputClass(), "min-h-[120px]")}
              value={state.leadershipMessage}
              onChange={(e) =>
                patch((p) => ({ ...p, leadershipMessage: e.target.value }))
              }
            />
          </Field>
        </div>
      </SettingsBox>
      <SettingsBox
        title="Optional org note"
        description="Separate from the leadership message — sponsorship, store, etc."
      >
        <textarea
          className={cn(inputClass(), "min-h-[96px]")}
          value={state.ptoNote}
          onChange={(e) => patch((p) => ({ ...p, ptoNote: e.target.value }))}
          placeholder="Short org add-on…"
        />
      </SettingsBox>
    </section>
  );
}

function MonthYearFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-cos-muted">
      Month
      <select
        className={cn(inputClass(), "w-auto min-w-[180px]")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((month) => (
          <option key={month} value={month}>
            {formatMonthLabel(month)}
          </option>
        ))}
      </select>
    </label>
  );
}

function StoriesStep({
  state,
  setStories,
  monthFilter,
  setMonthFilter,
  monthOptions,
  manualOpen,
  setManualOpen,
  onBack,
  onNext,
}: {
  state: NewsletterComposerState;
  setStories: (
    updater: (stories: NewsletterStory[]) => NewsletterStory[],
  ) => void;
  monthFilter: string;
  setMonthFilter: (v: string) => void;
  monthOptions: string[];
  manualOpen: boolean;
  setManualOpen: (v: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftMsg, setDraftMsg] = useState("");
  const [draftCta, setDraftCta] = useState("Learn more →");
  const [draftLink, setDraftLink] = useState("");
  const [draftImageUrl, setDraftImageUrl] = useState<string | null>(null);
  const [draftUploading, setDraftUploading] = useState(false);
  const draftFileRef = useRef<HTMLInputElement>(null);

  const eventStories = state.stories.filter(
    (s) =>
      s.source === "event" &&
      (!s.date || s.date.slice(0, 7) === monthFilter),
  );
  const otherStories = state.stories.filter((s) => s.source !== "event");

  function toggleFeatured(id: string) {
    setStories((stories) =>
      stories.map((s) => {
        if (s.id === id) {
          const next = !s.featured;
          return { ...s, featured: next, included: next ? true : s.included };
        }
        return { ...s, featured: false };
      }),
    );
  }

  function updateStory(id: string, patchStory: Partial<NewsletterStory>) {
    setStories((stories) =>
      stories.map((s) => (s.id === id ? { ...s, ...patchStory } : s)),
    );
  }

  async function onDraftImage(file: File | null) {
    if (!file) return;
    setDraftUploading(true);
    try {
      const compressed = await compressImageForUpload(file, {
        maxEdge: 900,
        maxBytes: 500 * 1024,
      });
      const uploaded = await uploadNewsletterComposerArtworkAction({
        assetId: `manual-${Date.now()}`,
        dataUrl: compressed.dataUrl,
      });
      if (!uploaded.success || !uploaded.url) {
        throw new Error(uploaded.error || "Upload failed");
      }
      setDraftImageUrl(uploaded.url);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Could not upload story image.",
      );
    } finally {
      setDraftUploading(false);
    }
  }

  function resetManualDraft() {
    setDraftTitle("");
    setDraftDate("");
    setDraftMsg("");
    setDraftCta("Learn more →");
    setDraftLink("");
    setDraftImageUrl(null);
  }

  function addManual() {
    if (!draftTitle.trim()) return;
    const story: NewsletterStory = {
      id: newId("manual"),
      source: "manual",
      eventId: null,
      title: draftTitle.trim(),
      date: draftDate || null,
      meta: "Manual story",
      messaging: draftMsg.trim() || "Update for your community.",
      ctaLabel: draftCta.trim() || "Learn more →",
      ctaUrl: draftLink.trim(),
      imageUrl: draftImageUrl,
      included: true,
      featured: false,
    };
    setStories((stories) => [story, ...stories]);
    resetManualDraft();
    setManualOpen(false);
  }

  return (
    <section className="space-y-4">
      <PanelHead
        title="Featured stories"
        body="Each story gets short messaging + a CTA link — standard for community newsletters."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onBack}>
              ← Message
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setManualOpen(!manualOpen)}
            >
              <Plus className="h-4 w-4" /> Add story
            </Button>
            <Button type="button" onClick={onNext}>
              Save → Must-dos
            </Button>
          </div>
        }
      />

      <div className="flex justify-end">
        <MonthYearFilter
          value={monthFilter}
          options={monthOptions}
          onChange={setMonthFilter}
        />
      </div>

      {manualOpen ? (
        <SettingsBox title="Manual story">
          <div className="space-y-3">
            <div className="flex flex-wrap items-start gap-3">
              <input
                ref={draftFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onDraftImage(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={draftUploading}
                onClick={() => draftFileRef.current?.click()}
                className={cn(
                  "flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-cos-border bg-cos-bg text-center transition hover:border-cos-brand-sage disabled:opacity-60",
                  !draftImageUrl &&
                    "border-dashed border-cos-brand-sage/50 bg-[rgba(107,129,113,0.06)]",
                )}
              >
                {draftImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draftImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-cos-muted" />
                    <span className="px-1 text-[10px] font-semibold text-cos-muted">
                      {draftUploading ? "…" : "Photo"}
                    </span>
                  </>
                )}
              </button>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs text-cos-muted">
                  Optional photo — helps break up the email so stories don’t
                  feel like one long list.
                </p>
                {draftImageUrl ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-cos-muted hover:text-cos-text"
                    onClick={() => setDraftImageUrl(null)}
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title">
                <input
                  className={inputClass()}
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                />
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  className={inputClass()}
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Messaging">
              <textarea
                className={cn(inputClass(), "min-h-[72px]")}
                value={draftMsg}
                onChange={(e) => setDraftMsg(e.target.value)}
                placeholder="2–3 sentences people need to know…"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="CTA button">
                <input
                  className={inputClass()}
                  value={draftCta}
                  onChange={(e) => setDraftCta(e.target.value)}
                />
              </Field>
              <Field label="CTA link">
                <input
                  className={inputClass()}
                  value={draftLink}
                  onChange={(e) => setDraftLink(e.target.value)}
                  placeholder="https://…"
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={addManual}>
                Add to stories
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetManualDraft();
                  setManualOpen(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SettingsBox>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsBox
          title="From events"
          description="Check to include · edit messaging & CTA · ★ to feature."
        >
          <div className="space-y-2">
            {eventStories.length === 0 ? (
              <p className="text-sm text-cos-muted">
                No events in {formatMonthLabel(monthFilter)}. Change the month
                filter or + Add story.
              </p>
            ) : (
              eventStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onToggle={() =>
                    updateStory(story.id, { included: !story.included })
                  }
                  onFeature={() => toggleFeatured(story.id)}
                  onChange={(p) => updateStory(story.id, p)}
                />
              ))
            )}
          </div>
        </SettingsBox>
        <SettingsBox
          title="Manual & other"
          description="Stories you added by hand."
        >
          <div className="space-y-2">
            {otherStories.length === 0 ? (
              <p className="text-sm text-cos-muted">
                Use + Add story for one-off items.
              </p>
            ) : (
              otherStories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onToggle={() =>
                    updateStory(story.id, { included: !story.included })
                  }
                  onFeature={() => toggleFeatured(story.id)}
                  onChange={(p) => updateStory(story.id, p)}
                  onDelete={
                    story.source === "manual"
                      ? () =>
                          setStories((stories) =>
                            stories.filter((s) => s.id !== story.id),
                          )
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </SettingsBox>
      </div>
    </section>
  );
}

function StoryCard({
  story,
  onToggle,
  onFeature,
  onChange,
  onDelete,
}: {
  story: NewsletterStory;
  onToggle: () => void;
  onFeature: () => void;
  onChange: (p: Partial<NewsletterStory>) => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wasIncluded = useRef(story.included);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Open when newly checked; close when unchecked.
    if (story.included && !wasIncluded.current) setOpen(true);
    if (!story.included) setOpen(false);
    wasIncluded.current = story.included;
  }, [story.included]);

  async function onStoryImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImageForUpload(file, {
        maxEdge: 900,
        maxBytes: 500 * 1024,
      });
      const uploaded = await uploadNewsletterComposerArtworkAction({
        assetId: `story-${story.id}`,
        dataUrl: compressed.dataUrl,
      });
      if (!uploaded.success || !uploaded.url) {
        throw new Error(uploaded.error || "Upload failed");
      }
      onChange({ imageUrl: uploaded.url });
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Could not upload story image.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border bg-cos-card transition",
        story.featured
          ? "border-[#d4a84b] shadow-[0_0_0_3px_rgba(212,168,75,0.22)]"
          : story.included
            ? "border-cos-brand-sage"
            : "border-cos-border",
      )}
    >
      <button
        type="button"
        className="grid w-full grid-cols-[auto_auto_1fr_auto] items-start gap-2.5 px-3 py-2.5 text-left"
        onClick={() => {
          if (story.included) setOpen((v) => !v);
        }}
        aria-expanded={story.included ? open : false}
      >
        <input
          type="checkbox"
          checked={story.included}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="mt-3"
        />
        <ArtThumb src={story.imageUrl} alt="" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-cos-text">{story.title}</p>
          <p className="text-xs text-cos-muted">
            {story.meta}
            {story.included && !open ? " · click to edit" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onDelete ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onDelete();
                }
              }}
              className="rounded-lg p-1 text-cos-muted hover:bg-cos-bg hover:text-cos-text"
              aria-label="Delete story"
            >
              <Trash2 className="h-4 w-4" />
            </span>
          ) : null}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onFeature();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onFeature();
              }
            }}
            className={cn(
              "rounded-lg p-1",
              story.featured
                ? "text-[#e0a820]"
                : "text-[#c9c2b4] hover:bg-[rgba(212,168,75,0.12)]",
            )}
            aria-label={story.featured ? "Featured" : "Mark featured"}
          >
            <Star
              className="h-5 w-5"
              fill={story.featured ? "currentColor" : "none"}
            />
          </span>
          {story.included ? (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-cos-muted transition-transform",
                open && "rotate-180",
              )}
            />
          ) : null}
        </div>
      </button>
      {story.included && open ? (
        <div
          className="space-y-2 border-t border-cos-border bg-[rgba(249,247,242,0.65)] px-3 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onStoryImage(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cos-border bg-cos-bg text-[10px] font-semibold text-cos-muted hover:border-cos-brand-sage disabled:opacity-60"
            >
              {story.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={story.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : uploading ? (
                "…"
              ) : (
                <span className="flex flex-col items-center gap-0.5 px-1">
                  <Upload className="h-3.5 w-3.5" />
                  Photo
                </span>
              )}
            </button>
            <div className="min-w-0 text-xs text-cos-muted">
              {story.imageUrl ? (
                <button
                  type="button"
                  className="font-semibold hover:text-cos-text"
                  onClick={() => onChange({ imageUrl: null })}
                >
                  Remove photo
                </button>
              ) : (
                <span>Add a photo so this story stands out in the email.</span>
              )}
            </div>
          </div>
          <Field label="Messaging">
            <textarea
              className={cn(inputClass(), "min-h-[64px] text-[13px]")}
              value={story.messaging}
              onChange={(e) => onChange({ messaging: e.target.value })}
            />
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="CTA button">
              <input
                className={cn(inputClass(), "text-[13px]")}
                value={story.ctaLabel}
                onChange={(e) => onChange({ ctaLabel: e.target.value })}
              />
            </Field>
            <Field label="CTA link">
              <input
                className={cn(inputClass(), "text-[13px]")}
                value={story.ctaUrl}
                onChange={(e) => onChange({ ctaUrl: e.target.value })}
                placeholder="https://…"
              />
            </Field>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SponsorRow({
  sponsor,
  onChange,
  onDelete,
}: {
  sponsor: NewsletterSponsor;
  onChange: (next: Partial<NewsletterSponsor>) => void;
  onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onLogo(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImageForUpload(file, {
        maxEdge: 800,
        maxBytes: 400 * 1024,
      });
      const uploaded = await uploadNewsletterComposerArtworkAction({
        assetId: `sponsor-${sponsor.id}`,
        dataUrl: compressed.dataUrl,
      });
      if (!uploaded.success || !uploaded.url) {
        throw new Error(uploaded.error || "Upload failed");
      }
      onChange({ imageUrl: uploaded.url });
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Could not upload sponsor logo.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-cos-brand-sage/35 p-3">
      <div className="flex flex-wrap items-start gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onLogo(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex h-[88px] w-[140px] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-cos-border bg-cos-bg text-center transition hover:border-cos-brand-sage disabled:opacity-60",
            !sponsor.imageUrl && "border-dashed border-[#d4a84b]/70 bg-[#fffdf8]",
          )}
        >
          {sponsor.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sponsor.imageUrl}
              alt={sponsor.name || "Sponsor logo"}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <>
              <Upload className="h-4 w-4 text-cos-muted" />
              <span className="px-2 text-[11px] font-semibold text-cos-text">
                {uploading ? "Uploading…" : "Logo required"}
              </span>
            </>
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            className={inputClass()}
            value={sponsor.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Partner name"
          />
          <input
            className={inputClass()}
            value={sponsor.note}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Thank-you note"
          />
          <input
            className={inputClass()}
            value={sponsor.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="Sponsor link (optional)"
          />
          {!sponsor.imageUrl ? (
            <p className="text-xs font-semibold text-[#a67c1a]">
              Upload a logo — sponsors without an image won’t appear in the email.
            </p>
          ) : (
            <button
              type="button"
              className="text-xs font-semibold text-cos-muted hover:text-cos-text"
              onClick={() => onChange({ imageUrl: null })}
            >
              Remove logo
            </button>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function VolunteerAskCard({
  index,
  ask,
  onToggle,
  onChange,
  onDelete,
}: {
  index: number;
  ask: NewsletterVolunteerAsk;
  onToggle: () => void;
  onChange: (next: Partial<NewsletterVolunteerAsk>) => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wasIncluded = useRef(ask.included);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (ask.included && !wasIncluded.current) setOpen(true);
    if (!ask.included) setOpen(false);
    wasIncluded.current = ask.included;
  }, [ask.included]);

  async function onAskImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImageForUpload(file, {
        maxEdge: 800,
        maxBytes: 400 * 1024,
      });
      const uploaded = await uploadNewsletterComposerArtworkAction({
        assetId: `vol-${ask.id}`,
        dataUrl: compressed.dataUrl,
      });
      if (!uploaded.success || !uploaded.url) {
        throw new Error(uploaded.error || "Upload failed");
      }
      onChange({ imageUrl: uploaded.url });
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Could not upload photo.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border",
        ask.included ? "border-cos-brand-sage" : "border-cos-border",
      )}
    >
      <button
        type="button"
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
        onClick={() => {
          if (ask.included) setOpen((v) => !v);
        }}
        aria-expanded={ask.included ? open : false}
      >
        <input
          type="checkbox"
          className="mt-3"
          checked={ask.included}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
        <ArtThumb src={ask.imageUrl} alt="" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {index + 1}. {ask.title}
          </p>
          <p className="truncate text-xs text-cos-muted">
            {ask.signupUrl || "No signup URL"}
            {ask.source === "event" ? " · from event" : ""}
            {ask.included && !open ? " · click to edit" : ""}
          </p>
          {!ask.included ? (
            <p className="mt-1 text-xs text-cos-muted">{ask.details}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {onDelete ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onDelete();
                }
              }}
              className="text-cos-muted hover:text-cos-text"
            >
              <Trash2 className="h-4 w-4" />
            </span>
          ) : null}
          {ask.included ? (
            <ChevronDown
              className={cn(
                "h-4 w-4 text-cos-muted transition-transform",
                open && "rotate-180",
              )}
            />
          ) : null}
        </div>
      </button>
      {ask.included && open ? (
        <div className="space-y-2 border-t border-cos-border bg-[rgba(249,247,242,0.65)] px-3 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onAskImage(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cos-border bg-cos-bg text-[10px] font-semibold text-cos-muted hover:border-cos-brand-sage disabled:opacity-60"
            >
              {ask.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ask.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : uploading ? (
                "…"
              ) : (
                <span className="flex flex-col items-center gap-0.5 px-1">
                  <Upload className="h-3.5 w-3.5" />
                  Photo
                </span>
              )}
            </button>
            <div className="min-w-0 text-xs text-cos-muted">
              {ask.imageUrl ? (
                <button
                  type="button"
                  className="font-semibold hover:text-cos-text"
                  onClick={() => onChange({ imageUrl: null })}
                >
                  Remove photo
                </button>
              ) : (
                <span>Photo on the right in the email — signals a signup spot.</span>
              )}
            </div>
          </div>
          <input
            className={cn(inputClass(), "text-[13px]")}
            value={ask.details}
            onChange={(e) => onChange({ details: e.target.value })}
          />
          <input
            className={cn(inputClass(), "text-[13px]")}
            value={ask.signupUrl}
            onChange={(e) => onChange({ signupUrl: e.target.value })}
            placeholder="Signup URL"
          />
        </div>
      ) : null}
    </div>
  );
}

function MustDosStep({
  state,
  events,
  patch,
  monthFilter,
  setMonthFilter,
  monthOptions,
  manualVolOpen,
  setManualVolOpen,
  onBack,
  onNext,
}: {
  state: NewsletterComposerState;
  events: NewsletterComposerEvent[];
  patch: (fn: (p: NewsletterComposerState) => NewsletterComposerState) => void;
  monthFilter: string;
  setMonthFilter: (v: string) => void;
  monthOptions: string[];
  manualVolOpen: boolean;
  setManualVolOpen: (v: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [volTitle, setVolTitle] = useState("");
  const [volDate, setVolDate] = useState("");
  const [volDetails, setVolDetails] = useState("");
  const [volUrl, setVolUrl] = useState("");

  const eventAsks = state.volunteerAsks.filter(
    (v) =>
      v.source === "event" &&
      (!v.date || v.date.slice(0, 7) === monthFilter),
  );
  const manualAsks = state.volunteerAsks.filter((v) => v.source === "manual");
  const visibleAsks = [...eventAsks, ...manualAsks];

  const monthEvents = useMemo(
    () =>
      events
        .filter((e) => e.date && e.date.slice(0, 7) === monthFilter)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events, monthFilter],
  );
  const selectedEventIds = useMemo(
    () =>
      new Set(
        state.calendarChips
          .map((c) => c.eventId)
          .filter((id): id is string => Boolean(id)),
      ),
    [state.calendarChips],
  );
  const manualChips = state.calendarChips.filter((c) => !c.eventId);

  function toggleEventChip(event: NewsletterComposerEvent) {
    patch((p) => {
      const exists = p.calendarChips.some((c) => c.eventId === event.id);
      if (exists) {
        return {
          ...p,
          calendarChips: p.calendarChips.filter((c) => c.eventId !== event.id),
        };
      }
      return {
        ...p,
        calendarChips: [...p.calendarChips, calendarChipFromEvent(event)],
      };
    });
  }

  function addVol() {
    if (!volTitle.trim()) return;
    const ask: NewsletterVolunteerAsk = {
      id: newId("vol"),
      eventId: null,
      source: "manual",
      title: volTitle.trim(),
      date: volDate || null,
      details: volDetails.trim() || "Volunteer ask",
      signupUrl: volUrl.trim(),
      imageUrl: null,
      included: true,
    };
    patch((p) => ({ ...p, volunteerAsks: [...p.volunteerAsks, ask] }));
    setVolTitle("");
    setVolDetails("");
    setVolUrl("");
    setManualVolOpen(false);
  }

  return (
    <section className="space-y-4">
      <PanelHead
        title="Must-dos & sponsors"
        body="Calendar chips, volunteer asks from event pages, and sponsorship."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onBack}>
              ← Stories
            </Button>
            <Button type="button" onClick={onNext}>
              Save → Footer
            </Button>
          </div>
        }
      />

      <div className="flex justify-end">
        <MonthYearFilter
          value={monthFilter}
          options={monthOptions}
          onChange={setMonthFilter}
        />
      </div>

      <SettingsBox
        title="Upcoming calendar"
        description="Click events to include as chips — add manual dates anytime."
        actions={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              patch((p) => ({
                ...p,
                calendarChips: [
                  ...p.calendarChips,
                  {
                    id: newId("cal"),
                    label: "New date",
                    eventId: null,
                    date: null,
                  },
                ],
              }))
            }
          >
            <Plus className="h-4 w-4" /> Add date
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-cos-muted">
              From calendar · {formatMonthLabel(monthFilter)}
            </p>
            {monthEvents.length === 0 ? (
              <p className="text-sm text-cos-muted">
                No events this month. Change the filter or + Add date.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {monthEvents.map((event) => {
                  const on = selectedEventIds.has(event.id);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => toggleEventChip(event)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-semibold transition",
                        on
                          ? "border-cos-brand-sage bg-[rgba(107,129,113,0.14)] text-[#2f4a3c]"
                          : "border-cos-border bg-cos-card text-cos-muted hover:border-cos-brand-sage hover:text-cos-text",
                      )}
                    >
                      <ArtThumb
                        src={event.imageUrl}
                        alt=""
                        className="h-7 w-7 rounded-full"
                      />
                      <span className="max-w-[220px] truncate">
                        {calendarChipFromEvent(event).label}
                      </span>
                      {on ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          On
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-cos-muted">
              Manual dates
            </p>
            {manualChips.length === 0 ? (
              <p className="text-sm text-cos-muted">
                Optional — use + Add date for one-offs not on the calendar.
              </p>
            ) : (
              <div className="space-y-2">
                {manualChips.map((chip) => (
                  <div key={chip.id} className="flex gap-2">
                    <input
                      className={inputClass()}
                      value={chip.label}
                      onChange={(e) =>
                        patch((p) => ({
                          ...p,
                          calendarChips: p.calendarChips.map((c) =>
                            c.id === chip.id
                              ? { ...c, label: e.target.value }
                              : c,
                          ),
                        }))
                      }
                      placeholder="e.g. Aug 26 · Early release"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        patch((p) => ({
                          ...p,
                          calendarChips: p.calendarChips.filter(
                            (c) => c.id !== chip.id,
                          ),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SettingsBox>

      <SettingsBox
        title="Volunteer asks"
        description="Pulled from event Volunteer pages — check the ones to include."
        actions={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setManualVolOpen(!manualVolOpen)}
          >
            <Plus className="h-4 w-4" /> Add ask
          </Button>
        }
      >
        {manualVolOpen ? (
          <div className="mb-3 space-y-2 rounded-2xl border border-cos-border bg-cos-bg p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Ask title">
                <input
                  className={inputClass()}
                  value={volTitle}
                  onChange={(e) => setVolTitle(e.target.value)}
                />
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  className={inputClass()}
                  value={volDate}
                  onChange={(e) => setVolDate(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Details">
              <input
                className={inputClass()}
                value={volDetails}
                onChange={(e) => setVolDetails(e.target.value)}
              />
            </Field>
            <Field label="Signup link">
              <input
                className={inputClass()}
                value={volUrl}
                onChange={(e) => setVolUrl(e.target.value)}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={addVol}>
                Add volunteer ask
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setManualVolOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          {visibleAsks.length === 0 ? (
            <p className="text-sm text-cos-muted">
              No volunteer signup links for {formatMonthLabel(monthFilter)}.
              Add a link on an event’s Volunteer page, or + Add ask.
            </p>
          ) : (
            visibleAsks.map((ask, i) => (
              <VolunteerAskCard
                key={ask.id}
                index={i}
                ask={ask}
                onToggle={() =>
                  patch((p) => ({
                    ...p,
                    volunteerAsks: p.volunteerAsks.map((v) =>
                      v.id === ask.id ? { ...v, included: !v.included } : v,
                    ),
                  }))
                }
                onChange={(next) =>
                  patch((p) => ({
                    ...p,
                    volunteerAsks: p.volunteerAsks.map((v) =>
                      v.id === ask.id ? { ...v, ...next } : v,
                    ),
                  }))
                }
                onDelete={
                  ask.source === "manual"
                    ? () =>
                        patch((p) => ({
                          ...p,
                          volunteerAsks: p.volunteerAsks.filter(
                            (v) => v.id !== ask.id,
                          ),
                        }))
                    : undefined
                }
              />
            ))
          )}
        </div>
      </SettingsBox>

      <SettingsBox
        title="Sponsorship area"
        description="Every sponsor needs a logo — it shows in the email."
      >
        <div className="space-y-3">
          {state.sponsors.map((sp) => (
            <SponsorRow
              key={sp.id}
              sponsor={sp}
              onChange={(next) =>
                patch((p) => ({
                  ...p,
                  sponsors: p.sponsors.map((s) =>
                    s.id === sp.id ? { ...s, ...next } : s,
                  ),
                }))
              }
              onDelete={() =>
                patch((p) => ({
                  ...p,
                  sponsors: p.sponsors.filter((s) => s.id !== sp.id),
                }))
              }
            />
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              patch((p) => ({
                ...p,
                sponsors: [
                  ...p.sponsors,
                  {
                    id: newId("sp"),
                    name: "New partner",
                    note: "",
                    url: "",
                    imageUrl: null,
                  },
                ],
              }))
            }
          >
            <Plus className="h-4 w-4" /> Add sponsor
          </Button>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sponsor CTA">
              <input
                className={inputClass()}
                value={state.sponsorCtaLabel}
                onChange={(e) =>
                  patch((p) => ({ ...p, sponsorCtaLabel: e.target.value }))
                }
              />
            </Field>
            <Field label="Sponsor link">
              <input
                className={inputClass()}
                value={state.sponsorCtaUrl}
                onChange={(e) =>
                  patch((p) => ({ ...p, sponsorCtaUrl: e.target.value }))
                }
              />
            </Field>
          </div>
        </div>
      </SettingsBox>

      <SettingsBox title="Helpful links strip">
        <div className="space-y-2">
          {state.helpfulLinks.map((link) => (
            <div
              key={link.id}
              className="grid gap-2 sm:grid-cols-[60px_1fr_1.2fr]"
            >
              <input
                className={inputClass()}
                value={link.emoji}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    helpfulLinks: p.helpfulLinks.map((l) =>
                      l.id === link.id ? { ...l, emoji: e.target.value } : l,
                    ),
                  }))
                }
              />
              <input
                className={inputClass()}
                value={link.label}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    helpfulLinks: p.helpfulLinks.map((l) =>
                      l.id === link.id ? { ...l, label: e.target.value } : l,
                    ),
                  }))
                }
              />
              <input
                className={inputClass()}
                value={link.url}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    helpfulLinks: p.helpfulLinks.map((l) =>
                      l.id === link.id ? { ...l, url: e.target.value } : l,
                    ),
                  }))
                }
                placeholder="https://…"
              />
            </div>
          ))}
        </div>
      </SettingsBox>
    </section>
  );
}

function FooterStep({
  state,
  patch,
  onBack,
  onNext,
}: {
  state: NewsletterComposerState;
  patch: (fn: (p: NewsletterComposerState) => NewsletterComposerState) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <section className="space-y-4">
      <PanelHead
        title="Footer"
        body="Socials, Get Involved CTA, and fine print — live preview on the right."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onBack}>
              ← Must-dos
            </Button>
            <Button type="button" onClick={onNext}>
              Save → Layout
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <SettingsBox
            title="Social links"
            description="Shown at the bottom of every email."
          >
            <div className="space-y-2">
              {state.socials.map((social) => (
                <div
                  key={social.id}
                  className="grid grid-cols-[120px_1fr] items-center gap-2"
                >
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={social.enabled}
                      onChange={() =>
                        patch((p) => ({
                          ...p,
                          socials: p.socials.map((s) =>
                            s.id === social.id
                              ? { ...s, enabled: !s.enabled }
                              : s,
                          ),
                        }))
                      }
                    />
                    {social.label}
                  </label>
                  <input
                    className={inputClass()}
                    value={social.url}
                    onChange={(e) =>
                      patch((p) => ({
                        ...p,
                        socials: p.socials.map((s) =>
                          s.id === social.id
                            ? { ...s, url: e.target.value }
                            : s,
                        ),
                      }))
                    }
                    placeholder="URL"
                  />
                </div>
              ))}
            </div>
          </SettingsBox>
          <SettingsBox title="Get Involved CTA">
            <div className="space-y-3">
              <Field label="CTA headline">
                <input
                  className={inputClass()}
                  value={state.footerCtaHeadline}
                  onChange={(e) =>
                    patch((p) => ({
                      ...p,
                      footerCtaHeadline: e.target.value,
                    }))
                  }
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Button label">
                  <input
                    className={inputClass()}
                    value={state.footerCtaLabel}
                    onChange={(e) =>
                      patch((p) => ({ ...p, footerCtaLabel: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Link">
                  <input
                    className={inputClass()}
                    value={state.footerCtaUrl}
                    onChange={(e) =>
                      patch((p) => ({ ...p, footerCtaUrl: e.target.value }))
                    }
                  />
                </Field>
              </div>
            </div>
          </SettingsBox>
          <SettingsBox title="Footer fine print">
            <textarea
              className={cn(inputClass(), "min-h-[80px]")}
              value={state.footerFinePrint}
              onChange={(e) =>
                patch((p) => ({ ...p, footerFinePrint: e.target.value }))
              }
            />
          </SettingsBox>
        </div>
        <LivePane label="Live footer preview">
          <EmailPreviewPhone
            state={state}
            showInboxBar={false}
            scrollToEnd
            maxHeightClass="max-h-[440px]"
          />
        </LivePane>
      </div>
    </section>
  );
}

function LayoutStep({
  state,
  patch,
  layoutSort,
  onSort,
  dragId,
  onBack,
  onNext,
}: {
  state: NewsletterComposerState;
  patch: (fn: (p: NewsletterComposerState) => NewsletterComposerState) => void;
  layoutSort: string;
  onSort: (mode: string) => void;
  dragId: MutableRefObject<string | null>;
  onBack: () => void;
  onNext: () => void;
}) {
  const blocks = useMemo(() => {
    const header = state.layoutBlocks.find((b) => b.kind === "header");
    const rest = state.layoutBlocks.filter((b) => b.kind !== "header");
    return header ? [header, ...rest] : rest;
  }, [state.layoutBlocks]);

  function onDragStart(id: string, pinned: boolean) {
    if (pinned) return;
    dragId.current = id;
  }
  function onDragOver(e: DragEvent, overId: string, overPinned: boolean) {
    e.preventDefault();
    const from = dragId.current;
    if (!from || from === overId || overPinned) return;
    patch((prev) => {
      const header = prev.layoutBlocks.find((b) => b.kind === "header");
      const movable = prev.layoutBlocks.filter((b) => b.kind !== "header");
      const fromIdx = movable.findIndex((b) => b.id === from);
      const toIdx = movable.findIndex((b) => b.id === overId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...movable];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return {
        ...prev,
        layoutBlocks: header ? [header, ...next] : next,
      };
    });
  }

  return (
    <section className="space-y-4">
      <PanelHead
        title="Layout"
        body="Hero stays fixed at the top. Drag the rest — Featured ★ stays highlighted."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onBack}>
              ← Footer
            </Button>
            <Button type="button" onClick={onNext}>
              Save → Preview
            </Button>
          </div>
        }
      />
      <SettingsBox title="Blocks">
        <div className="mb-4 flex justify-end">
          <select
            className={cn(inputClass(), "w-auto min-w-[180px]")}
            value={layoutSort}
            onChange={(e) => onSort(e.target.value)}
            aria-label="Order story blocks"
          >
            <option value="manual">Manual (drag)</option>
            <option value="date-asc">Date · earliest first</option>
            <option value="date-desc">Date · latest first</option>
            <option value="alpha">A → Z</option>
            <option value="alpha-desc">Z → A</option>
            <option value="featured">Featured first</option>
          </select>
        </div>
        <div className="space-y-2">
          {blocks.map((block) => {
            const story =
              block.kind === "story"
                ? state.stories.find((s) => s.id === block.storyId)
                : null;
            const featured = Boolean(story?.featured);
            const pinned = block.kind === "header";
            const artSrc =
              block.kind === "header"
                ? state.headerImageUrl
                : (story?.imageUrl ?? null);
            return (
              <div
                key={block.id}
                draggable={!pinned}
                onDragStart={() => onDragStart(block.id, pinned)}
                onDragOver={(e) => onDragOver(e, block.id, pinned)}
                className={cn(
                  "grid items-center gap-3 rounded-2xl border bg-cos-card px-3 py-3",
                  pinned
                    ? "grid-cols-[28px_48px_1fr_auto] cursor-default border-cos-brand-sage/40 bg-[rgba(107,129,113,0.06)]"
                    : "grid-cols-[28px_48px_1fr_auto] cursor-grab",
                  featured &&
                    "border-[#d4a84b] bg-[linear-gradient(135deg,#fffdf8,#fff)]",
                  !pinned &&
                    !featured &&
                    "border-cos-border hover:border-cos-brand-sage",
                )}
              >
                {pinned ? (
                  <span className="text-center text-[10px] font-bold uppercase tracking-wide text-cos-muted">
                    pin
                  </span>
                ) : (
                  <GripVertical className="h-4 w-4 text-cos-muted" />
                )}
                <ArtThumb src={artSrc} alt="" className="h-12 w-12" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cos-text">
                    {block.label}
                  </p>
                  <p className="text-xs text-cos-muted">
                    {pinned ? "Fixed at top" : block.detail}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold",
                    featured
                      ? "bg-[rgba(247,201,72,0.28)] text-[#6b5e45]"
                      : pinned
                        ? "bg-[rgba(11,47,91,0.1)] text-[#0b2f5b]"
                        : "bg-[rgba(107,129,113,0.14)] text-[#2f4a3c]",
                  )}
                >
                  {featured ? "★ Featured" : pinned ? "Hero" : block.kind}
                </span>
              </div>
            );
          })}
        </div>
      </SettingsBox>
    </section>
  );
}

function PreviewStep({
  state,
  previewMode,
  setPreviewMode,
  onBack,
  onNext,
}: {
  state: NewsletterComposerState;
  previewMode: "phone" | "desktop";
  setPreviewMode: (m: "phone" | "desktop") => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <section className="space-y-4">
      <PanelHead
        title="Email preview"
        body="Phone or desktop — colors, featured stories, and footer socials."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onBack}>
              ← Layout
            </Button>
            <Button type="button" onClick={onNext}>
              Looks good → Send
            </Button>
          </div>
        }
      />
      <div className="overflow-hidden rounded-[22px] border border-cos-border bg-[linear-gradient(160deg,rgba(107,129,113,0.1),rgba(212,168,75,0.12))] p-4 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
        <div className="mb-4 inline-flex rounded-full bg-cos-bg-alt p-1">
          <button
            type="button"
            onClick={() => setPreviewMode("phone")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              previewMode === "phone"
                ? "bg-cos-card text-cos-text shadow-sm"
                : "text-cos-muted",
            )}
          >
            Phone
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode("desktop")}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              previewMode === "desktop"
                ? "bg-cos-card text-cos-text shadow-sm"
                : "text-cos-muted",
            )}
          >
            Desktop email
          </button>
        </div>
        {previewMode === "phone" ? (
          <EmailPreviewPhone state={state} maxHeightClass="max-h-[640px]" />
        ) : (
          <EmailPreviewDesktop state={state} />
        )}
      </div>
    </section>
  );
}

function SendStep({
  state,
  copyDone,
  onCopy,
  onBack,
}: {
  state: NewsletterComposerState;
  copyDone: boolean;
  onCopy: () => void;
  onBack: () => void;
}) {
  const included = state.stories.filter((s) => s.included).length;
  return (
    <section className="space-y-4">
      <PanelHead
        title="Send or export"
        body="Copy email-safe HTML for your email tool or newsletter platform."
        actions={
          <Button type="button" variant="secondary" onClick={onBack}>
            ← Preview
          </Button>
        }
      />
      <SettingsBox
        title="Ready to send"
        description={`${included} stories · subject: ${state.subject}`}
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onCopy}>
            {copyDone ? "Copied!" : "Copy email HTML"}
          </Button>
          <Button type="button" variant="secondary" href="/create-with-ai">
            Back to Create with AI
          </Button>
        </div>
        <p className="mt-3 text-xs text-cos-muted">
          Export the HTML first, then paste it into your email tool — same
          flow as Homepage.
        </p>
      </SettingsBox>
    </section>
  );
}
