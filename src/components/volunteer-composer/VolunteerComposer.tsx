"use client";

import { EmojiPicker } from "@/components/homepage-composer/EmojiPicker";
import { SettingsBox } from "@/components/homepage-composer/SettingsBox";
import { Button } from "@/components/ui/Button";
import { campaignBuilderHref } from "@/lib/campaign-builder-v2/navigation";
import {
  contrastingText,
  normalizeHex,
} from "@/lib/homepage-composer/colors";
import { formatEventWhen } from "@/lib/homepage-composer/blurbs";
import { compressImageForUpload } from "@/lib/homepage-composer/compress-image";
import { uploadVolunteerComposerArtworkAction } from "@/lib/volunteer-composer/artwork-actions";
import {
  buildInitialState,
  newCustomOpportunity,
  normalizeComposerState,
  opportunityFromEvent,
} from "@/lib/volunteer-composer/defaults";
import {
  loadComposerDraftRaw,
  parseComposerDraftRaw,
  saveComposerDraft,
  type DraftSaveStatus,
} from "@/lib/volunteer-composer/draft-storage";
import { ensureVolunteerOpportunityEventAction } from "@/lib/volunteer-composer/event-actions";
import { exportVolunteerHtml } from "@/lib/volunteer-composer/export-html";
import type {
  VolunteerComposerEvent,
  VolunteerComposerState,
  VolunteerComposerStep,
  VolunteerOpportunity,
} from "@/lib/volunteer-composer/types";
import {
  opportunityVisibility,
  PREVIEW_FULL_MONTH,
} from "@/lib/volunteer-composer/visibility";
import { cn } from "@/lib/utils/cn";
import { GripVertical, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

/** Reject only absurdly huge dumps (before compress). Normal chat photos are fine. */
const MAX_SOURCE_ARTWORK_BYTES = 25 * 1024 * 1024;

type OpportunitySortMode =
  | "custom"
  | "date-asc"
  | "date-desc"
  | "title-asc"
  | "title-desc"
  | "off-asc"
  | "always-first";

const OPPORTUNITY_SORT_OPTIONS: Array<{
  value: OpportunitySortMode;
  label: string;
}> = [
  { value: "custom", label: "Custom order" },
  { value: "date-asc", label: "Date · soonest first" },
  { value: "date-desc", label: "Date · latest first" },
  { value: "title-asc", label: "A → Z" },
  { value: "title-desc", label: "Z → A" },
  { value: "off-asc", label: "Off date · soonest" },
  { value: "always-first", label: "Always on first" },
];

function opportunitySortDate(op: VolunteerOpportunity): string {
  return op.startsOn || op.expiresOn || "9999-12-31";
}

function sortOpportunities(
  opportunities: VolunteerOpportunity[],
  mode: OpportunitySortMode,
): VolunteerOpportunity[] {
  if (mode === "custom") return opportunities;
  const next = [...opportunities];
  next.sort((a, b) => {
    switch (mode) {
      case "date-asc":
        return opportunitySortDate(a).localeCompare(opportunitySortDate(b));
      case "date-desc":
        return opportunitySortDate(b).localeCompare(opportunitySortDate(a));
      case "title-asc":
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
      case "title-desc":
        return b.title.localeCompare(a.title, undefined, {
          sensitivity: "base",
        });
      case "off-asc": {
        const aOff = a.alwaysOn ? "9999-12-31" : a.expiresOn || "9999-12-31";
        const bOff = b.alwaysOn ? "9999-12-31" : b.expiresOn || "9999-12-31";
        return aOff.localeCompare(bOff);
      }
      case "always-first": {
        if (a.alwaysOn !== b.alwaysOn) return a.alwaysOn ? -1 : 1;
        return opportunitySortDate(a).localeCompare(opportunitySortDate(b));
      }
      default:
        return 0;
    }
  });
  return next;
}

function formatBadgeDate(ymd: string | null): string {
  if (!ymd || ymd.length < 10) return "—";
  return `${ymd.slice(5, 7)}-${ymd.slice(8, 10)}`;
}

const STEPS: Array<{ id: VolunteerComposerStep; label: string; hint: string }> =
  [
    { id: "header", label: "Header", hint: "Design once" },
    { id: "footer", label: "Footer", hint: "Design once" },
    { id: "opportunities", label: "Opportunities", hint: "Change monthly" },
    { id: "preview", label: "Preview", hint: "Full page" },
    { id: "export", label: "Export", hint: "Full page HTML" },
  ];

type Props = {
  organizationId: string | null;
  organizationName: string | null;
  events: VolunteerComposerEvent[];
};

function formatSaveStatus(status: DraftSaveStatus): string {
  if (status.kind === "saving") return "Saving draft…";
  if (status.kind === "saved") return "Draft saved";
  if (status.kind === "error") return status.message;
  return "Draft auto-saves as you edit";
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map((p) => parseInt(p, 10));
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function formatSliderLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((p) => parseInt(p, 10));
  const dt = new Date(y!, m! - 1, d!);
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPreviewSliderLabel(value: string): string {
  if (value === PREVIEW_FULL_MONTH) return "Full month · all cards";
  return formatSliderLabel(value);
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonthYyyyMm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultEventFilterMonth(events: VolunteerComposerEvent[]): string {
  const currentMonth = currentMonthYyyyMm();
  const dated = [...events]
    .filter((e) => Boolean(e.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (dated.some((e) => e.date.startsWith(currentMonth))) return currentMonth;
  const soonest = dated[0];
  if (soonest) return soonest.date.slice(0, 7);
  return currentMonth;
}

function eventMonthOptions(events: VolunteerComposerEvent[]): string[] {
  const months = new Set<string>();
  for (const event of events) {
    if (event.date && event.date.length >= 7) months.add(event.date.slice(0, 7));
  }
  months.add(currentMonthYyyyMm());
  return [...months].sort();
}

function formatMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map((p) => parseInt(p, 10));
  const dt = new Date(y!, m! - 1, 1);
  return dt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function buildPreviewSliderDates(
  opportunities: VolunteerOpportunity[],
  today: string,
): string[] {
  const set = new Set<string>([today]);
  for (const role of opportunities) {
    if (role.startsOn) {
      set.add(role.startsOn);
      set.add(addDaysYmd(role.startsOn, -1));
    }
    if (role.expiresOn) {
      set.add(role.expiresOn);
      set.add(addDaysYmd(role.expiresOn, 1));
    }
  }
  if (set.size < 4) {
    set.add(addDaysYmd(today, 7));
    set.add(addDaysYmd(today, 14));
    set.add(addDaysYmd(today, 21));
  }
  return [PREVIEW_FULL_MONTH, ...[...set].sort()];
}

export function VolunteerComposer({
  organizationId,
  organizationName,
  events,
}: Props) {
  const [step, setStep] = useState<VolunteerComposerStep>("header");
  const [state, setState] = useState<VolunteerComposerState>(() =>
    buildInitialState(events, organizationName),
  );
  const [hydrated, setHydrated] = useState(false);
  const [previewDate, setPreviewDate] = useState(PREVIEW_FULL_MONTH);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [copyLabel, setCopyLabel] = useState("Copy full page HTML");
  const [eventFilterMonth, setEventFilterMonth] = useState(() =>
    defaultEventFilterMonth(events),
  );
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>({
    kind: "idle",
  });
  const [opportunitySort, setOpportunitySort] =
    useState<OpportunitySortMode>("custom");
  const [dragId, setDragId] = useState<string | null>(null);
  const [compressingOpId, setCompressingOpId] = useState<string | null>(null);
  const [linkingEventOpId, setLinkingEventOpId] = useState<string | null>(null);

  const organizationNameRef = useRef(organizationName);
  const organizationIdRef = useRef(organizationId);
  const stateRef = useRef(state);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const artworkOpIdRef = useRef<string | null>(null);
  organizationNameRef.current = organizationName;
  organizationIdRef.current = organizationId;
  stateRef.current = state;

  const flushDraft = useCallback(async (reason: "debounce" | "flush") => {
    if (!hydratedRef.current) return;
    const seq = ++saveSeqRef.current;
    const snapshot = stateRef.current;
    const orgId = organizationIdRef.current;
    if (reason === "debounce") setSaveStatus({ kind: "saving" });
    try {
      await saveComposerDraft(orgId, snapshot);
      if (seq !== saveSeqRef.current) return;
      setSaveStatus({ kind: "saved", at: Date.now() });
    } catch (err) {
      if (seq !== saveSeqRef.current) return;
      setSaveStatus({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not save draft. Use Export to keep your work.",
      });
    }
  }, []);

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
          const normalized = normalizeComposerState(
            parsed,
            organizationNameRef.current,
          );
          if (normalized) setState(normalized);
        }
      } catch {
        // ignore corrupt drafts
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

  const eventById = useMemo(() => {
    const map = new Map<string, VolunteerComposerEvent>();
    for (const event of events) map.set(event.id, event);
    return map;
  }, [events]);

  /** Pull event artwork + empty signup URLs into opportunity cards (drafts + new events). */
  useEffect(() => {
    if (!hydrated) return;
    setState((prev) => {
      let changed = false;
      const opportunities = prev.opportunities.map((op) => {
        if (op.source !== "event" || !op.eventId) return op;
        const event = eventById.get(op.eventId);
        if (!event) return op;
        const nextImage = event.imageUrl?.trim() || null;
        const nextSignup = event.volunteerSignupUrl?.trim() || "";
        const imageNeedsSync = Boolean(nextImage) && op.imageUrl !== nextImage;
        const signupNeedsSync = !op.signupUrl.trim() && Boolean(nextSignup);
        if (!imageNeedsSync && !signupNeedsSync) return op;
        changed = true;
        return {
          ...op,
          imageUrl: imageNeedsSync ? nextImage : op.imageUrl,
          signupUrl: signupNeedsSync ? nextSignup : op.signupUrl,
        };
      });
      return changed ? { ...prev, opportunities } : prev;
    });
  }, [events, eventById, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus({ kind: "saving" });
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushDraft("debounce");
    }, 350);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [state, organizationId, hydrated, flushDraft]);

  useEffect(() => {
    const onLeave = () => {
      if (!hydratedRef.current) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void flushDraft("flush");
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

  const monthOptions = useMemo(() => eventMonthOptions(events), [events]);
  const filteredEvents = useMemo(
    () => events.filter((e) => e.date.startsWith(eventFilterMonth)),
    [events, eventFilterMonth],
  );

  const today = todayYmd();
  const sliderDates = useMemo(
    () => buildPreviewSliderDates(state.opportunities, today),
    [state.opportunities, today],
  );
  const resolvedSliderIndex = useMemo(() => {
    let idx = sliderDates.findIndex((d) => d === previewDate);
    if (idx >= 0) return idx;
    idx = sliderDates.findIndex(
      (d) => d !== PREVIEW_FULL_MONTH && d >= previewDate,
    );
    return Math.max(0, idx);
  }, [sliderDates, previewDate]);

  const isFullMonthPreview = previewDate === PREVIEW_FULL_MONTH;
  const openCount = useMemo(() => {
    if (isFullMonthPreview) return state.opportunities.length;
    return state.opportunities.filter((role) => {
      const vis = opportunityVisibility(role, previewDate);
      return vis.show && vis.key === "open";
    }).length;
  }, [isFullMonthPreview, previewDate, state.opportunities]);

  const previewHtml = useMemo(
    () =>
      exportVolunteerHtml(state, {
        asOfDate: previewDate,
        includeDataImages: true,
      }),
    [state, previewDate],
  );
  const exportHtml = useMemo(() => exportVolunteerHtml(state), [state]);

  const patchHeader = useCallback(
    (patch: Partial<VolunteerComposerState["header"]>) => {
      setState((prev) => ({ ...prev, header: { ...prev.header, ...patch } }));
    },
    [],
  );
  const patchFooter = useCallback(
    (patch: Partial<VolunteerComposerState["footer"]>) => {
      setState((prev) => ({ ...prev, footer: { ...prev.footer, ...patch } }));
    },
    [],
  );
  const patchOpportunity = useCallback(
    (id: string, patch: Partial<VolunteerOpportunity>) => {
      setState((prev) => ({
        ...prev,
        opportunities: prev.opportunities.map((op) =>
          op.id === id ? { ...op, ...patch } : op,
        ),
      }));
    },
    [],
  );

  const toggleEvent = useCallback(
    (event: VolunteerComposerEvent, checked: boolean) => {
      setState((prev) => {
        if (checked) {
          if (prev.selectedEventIds.includes(event.id)) return prev;
          const next = opportunityFromEvent(event);
          return {
            ...prev,
            selectedEventIds: [...prev.selectedEventIds, event.id],
            opportunities: [...prev.opportunities, next],
          };
        }
        return {
          ...prev,
          selectedEventIds: prev.selectedEventIds.filter((id) => id !== event.id),
          opportunities: prev.opportunities.filter(
            (op) => op.eventId !== event.id,
          ),
        };
      });
    },
    [],
  );

  const clearAllOpportunities = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedEventIds: [],
      opportunities: [],
    }));
  }, []);

  const applyOpportunitySort = (mode: OpportunitySortMode) => {
    setOpportunitySort(mode);
    if (mode === "custom") return;
    setState((prev) => ({
      ...prev,
      opportunities: sortOpportunities(prev.opportunities, mode),
    }));
  };

  const onDragStart = (opId: string) => setDragId(opId);
  const onDragOver = (e: DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setOpportunitySort("custom");
    setState((prev) => {
      const from = prev.opportunities.findIndex((op) => op.id === dragId);
      const to = prev.opportunities.findIndex((op) => op.id === overId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev.opportunities];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return { ...prev, opportunities: next };
    });
  };

  const openArtworkPicker = (opId: string) => {
    artworkOpIdRef.current = opId;
    artworkInputRef.current?.click();
  };

  const onArtworkSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const opId = artworkOpIdRef.current;
    event.target.value = "";
    artworkOpIdRef.current = null;
    if (!file || !opId) return;

    const looksLikeImage =
      !file.type ||
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
    if (!looksLikeImage) {
      window.alert("Please choose an image file (PNG, JPG, or similar).");
      return;
    }
    if (file.size > MAX_SOURCE_ARTWORK_BYTES) {
      window.alert(
        "That file is over 25 MB. Try a normal photo or screenshot instead.",
      );
      return;
    }

    void (async () => {
      setCompressingOpId(opId);
      try {
        const result = await compressImageForUpload(file);
        const uploaded = await uploadVolunteerComposerArtworkAction({
          opportunityId: opId,
          dataUrl: result.dataUrl,
        });
        if (!uploaded.success || !uploaded.url) {
          throw new Error(
            uploaded.error ?? "Could not upload artwork. Try again.",
          );
        }
        patchOpportunity(opId, { imageUrl: uploaded.url });
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : "Could not prepare that image. Try another file.",
        );
      } finally {
        setCompressingOpId(null);
      }
    })();
  };

  const openArtworkAi = async (op: VolunteerOpportunity) => {
    if (op.eventId) {
      window.location.href = campaignBuilderHref(op.eventId, "preview");
      return;
    }
    setLinkingEventOpId(op.id);
    try {
      const result = await ensureVolunteerOpportunityEventAction({
        title: op.title.trim() || "Volunteer opportunity",
        description:
          op.blurb.trim() ||
          "Volunteer opportunity — create artwork for your Volunteer With Us page.",
        date: op.expiresOn || op.startsOn || todayYmd(),
      });
      if (!result.success || !result.eventId || !result.href) {
        throw new Error(
          result.error ?? "Could not open artwork tools for this role.",
        );
      }
      setState((prev) => ({
        ...prev,
        selectedEventIds: prev.selectedEventIds.includes(result.eventId!)
          ? prev.selectedEventIds
          : [...prev.selectedEventIds, result.eventId!],
        opportunities: prev.opportunities.map((row) =>
          row.id === op.id
            ? { ...row, eventId: result.eventId!, source: "event" as const }
            : row,
        ),
      }));
      await flushDraft("flush");
      window.location.href = result.href;
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Could not open artwork tools. Try again.",
      );
      setLinkingEventOpId(null);
    }
  };

  const copyHtml = useCallback(async () => {
    setCopyLabel("Preparing…");
    try {
      let nextState = state;
      const embedded = state.opportunities.filter((op) =>
        op.imageUrl?.startsWith("data:"),
      );
      if (embedded.length > 0) {
        const opportunities = [...nextState.opportunities];
        for (const op of embedded) {
          if (!op.imageUrl?.startsWith("data:")) continue;
          const uploaded = await uploadVolunteerComposerArtworkAction({
            opportunityId: op.id,
            dataUrl: op.imageUrl,
          });
          if (uploaded.success && uploaded.url) {
            const idx = opportunities.findIndex((row) => row.id === op.id);
            if (idx >= 0) {
              opportunities[idx] = {
                ...opportunities[idx]!,
                imageUrl: uploaded.url,
              };
            }
          }
        }
        nextState = { ...nextState, opportunities };
        setState(nextState);
      }
      const payload = exportVolunteerHtml(nextState);
      await navigator.clipboard.writeText(payload);
      setCopyLabel("Copied!");
      window.setTimeout(() => setCopyLabel("Copy full page HTML"), 1800);
    } catch {
      setCopyLabel("Copy failed — select below");
      window.setTimeout(() => setCopyLabel("Copy full page HTML"), 2400);
    }
  }, [state]);

  const hc = state.header.colors;
  const fc = state.footer.colors;

  return (
    <div className="studio-page space-y-3 pb-6">
      <input
        ref={artworkInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onArtworkSelected}
        aria-hidden
        tabIndex={-1}
      />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href="/create-with-ai/website-pages"
            className="mb-1 inline-block text-xs font-medium text-cos-muted hover:text-cos-text sm:text-sm"
          >
            ← Website pages
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <h1 className="font-display text-3xl text-cos-text sm:text-4xl">
                Volunteer With Us
              </h1>
              <p className="mt-0.5 max-w-xl text-sm leading-snug text-cos-muted">
                Build your Volunteer page — header, opportunities, signup links,
                on/off dates, footer, preview, and HTML export for your website.
              </p>
            </div>
            <p
              className={cn(
                "shrink-0 text-[11px] font-semibold sm:text-xs",
                saveStatus.kind === "error"
                  ? "text-cos-error"
                  : saveStatus.kind === "saved"
                    ? "text-cos-brand-sage"
                    : "text-cos-muted",
              )}
              aria-live="polite"
            >
              {formatSaveStatus(saveStatus)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-4">
        <aside className="h-fit rounded-[18px] bg-cos-bg-alt p-2.5 lg:sticky lg:top-3">
          <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-cos-muted">
            Steps
          </p>
          {STEPS.map((s, index) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                "mb-0.5 w-full rounded-[12px] px-2.5 py-2 text-left text-sm font-semibold text-cos-text transition",
                step === s.id
                  ? "bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                  : "hover:bg-white/45",
              )}
            >
              {index + 1} · {s.label}
              <small className="mt-0.5 block text-[11px] font-medium leading-tight text-cos-muted">
                {s.hint}
              </small>
            </button>
          ))}
        </aside>

        <div className="min-w-0 space-y-3">
          {step === "header" && (
            <section className="space-y-3">
              <PanelHead
                title="Design your header"
                body="Colors, welcome copy, and how-to steps — design once, then refresh opportunities as needed."
                actions={
                  <Button type="button" onClick={() => setStep("footer")}>
                    Save → Footer
                  </Button>
                }
              />

              <div className="overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <p className="border-b border-cos-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-cos-muted">
                  Live hero preview
                </p>
                <div
                  className="p-5 text-center sm:p-6"
                  style={{
                    background: `linear-gradient(135deg, ${hc.backgroundStart}, ${hc.backgroundEnd})`,
                    color: hc.textColor,
                  }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-90">
                    {state.header.organizationLabel || "Your organization"}
                  </p>
                  <h3 className="mt-2 font-display text-2xl sm:text-3xl">
                    {state.header.title || "Volunteer With Us"}
                  </h3>
                  {state.header.intro ? (
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed opacity-95">
                      {state.header.intro}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {(state.header.buttonCount === 2
                      ? [state.header.button1, state.header.button2]
                      : [state.header.button1]
                    )
                      .filter((b) => b.label.trim())
                      .map((b) => (
                        <span
                          key={b.label}
                          className="rounded-full px-4 py-2 text-sm font-bold"
                          style={{
                            background: hc.buttonBackground,
                            color: hc.buttonText,
                          }}
                        >
                          {b.label}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              <SettingsBox
                title="Page intro"
                description="Organization name, page title, and welcome blurb at the top of the page."
              >
                <div className="space-y-3">
                  <Field
                    label="Organization"
                    value={state.header.organizationLabel}
                    onChange={(organizationLabel) =>
                      patchHeader({ organizationLabel })
                    }
                  />
                  <Field
                    label="Page title"
                    value={state.header.title}
                    onChange={(title) => patchHeader({ title })}
                  />
                  <Field
                    label="Intro blurb"
                    value={state.header.intro}
                    onChange={(intro) => patchHeader({ intro })}
                    multiline
                  />
                </div>
              </SettingsBox>

              <SettingsBox
                title="Header buttons"
                description="Choose 1 or 2 buttons under the welcome copy."
              >
                <SegToggle
                  label="How many buttons?"
                  value={state.header.buttonCount}
                  onChange={(buttonCount) => patchHeader({ buttonCount })}
                />
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Button 1 label"
                    value={state.header.button1.label}
                    onChange={(label) =>
                      patchHeader({
                        button1: { ...state.header.button1, label },
                      })
                    }
                  />
                  <Field
                    label="Button 1 URL"
                    value={state.header.button1.url}
                    onChange={(url) =>
                      patchHeader({
                        button1: { ...state.header.button1, url },
                      })
                    }
                    placeholder="https://… or #anchor"
                  />
                </div>
                {state.header.buttonCount === 2 ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Button 2 label"
                      value={state.header.button2.label}
                      onChange={(label) =>
                        patchHeader({
                          button2: { ...state.header.button2, label },
                        })
                      }
                    />
                    <Field
                      label="Button 2 URL"
                      value={state.header.button2.url}
                      onChange={(url) =>
                        patchHeader({
                          button2: { ...state.header.button2, url },
                        })
                      }
                    />
                  </div>
                ) : null}
              </SettingsBox>

              <SettingsBox
                title="Brand colors"
                description="Hero gradient and button colors for the top of the page."
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <ColorField
                    label="Hero start"
                    value={hc.backgroundStart}
                    onChange={(backgroundStart) =>
                      patchHeader({
                        colors: { ...hc, backgroundStart },
                      })
                    }
                  />
                  <ColorField
                    label="Hero end"
                    value={hc.backgroundEnd}
                    onChange={(backgroundEnd) =>
                      patchHeader({
                        colors: { ...hc, backgroundEnd },
                      })
                    }
                  />
                  <ColorField
                    label="Hero text"
                    value={hc.textColor}
                    onChange={(textColor) =>
                      patchHeader({ colors: { ...hc, textColor } })
                    }
                    actionLabel="Auto"
                    onAction={() =>
                      patchHeader({
                        colors: {
                          ...hc,
                          textColor: contrastingText(
                            normalizeHex(
                              hc.backgroundStart,
                              hc.backgroundStart,
                            ),
                          ),
                        },
                      })
                    }
                  />
                  <ColorField
                    label="Button"
                    value={hc.buttonBackground}
                    onChange={(hex) => {
                      const buttonBackground = normalizeHex(
                        hex,
                        hc.buttonBackground,
                      );
                      patchHeader({
                        colors: {
                          ...hc,
                          buttonBackground,
                          buttonText: contrastingText(buttonBackground),
                        },
                      });
                    }}
                  />
                  <ColorField
                    label="Button text"
                    value={hc.buttonText}
                    onChange={(buttonText) =>
                      patchHeader({ colors: { ...hc, buttonText } })
                    }
                  />
                </div>
              </SettingsBox>

              <SettingsBox
                title="How it works"
                description="Three short steps shown under the hero — title, then a brief detail after the dash."
              >
                <div className="space-y-3">
                  {state.header.howToSteps.map((line, index) => (
                    <Field
                      key={index}
                      label={`Step ${index + 1}`}
                      value={line}
                      onChange={(value) => {
                        const howToSteps = [
                          ...state.header.howToSteps,
                        ] as [string, string, string];
                        howToSteps[index] = value;
                        patchHeader({ howToSteps });
                      }}
                    />
                  ))}
                </div>
              </SettingsBox>
            </section>
          )}

          {step === "footer" && (
            <section className="space-y-3">
              <PanelHead
                title="Design your footer"
                body="Thank-you band colors, copy, and buttons — design once for the bottom of the page."
                actions={
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep("header")}
                    >
                      ← Header
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setStep("opportunities")}
                    >
                      Save → Opportunities
                    </Button>
                  </>
                }
              />

              <div className="overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <p className="border-b border-cos-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-cos-muted">
                  Live footer preview
                </p>
                <div
                  className="p-5 text-center sm:p-6"
                  style={{ background: fc.background, color: fc.textColor }}
                >
                  <h3 className="font-display text-xl sm:text-2xl">
                    {state.footer.ctaTitle || "Thank you"}
                  </h3>
                  {state.footer.ctaBody ? (
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed opacity-95">
                      {state.footer.ctaBody}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {(state.footer.buttonCount === 2
                      ? [state.footer.button1, state.footer.button2]
                      : [state.footer.button1]
                    )
                      .filter((b) => b.label.trim())
                      .map((b) => (
                        <span
                          key={b.label}
                          className="rounded-full px-4 py-2 text-sm font-bold"
                          style={{
                            background: fc.buttonBackground,
                            color: fc.buttonText,
                          }}
                        >
                          {b.label}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              <SettingsBox
                title="Footer design"
                description="Background, text, and button colors for the thank-you band."
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <ColorField
                    label="Footer background"
                    value={fc.background}
                    onChange={(hex) => {
                      const background = normalizeHex(hex, fc.background);
                      patchFooter({
                        colors: {
                          ...fc,
                          background,
                          textColor: contrastingText(background),
                        },
                      });
                    }}
                  />
                  <ColorField
                    label="Footer text"
                    value={fc.textColor}
                    onChange={(textColor) =>
                      patchFooter({ colors: { ...fc, textColor } })
                    }
                  />
                  <ColorField
                    label="Footer button"
                    value={fc.buttonBackground}
                    onChange={(hex) => {
                      const buttonBackground = normalizeHex(
                        hex,
                        fc.buttonBackground,
                      );
                      patchFooter({
                        colors: {
                          ...fc,
                          buttonBackground,
                          buttonText: contrastingText(buttonBackground),
                        },
                      });
                    }}
                  />
                  <ColorField
                    label="Button text"
                    value={fc.buttonText}
                    onChange={(buttonText) =>
                      patchFooter({ colors: { ...fc, buttonText } })
                    }
                  />
                </div>
              </SettingsBox>

              <SettingsBox
                title="Footer copy"
                description="Thank-you title and contact note under the opportunity list."
              >
                <div className="space-y-3">
                  <Field
                    label="Title"
                    value={state.footer.ctaTitle}
                    onChange={(ctaTitle) => patchFooter({ ctaTitle })}
                  />
                  <Field
                    label="Body / contact"
                    value={state.footer.ctaBody}
                    onChange={(ctaBody) => patchFooter({ ctaBody })}
                    multiline
                  />
                </div>
              </SettingsBox>

              <SettingsBox
                title="Footer buttons"
                description="Choose 1 or 2 buttons — label and URL for each."
              >
                <SegToggle
                  label="How many buttons?"
                  value={state.footer.buttonCount}
                  onChange={(buttonCount) => patchFooter({ buttonCount })}
                />
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Button 1 label"
                    value={state.footer.button1.label}
                    onChange={(label) =>
                      patchFooter({
                        button1: { ...state.footer.button1, label },
                      })
                    }
                  />
                  <Field
                    label="Button 1 URL"
                    value={state.footer.button1.url}
                    onChange={(url) =>
                      patchFooter({
                        button1: { ...state.footer.button1, url },
                      })
                    }
                    placeholder="https://… or mailto:…"
                  />
                </div>
                {state.footer.buttonCount === 2 ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Button 2 label"
                      value={state.footer.button2.label}
                      onChange={(label) =>
                        patchFooter({
                          button2: { ...state.footer.button2, label },
                        })
                      }
                    />
                    <Field
                      label="Button 2 URL"
                      value={state.footer.button2.url}
                      onChange={(url) =>
                        patchFooter({
                          button2: { ...state.footer.button2, url },
                        })
                      }
                    />
                  </div>
                ) : null}
              </SettingsBox>
            </section>
          )}

          {step === "opportunities" && (
            <section className="space-y-3">
              <PanelHead
                title="Volunteer opportunities"
                body="Pick events, edit signup links, and set on/off dates so only open roles show."
                actions={
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep("footer")}
                    >
                      ← Footer
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={clearAllOpportunities}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          opportunities: [
                            ...prev.opportunities,
                            newCustomOpportunity(prev.opportunities.length),
                          ],
                        }))
                      }
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add other role
                    </Button>
                    <Button type="button" onClick={() => setStep("preview")}>
                      Preview →
                    </Button>
                  </>
                }
              />

              <div className="rounded-[16px] border border-cos-border bg-[rgba(196,146,46,0.12)] px-3.5 py-3 text-sm leading-snug text-cos-muted">
                <strong className="text-cos-text">On / off dates:</strong> each
                card appears starting on the on date, stays through the off
                date, then closes the next morning. Use Always on for roles that
                stay open. Preview includes a date slider to check what visitors
                will see.
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
                <div className="rounded-[22px] border border-cos-border bg-cos-card p-4 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                  <h3 className="font-display text-lg text-cos-text">
                    From your events
                  </h3>
                  <p className="mt-1 text-xs text-cos-muted">
                    Check events to add opportunity cards. Artwork from the
                    event shows on each card when available.
                  </p>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-cos-muted">
                      Month / Year
                    </span>
                    <select
                      className="w-full rounded-xl border border-cos-border bg-cos-bg px-3 py-2 text-sm"
                      value={eventFilterMonth}
                      onChange={(e) => setEventFilterMonth(e.target.value)}
                    >
                      {monthOptions.map((m) => (
                        <option key={m} value={m}>
                          {formatMonthLabel(m)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="mt-3 max-h-[420px] space-y-1.5 overflow-auto pr-1">
                    {filteredEvents.length === 0 ? (
                      <p className="text-xs text-cos-muted">
                        No events in {formatMonthLabel(eventFilterMonth)}.
                      </p>
                    ) : (
                      filteredEvents.map((event) => {
                        const checked = state.selectedEventIds.includes(
                          event.id,
                        );
                        return (
                          <label
                            key={event.id}
                            className="flex cursor-pointer items-start gap-2 rounded-[12px] border border-cos-border/70 bg-cos-bg/60 px-2.5 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={checked}
                              onChange={(e) =>
                                toggleEvent(event, e.target.checked)
                              }
                            />
                            <span className="min-w-0">
                              <span className="block font-semibold text-cos-text">
                                {event.title}
                              </span>
                              <span className="block text-[11px] text-cos-muted">
                                {formatEventWhen(event.date, event.time) ||
                                  event.date}
                                {event.volunteerSignupUrl
                                  ? " · signup link ready"
                                  : ""}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-[18px] border border-cos-border bg-cos-bg-alt p-3 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-display text-xl text-cos-text">
                      On page · drag to reorder
                    </h3>
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cos-muted">
                      <span className="sr-only">Sort opportunities</span>
                      <select
                        value={opportunitySort}
                        onChange={(e) =>
                          applyOpportunitySort(
                            e.target.value as OpportunitySortMode,
                          )
                        }
                        disabled={state.opportunities.length < 2}
                        className="h-9 min-w-[11.5rem] rounded-lg border border-cos-border bg-cos-card px-2.5 text-sm font-medium normal-case tracking-normal text-cos-text focus:border-cos-brand-forest focus:outline-none focus:ring-2 focus:ring-cos-brand-forest/20 disabled:opacity-50"
                      >
                        {OPPORTUNITY_SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            Sort: {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {state.opportunities.length === 0 ? (
                    <p className="mt-4 text-sm text-cos-muted">
                      Select events or add another role to get started.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {state.opportunities.map((op) => (
                        <div
                          key={op.id}
                          draggable
                          onDragStart={() => onDragStart(op.id)}
                          onDragOver={(e) => onDragOver(e, op.id)}
                          onDragEnd={() => setDragId(null)}
                          className={cn(
                            "rounded-[14px] border border-cos-border bg-cos-card p-3 transition-colors duration-150 hover:border-cos-brand-sage",
                            dragId === op.id && "opacity-50",
                          )}
                        >
                          <div className="grid grid-cols-[24px_72px_minmax(0,1fr)] items-start gap-3">
                            <GripVertical
                              className="mt-2 h-5 w-5 cursor-grab justify-self-center text-cos-muted"
                              strokeWidth={1.5}
                            />
                            <div className="space-y-1.5">
                              <div className="aspect-square h-[72px] w-[72px] overflow-hidden rounded-[14px] bg-cos-bg-alt">
                                {op.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={op.imageUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <EmojiPicker
                                      value={op.emoji}
                                      onChange={(emoji) =>
                                        patchOpportunity(op.id, { emoji })
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  title={
                                    compressingOpId === op.id
                                      ? "Working…"
                                      : "Upload artwork"
                                  }
                                  aria-label={
                                    compressingOpId === op.id
                                      ? "Working on artwork upload"
                                      : "Upload artwork"
                                  }
                                  disabled={compressingOpId !== null}
                                  onClick={() => openArtworkPicker(op.id)}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(42,38,34,0.05)] text-[#8a8278] transition-colors hover:bg-[rgba(47,74,60,0.08)] hover:text-[#2f4a3c] disabled:opacity-40"
                                >
                                  <Upload
                                    className="h-3 w-3"
                                    strokeWidth={1.5}
                                  />
                                </button>
                                {op.eventId ? (
                                  <Link
                                    href={campaignBuilderHref(
                                      op.eventId,
                                      "preview",
                                    )}
                                    title="Create artwork with AI"
                                    aria-label="Create artwork with AI for this event"
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(42,38,34,0.05)] text-[#8a8278] transition-colors hover:bg-[rgba(47,74,60,0.08)] hover:text-[#2f4a3c]"
                                  >
                                    <Sparkles
                                      className="h-3 w-3"
                                      strokeWidth={1.5}
                                    />
                                  </Link>
                                ) : (
                                  <button
                                    type="button"
                                    title="Create artwork with AI"
                                    aria-label="Create artwork with AI for this role"
                                    disabled={linkingEventOpId !== null}
                                    onClick={() => void openArtworkAi(op)}
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(42,38,34,0.05)] text-[#8a8278] transition-colors hover:bg-[rgba(47,74,60,0.08)] hover:text-[#2f4a3c] disabled:opacity-40"
                                  >
                                    <Sparkles
                                      className="h-3 w-3"
                                      strokeWidth={1.5}
                                    />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  className="min-w-0 flex-1 rounded-lg border border-cos-border bg-cos-card px-2 py-1.5 font-display text-sm font-semibold text-cos-text"
                                  value={op.title}
                                  onChange={(e) =>
                                    patchOpportunity(op.id, {
                                      title: e.target.value,
                                    })
                                  }
                                  aria-label="Opportunity title"
                                />
                                <span className="rounded-full bg-cos-bg-alt px-2.5 py-1 text-[11px] font-bold text-cos-brand-sage">
                                  {op.alwaysOn
                                    ? "Always"
                                    : `→ ${formatBadgeDate(op.expiresOn)}`}
                                </span>
                                <button
                                  type="button"
                                  className="rounded-xl border border-cos-border px-2 py-1.5 text-cos-muted hover:text-cos-error"
                                  aria-label="Remove opportunity"
                                  onClick={() =>
                                    setState((prev) => ({
                                      ...prev,
                                      selectedEventIds: op.eventId
                                        ? prev.selectedEventIds.filter(
                                            (id) => id !== op.eventId,
                                          )
                                        : prev.selectedEventIds,
                                      opportunities: prev.opportunities.filter(
                                        (x) => x.id !== op.id,
                                      ),
                                    }))
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <textarea
                                className="w-full rounded-lg border border-cos-border bg-cos-card px-2 py-1.5 text-xs text-cos-text"
                                rows={2}
                                value={op.blurb}
                                onChange={(e) =>
                                  patchOpportunity(op.id, {
                                    blurb: e.target.value,
                                  })
                                }
                                aria-label="Opportunity blurb"
                              />
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Field
                                  label="When"
                                  value={op.whenLabel}
                                  onChange={(whenLabel) =>
                                    patchOpportunity(op.id, { whenLabel })
                                  }
                                />
                                <Field
                                  label="Signup link"
                                  value={op.signupUrl}
                                  onChange={(signupUrl) =>
                                    patchOpportunity(op.id, { signupUrl })
                                  }
                                  placeholder="https://www.signupgenius.com/go/…"
                                />
                              </div>
                              <div className="flex flex-wrap items-end gap-3">
                                <label className="flex items-center gap-2 text-sm font-semibold text-cos-text">
                                  <input
                                    type="checkbox"
                                    checked={op.alwaysOn}
                                    onChange={(e) =>
                                      patchOpportunity(op.id, {
                                        alwaysOn: e.target.checked,
                                      })
                                    }
                                  />
                                  Always on
                                </label>
                                {!op.alwaysOn ? (
                                  <>
                                    <label className="block text-xs">
                                      <span className="mb-1 block font-bold uppercase tracking-[0.05em] text-cos-muted">
                                        On date
                                      </span>
                                      <input
                                        type="date"
                                        className="rounded-lg border border-cos-border bg-cos-card px-2 py-1.5 text-sm"
                                        value={op.startsOn ?? ""}
                                        onChange={(e) =>
                                          patchOpportunity(op.id, {
                                            startsOn: e.target.value || null,
                                          })
                                        }
                                      />
                                    </label>
                                    <label className="block text-xs">
                                      <span className="mb-1 block font-bold uppercase tracking-[0.05em] text-cos-muted">
                                        Off date
                                      </span>
                                      <input
                                        type="date"
                                        className="rounded-lg border border-cos-border bg-cos-card px-2 py-1.5 text-sm"
                                        value={op.expiresOn ?? ""}
                                        onChange={(e) =>
                                          patchOpportunity(op.id, {
                                            expiresOn: e.target.value || null,
                                          })
                                        }
                                      />
                                    </label>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {step === "preview" && (
            <section className="space-y-3">
              <PanelHead
                title="Preview"
                body="Full page preview. Drag the date slider to watch opportunities open, stay available, or close."
                actions={
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep("opportunities")}
                    >
                      ← Opportunities
                    </Button>
                    <Button type="button" onClick={() => setStep("export")}>
                      Looks good → Export
                    </Button>
                  </>
                }
              />

              <div className="rounded-[18px] bg-cos-bg-alt px-3 py-2.5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-sm text-cos-text">
                    {isFullMonthPreview
                      ? "Full month preview"
                      : "Preview on"}
                  </strong>
                  <span className="rounded-xl border border-cos-border bg-cos-card px-3 py-2 text-sm font-semibold text-cos-text">
                    {formatPreviewSliderLabel(previewDate)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(sliderDates.length - 1, 0)}
                  value={Math.min(
                    Math.max(resolvedSliderIndex, 0),
                    Math.max(sliderDates.length - 1, 0),
                  )}
                  onChange={(e) => {
                    const next = sliderDates[Number(e.target.value)];
                    if (next) setPreviewDate(next);
                  }}
                  className="mt-3 w-full accent-[var(--cos-brand-sage)]"
                  aria-label="Preview date slider"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-cos-muted">
                  <span>
                    {isFullMonthPreview
                      ? `${state.opportunities.length} opportunit${state.opportunities.length === 1 ? "y" : "ies"} on the page · slide to see rotation`
                      : `${openCount} opportunit${openCount === 1 ? "y" : "ies"} open · footer`}
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    {!isFullMonthPreview ? (
                      <button
                        type="button"
                        className="font-semibold text-cos-brand-sage"
                        onClick={() => setPreviewDate(PREVIEW_FULL_MONTH)}
                      >
                        Full month
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="font-semibold text-cos-brand-sage"
                      onClick={() => {
                        const nearest =
                          sliderDates.find(
                            (x) => x !== PREVIEW_FULL_MONTH && x >= today,
                          ) ??
                          sliderDates.find((x) => x !== PREVIEW_FULL_MONTH) ??
                          today;
                        setPreviewDate(nearest);
                      }}
                    >
                      Jump to today
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-cos-muted">
                  Live page preview
                </span>
                <div className="flex gap-1 rounded-full border border-cos-border bg-cos-card p-1">
                  {(["desktop", "mobile"] as const).map((device) => (
                    <button
                      key={device}
                      type="button"
                      onClick={() => setPreviewDevice(device)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                        previewDevice === device
                          ? "bg-[#2f4a3c] text-[#f6f2eb]"
                          : "text-cos-muted hover:text-cos-text",
                      )}
                    >
                      {device}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-[22px] border border-cos-border bg-[linear-gradient(180deg,rgba(235,228,217,0.5),transparent_40%),#ebe4d9] p-4 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <div
                  className={cn(
                    "mx-auto overflow-hidden rounded-[14px] bg-white shadow-[0_12px_32px_rgba(28,36,48,0.1)] transition-[max-width]",
                    previewDevice === "mobile" ? "max-w-[390px]" : "max-w-none",
                  )}
                >
                  <iframe
                    key={`${previewDate}-${previewDevice}-${state.opportunities.length}`}
                    title="Volunteer page preview"
                    srcDoc={previewHtml}
                    className="block w-full border-0 bg-white"
                    style={{ minHeight: 920, height: "80vh" }}
                  />
                </div>
              </div>
            </section>
          )}

          {step === "export" && (
            <section className="space-y-3">
              <PanelHead
                title="Copy full page code"
                body="Complete Volunteer page HTML — paste into your website’s custom HTML block."
                actions={
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep("preview")}
                    >
                      ← Preview
                    </Button>
                    <Button type="button" onClick={() => void copyHtml()}>
                      {copyLabel}
                    </Button>
                  </>
                }
              />
              <div className="max-w-4xl rounded-[22px] border border-cos-border bg-cos-card p-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <ul className="space-y-2 text-sm text-cos-text">
                  <li>✓ Full Volunteer page</li>
                  <li>✓ Header &amp; footer colors with 1–2 buttons each</li>
                  <li>✓ Opportunities with artwork &amp; signup links</li>
                  <li>✓ Roles roll on/off by date (closed roles hide)</li>
                  <li>✓ Paste into your website → Custom HTML</li>
                </ul>
                <pre className="mt-4 max-h-[420px] overflow-auto rounded-[14px] bg-cos-dark p-4 text-xs leading-relaxed text-[#d9e0d6]">
                  {exportHtml}
                </pre>
              </div>
            </section>
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-2xl text-cos-text">{title}</h2>
        <p className="mt-0.5 max-w-xl text-xs leading-snug text-cos-muted sm:text-sm">
          {body}
        </p>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.05em] text-cos-muted">
        {label}
      </span>
      {multiline ? (
        <textarea
          className="w-full rounded-xl border border-cos-border bg-cos-card px-3 py-2.5 text-sm text-cos-text"
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="w-full rounded-xl border border-cos-border bg-cos-card px-3 py-2.5 text-sm text-cos-text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-[12px] font-bold uppercase tracking-[0.05em] text-cos-muted">
        {label}
        {actionLabel && onAction ? (
          <button
            type="button"
            className="text-[11px] font-semibold normal-case tracking-normal text-cos-brand-sage"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        ) : null}
      </span>
      <span className="flex items-center gap-2 rounded-xl border border-cos-border bg-cos-card px-2 py-1.5">
        <input
          type="color"
          className="h-9 w-10 cursor-pointer border-0 bg-transparent"
          value={normalizeHex(value, "#2f4a3c")}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold uppercase tracking-wide text-cos-text outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
    </label>
  );
}

function SegToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: 1 | 2;
  onChange: (value: 1 | 2) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-cos-muted">
        {label}
      </span>
      <div className="flex gap-1 rounded-full border border-cos-border bg-cos-bg p-1">
        {([1, 2] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              value === n
                ? "bg-[#2f4a3c] text-[#f6f2eb]"
                : "text-cos-muted hover:text-cos-text",
            )}
          >
            {n} button{n === 1 ? "" : "s"}
          </button>
        ))}
      </div>
    </div>
  );
}
