"use client";

import { EmojiPicker } from "@/components/homepage-composer/EmojiPicker";
import { SettingsBox } from "@/components/homepage-composer/SettingsBox";
import { Button } from "@/components/ui/Button";
import {
  buildAnnouncementTextFromEvent,
  formatEventWhen,
} from "@/lib/homepage-composer/blurbs";
import {
  averageHex,
  contrastRatio,
  contrastingText,
  normalizeHex,
} from "@/lib/homepage-composer/colors";
import {
  buildInitialState,
  cardFromEvent,
  normalizeComposerState,
} from "@/lib/homepage-composer/defaults";
import { uploadHomepageComposerArtworkAction } from "@/lib/homepage-composer/artwork-actions";
import { generateHomepageComposerBlurbAction } from "@/lib/homepage-composer/blurb-actions";
import { compressImageForUpload } from "@/lib/homepage-composer/compress-image";
import {
  loadComposerDraftRaw,
  parseComposerDraftRaw,
  saveComposerDraft,
  type DraftSaveStatus,
} from "@/lib/homepage-composer/draft-storage";
import { DEFAULT_HOMEPAGE_EMOJI } from "@/lib/homepage-composer/emoji";
import { exportHomepageHtml } from "@/lib/homepage-composer/export-html";
import {
  copyMonthCardsFrom,
  currentMonthYyyyMm,
  formatMonthLabel,
  formatMonthShort,
  saveWorkingMonth,
  savedMonthsForCopy,
  switchWorkingMonth,
  workingMonthStatus,
  workspaceMonthOptions,
} from "@/lib/homepage-composer/month-drafts";
import { createHomepageComposerShareAction } from "@/lib/homepage-composer/share-actions";
import { campaignBuilderHref } from "@/lib/campaign-builder-v2/navigation";
import { saveEventVolunteerSignupUrlAction } from "@/lib/event-playbooks/planning-actions";
import type {
  HomepageAnnouncement,
  HomepageCard,
  HomepageComposerEvent,
  HomepageComposerState,
  HomepageComposerStep,
  HomepageResourceLink,
} from "@/lib/homepage-composer/types";
import {
  fromNativeTimeInputValue,
  toNativeTimeInputValue,
} from "@/lib/events/time-input";
import { cn } from "@/lib/utils/cn";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  GripVertical,
  Loader2,
  Plus,
  Sparkles,
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
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

const STEPS: Array<{ id: HomepageComposerStep; label: string; hint: string }> =
  [
    { id: "header", label: "Header", hint: "Design once" },
    { id: "footer", label: "Footer", hint: "Design once" },
    { id: "cards", label: "Cards", hint: "Change monthly" },
    { id: "preview", label: "Preview", hint: "Full page" },
    { id: "export", label: "Export", hint: "Full page HTML" },
  ];

/** Reject only absurdly huge dumps (before compress). Normal chat photos are fine. */
const MAX_SOURCE_ARTWORK_BYTES = 25 * 1024 * 1024;

type CardSortMode =
  | "custom"
  | "date-asc"
  | "date-desc"
  | "title-asc"
  | "title-desc"
  | "off-asc"
  | "always-first";

const CARD_SORT_OPTIONS: Array<{ value: CardSortMode; label: string }> = [
  { value: "custom", label: "Custom order" },
  { value: "date-asc", label: "Date · soonest first" },
  { value: "date-desc", label: "Date · latest first" },
  { value: "title-asc", label: "A → Z" },
  { value: "title-desc", label: "Z → A" },
  { value: "off-asc", label: "Off date · soonest" },
  { value: "always-first", label: "Always on first" },
];

function cardSortDate(card: HomepageCard): string {
  return card.date || card.startsOn || "9999-12-31";
}

function sortHomepageCards(
  cards: HomepageCard[],
  mode: CardSortMode,
): HomepageCard[] {
  if (mode === "custom") return cards;
  const next = [...cards];
  next.sort((a, b) => {
    switch (mode) {
      case "date-asc":
        return cardSortDate(a).localeCompare(cardSortDate(b));
      case "date-desc":
        return cardSortDate(b).localeCompare(cardSortDate(a));
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
        return cardSortDate(a).localeCompare(cardSortDate(b));
      }
      default:
        return 0;
    }
  });
  return next;
}

type HomepageComposerProps = {
  organizationId: string | null;
  organizationName: string | null;
  events: HomepageComposerEvent[];
};

/** Slider start — show every card so managers can audit the full set. */
const PREVIEW_FULL_MONTH = "full-month";

function formatSaveStatus(status: DraftSaveStatus): string {
  if (status.kind === "saving") return "Saving draft…";
  if (status.kind === "saved") return "Draft saved";
  if (status.kind === "error") return status.message;
  return "Draft auto-saves as you edit";
}

function isCardVisibleOn(card: HomepageCard, asOf: string): boolean {
  if (asOf === PREVIEW_FULL_MONTH) return true;
  if (card.alwaysOn) return true;
  if (card.startsOn && asOf < card.startsOn) return false;
  if (card.expiresOn && asOf > card.expiresOn) return false;
  return true;
}

function formatBadgeDate(ymd: string | null): string {
  if (!ymd || ymd.length < 10) return "—";
  return `${ymd.slice(5, 7)}-${ymd.slice(8, 10)}`;
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

function defaultEventFilterMonth(events: HomepageComposerEvent[]): string {
  const currentMonth = currentMonthYyyyMm();
  const dated = [...events]
    .filter((e) => Boolean(e.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (dated.some((e) => e.date.startsWith(currentMonth))) {
    return currentMonth;
  }

  const soonest = dated[0];
  if (soonest) return soonest.date.slice(0, 7);
  return currentMonth;
}

function eventMonthOptions(events: HomepageComposerEvent[]): string[] {
  const months = new Set<string>();
  for (const event of events) {
    if (event.date && event.date.length >= 7) {
      months.add(event.date.slice(0, 7));
    }
  }
  months.add(currentMonthYyyyMm());
  return [...months].sort();
}

/** Discrete dates for the preview scrubber (event boundaries + a few anchors). */
function buildPreviewSliderDates(cards: HomepageCard[], today: string): string[] {
  const set = new Set<string>([today]);
  for (const card of cards) {
    if (card.startsOn) {
      set.add(card.startsOn);
      set.add(addDaysYmd(card.startsOn, -1));
    }
    if (card.expiresOn) {
      set.add(card.expiresOn);
      set.add(addDaysYmd(card.expiresOn, 1));
    }
    if (card.date) set.add(card.date);
  }
  if (set.size < 4) {
    set.add(addDaysYmd(today, 7));
    set.add(addDaysYmd(today, 14));
    set.add(addDaysYmd(today, 21));
  }
  // Full month first, then date ticks for rotation.
  return [PREVIEW_FULL_MONTH, ...[...set].sort()];
}

function formatPreviewSliderLabel(value: string): string {
  if (value === PREVIEW_FULL_MONTH) return "Full month · all cards";
  return formatSliderLabel(value);
}

export function HomepageComposer({
  organizationId,
  organizationName,
  events,
}: HomepageComposerProps) {
  const [step, setStep] = useState<HomepageComposerStep>("cards");
  const [state, setState] = useState<HomepageComposerState>(() =>
    buildInitialState(events, organizationName),
  );
  const [hydrated, setHydrated] = useState(false);
  const [previewDate, setPreviewDate] = useState(PREVIEW_FULL_MONTH);
  const [copyLabel, setCopyLabel] = useState("Copy full page HTML");
  const [shareLinkUrl, setShareLinkUrl] = useState<string | null>(null);
  const [shareLinkBusy, setShareLinkBusy] = useState(false);
  const [shareLinkError, setShareLinkError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [eventFilterMonth, setEventFilterMonth] = useState(() =>
    defaultEventFilterMonth(events),
  );
  const [compressingCardId, setCompressingCardId] = useState<string | null>(
    null,
  );
  const [generatingBlurbCardId, setGeneratingBlurbCardId] = useState<
    string | null
  >(null);
  const [blurbGenerateError, setBlurbGenerateError] = useState<{
    cardId: string;
    message: string;
  } | null>(null);
  const [cardSort, setCardSort] = useState<CardSortMode>("custom");
  const [showAnnouncementEventPicker, setShowAnnouncementEventPicker] =
    useState(false);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>({
    kind: "idle",
  });
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [monthToast, setMonthToast] = useState<string | null>(null);
  const [monthBarPulse, setMonthBarPulse] = useState(false);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const monthToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const artworkCardIdRef = useRef<string | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const organizationNameRef = useRef(organizationName);
  const organizationIdRef = useRef(organizationId);
  const stateRef = useRef(state);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0);
  organizationNameRef.current = organizationName;
  organizationIdRef.current = organizationId;
  stateRef.current = state;

  const flushDraft = useCallback(async (reason: "debounce" | "flush") => {
    if (!hydratedRef.current) return;
    const seq = ++saveSeqRef.current;
    const snapshot = stateRef.current;
    const orgId = organizationIdRef.current;
    if (reason === "debounce") {
      setSaveStatus({ kind: "saving" });
    }
    try {
      await saveComposerDraft(orgId, snapshot);
      // Ignore stale async completions after a newer save started.
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

  // Load draft once per organization (IndexedDB ↔ localStorage, newest wins).
  // Do not re-hydrate when organizationName changes — that wiped in-progress edits.
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
        // ignore corrupt drafts — do not overwrite storage with defaults yet
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

  // Flush pending debounce on unmount / tab hide so navigate-away cannot drop edits.
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

  const eventById = useMemo(() => {
    const map = new Map<string, HomepageComposerEvent>();
    for (const event of events) map.set(event.id, event);
    return map;
  }, [events]);

  const monthOptions = useMemo(() => eventMonthOptions(events), [events]);

  const workingMonthKeys = useMemo(
    () =>
      workspaceMonthOptions(events, {
        workingMonth: state.workingMonth,
        monthDrafts: state.monthDrafts,
        monthSaved: state.monthSaved,
      }),
    [events, state.workingMonth, state.monthDrafts, state.monthSaved],
  );

  const copyFromMonths = useMemo(
    () => savedMonthsForCopy(state),
    [state],
  );

  const monthStatus = workingMonthStatus(state);
  const workingMonthShort = formatMonthShort(state.workingMonth);
  const workingMonthIndex = workingMonthKeys.indexOf(state.workingMonth);

  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) => !event.date || event.date.startsWith(eventFilterMonth),
      ),
    [events, eventFilterMonth],
  );

  const showMonthToast = useCallback((message: string) => {
    setMonthToast(message);
    if (monthToastTimerRef.current) clearTimeout(monthToastTimerRef.current);
    monthToastTimerRef.current = setTimeout(() => {
      setMonthToast(null);
      monthToastTimerRef.current = null;
    }, 2200);
  }, []);

  const pulseMonthBar = useCallback(() => {
    setMonthBarPulse(false);
    requestAnimationFrame(() => setMonthBarPulse(true));
    window.setTimeout(() => setMonthBarPulse(false), 1400);
  }, []);

  const goToWorkingMonth = useCallback(
    (nextMonth: string) => {
      if (!nextMonth || nextMonth === stateRef.current.workingMonth) return;
      setCopyMenuOpen(false);
      setState((prev) => switchWorkingMonth(prev, nextMonth));
      pulseMonthBar();
    },
    [pulseMonthBar],
  );

  const handleSaveThisMonth = useCallback(() => {
    const month = stateRef.current.workingMonth;
    setState((prev) => saveWorkingMonth(prev));
    setCopyMenuOpen(false);
    showMonthToast(`Saved ${formatMonthShort(month)} homepage`);
  }, [showMonthToast]);

  const handleCopyFromMonth = useCallback(
    (fromMonth: string) => {
      const current = stateRef.current;
      const next = copyMonthCardsFrom(current, fromMonth);
      setCopyMenuOpen(false);
      if (!next) {
        showMonthToast("Nothing saved in that month yet");
        return;
      }
      setState(next);
      showMonthToast(
        `Copied ${formatMonthShort(fromMonth)} → ${formatMonthShort(current.workingMonth)}`,
      );
    },
    [showMonthToast],
  );

  useEffect(() => {
    if (!copyMenuOpen) return;
    const onDocClick = () => setCopyMenuOpen(false);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [copyMenuOpen]);

  useEffect(() => {
    return () => {
      if (monthToastTimerRef.current) clearTimeout(monthToastTimerRef.current);
    };
  }, []);

  const toggleEvent = useCallback(
    (eventId: string, checked: boolean) => {
      setState((prev) => {
        const selected = new Set(prev.selectedEventIds);
        if (checked) selected.add(eventId);
        else selected.delete(eventId);

        let cards = prev.cards.filter(
          (c) => !(c.source === "event" && c.eventId === eventId),
        );
        if (checked) {
          const event = eventById.get(eventId);
          if (event) {
            const evergreenTail = cards.filter(
              (c) => c.source === "custom" && c.id === "custom-supplies",
            );
            const rest = cards.filter(
              (c) => !(c.source === "custom" && c.id === "custom-supplies"),
            );
            cards = [...rest, cardFromEvent(event), ...evergreenTail];
          }
        }
        return {
          ...prev,
          selectedEventIds: [...selected],
          cards,
        };
      });
    },
    [eventById],
  );

  const updateCard = useCallback(
    (cardId: string, patch: Partial<HomepageCard>) => {
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) =>
          c.id === cardId ? { ...c, ...patch } : c,
        ),
      }));
    },
    [],
  );

  const generateCardBlurb = useCallback(
    async (card: HomepageCard) => {
      if (generatingBlurbCardId) return;
      setBlurbGenerateError(null);
      setGeneratingBlurbCardId(card.id);
      try {
        const result = await generateHomepageComposerBlurbAction({
          title: card.title,
          seedNotes: card.blurb,
          date: card.date,
          time: card.time,
          startsOn: card.startsOn,
          expiresOn: card.expiresOn,
          alwaysOn: card.alwaysOn,
          linkUrl: card.linkUrl,
          eventId: card.eventId,
        });
        if (!result.success || !result.blurb) {
          setBlurbGenerateError({
            cardId: card.id,
            message: result.error ?? "Unable to generate text right now.",
          });
          return;
        }
        updateCard(card.id, { blurb: result.blurb });
      } finally {
        setGeneratingBlurbCardId(null);
      }
    },
    [generatingBlurbCardId, updateCard],
  );

  /** Pull volunteer page URLs into empty event-card links (drafts + new events). */
  useEffect(() => {
    if (!hydrated) return;
    setState((prev) => {
      let changed = false;
      const cards = prev.cards.map((card) => {
        if (card.source !== "event" || !card.eventId) return card;
        if (card.linkUrl.trim()) return card;
        const event = eventById.get(card.eventId);
        const volunteerUrl = event?.volunteerSignupUrl?.trim() || "";
        if (!volunteerUrl) return card;
        changed = true;
        return {
          ...card,
          linkUrl: volunteerUrl,
          linkLabel:
            card.linkLabel.trim() && card.linkLabel !== "Learn More →"
              ? card.linkLabel
              : "Volunteer →",
        };
      });
      return changed ? { ...prev, cards } : prev;
    });
  }, [events, eventById, hydrated]);

  const syncVolunteerLinkFromCard = useCallback(
    (card: HomepageCard, linkUrl: string) => {
      if (card.source !== "event" || !card.eventId) return;
      void saveEventVolunteerSignupUrlAction(card.eventId, linkUrl);
    },
    [],
  );

  const addCustomCard = useCallback(() => {
    const id = `custom-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      cards: [
        ...prev.cards,
        {
          id,
          source: "custom",
          eventId: null,
          title: "New card",
          blurb: "Short blurb for your audience — edit me.",
          imageUrl: null,
          linkUrl: "",
          linkLabel: "",
          date: null,
          time: null,
          startsOn: null,
          expiresOn: null,
          alwaysOn: true,
        },
      ],
    }));
  }, []);

  const removeCard = useCallback((id: string) => {
    setState((prev) => {
      const card = prev.cards.find((c) => c.id === id);
      const cards = prev.cards.filter((c) => c.id !== id);
      const selectedEventIds =
        card?.source === "event" && card.eventId
          ? prev.selectedEventIds.filter((eventId) => eventId !== card.eventId)
          : prev.selectedEventIds;
      return { ...prev, cards, selectedEventIds };
    });
  }, []);

  const addResource = useCallback(() => {
    setState((prev) => ({
      ...prev,
      resources: [
        ...prev.resources,
        {
          id: `res-${Date.now()}`,
          emoji: "🔗",
          label: "New link",
          url: "#",
        },
      ],
    }));
  }, []);

  const updateResource = useCallback(
    (id: string, patch: Partial<HomepageResourceLink>) => {
      setState((prev) => ({
        ...prev,
        resources: prev.resources.map((r) =>
          r.id === id ? { ...r, ...patch } : r,
        ),
      }));
    },
    [],
  );

  const removeResource = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      resources: prev.resources.filter((r) => r.id !== id),
    }));
  }, []);

  const addAnnouncement = useCallback(() => {
    setState((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        announcements: [
          ...prev.header.announcements,
          {
            id: `ann-${Date.now()}`,
            emoji: DEFAULT_HOMEPAGE_EMOJI,
            text: "New announcement",
          },
        ],
      },
    }));
  }, []);

  const addAnnouncementFromEvent = useCallback((event: HomepageComposerEvent) => {
    setState((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        announcements: [
          ...prev.header.announcements,
          {
            id: `ann-${Date.now()}`,
            emoji: DEFAULT_HOMEPAGE_EMOJI,
            text: buildAnnouncementTextFromEvent(event),
          },
        ],
      },
    }));
  }, []);

  const updateAnnouncement = useCallback(
    (id: string, patch: Partial<HomepageAnnouncement>) => {
      setState((prev) => ({
        ...prev,
        header: {
          ...prev.header,
          announcements: prev.header.announcements.map((a) =>
            a.id === id ? { ...a, ...patch } : a,
          ),
        },
      }));
    },
    [],
  );

  const removeAnnouncement = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        announcements: prev.header.announcements.filter((a) => a.id !== id),
      },
    }));
  }, []);

  const openArtworkPicker = (cardId: string) => {
    artworkCardIdRef.current = cardId;
    artworkInputRef.current?.click();
  };

  const onArtworkSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const cardId = artworkCardIdRef.current;
    event.target.value = "";
    artworkCardIdRef.current = null;
    if (!file || !cardId) return;

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
      setCompressingCardId(cardId);
      try {
        const result = await compressImageForUpload(file);
        // Host on Hey Ralli so Membership Toolkit gets a small https:// image
        // link — not megabytes of base64 “gibberish” in the page HTML.
        const uploaded = await uploadHomepageComposerArtworkAction({
          cardId,
          dataUrl: result.dataUrl,
        });
        if (!uploaded.success || !uploaded.url) {
          throw new Error(
            uploaded.error ?? "Could not upload artwork. Try again.",
          );
        }
        updateCard(cardId, { imageUrl: uploaded.url });
      } catch (err) {
        window.alert(
          err instanceof Error
            ? err.message
            : "Could not prepare that image. Try another file.",
        );
      } finally {
        setCompressingCardId(null);
      }
    })();
  };

  const applyCardSort = (mode: CardSortMode) => {
    setCardSort(mode);
    if (mode === "custom") return;
    setState((prev) => ({
      ...prev,
      cards: sortHomepageCards(prev.cards, mode),
    }));
  };

  const onDragStart = (cardId: string) => setDragId(cardId);
  const onDragOver = (e: DragEvent, overId: string) => {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setCardSort("custom");
    setState((prev) => {
      const from = prev.cards.findIndex((c) => c.id === dragId);
      const to = prev.cards.findIndex((c) => c.id === overId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev.cards];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return { ...prev, cards: next };
    });
  };

  const activeResources = state.resources.filter((r) => r.label.trim());
  const activeAnnouncements = state.header.announcements.filter((a) =>
    a.text.trim(),
  );
  const isFullMonthPreview = previewDate === PREVIEW_FULL_MONTH;
  const visibleCardCount = state.cards.filter((c) =>
    isCardVisibleOn(c, previewDate),
  ).length;

  const sliderDates = useMemo(() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return buildPreviewSliderDates(state.cards, today);
  }, [state.cards]);

  const sliderIndex = sliderDates.findIndex((d) => d === previewDate);
  const resolvedSliderIndex =
    sliderIndex >= 0
      ? sliderIndex
      : Math.max(
          0,
          sliderDates.findIndex(
            (d) => d !== PREVIEW_FULL_MONTH && d >= previewDate,
          ),
        );

  useEffect(() => {
    if (sliderDates.length === 0) return;
    if (!sliderDates.includes(previewDate)) {
      setPreviewDate(PREVIEW_FULL_MONTH);
    }
  }, [sliderDates, previewDate]);

  const html = useMemo(() => exportHomepageHtml(state), [state]);
  const previewHtml = useMemo(
    () =>
      isFullMonthPreview
        ? exportHomepageHtml(state, {
            showAllCards: true,
            includeDataImages: true,
          })
        : exportHomepageHtml(state, {
            asOfDate: previewDate,
            includeDataImages: true,
          }),
    [state, previewDate, isFullMonthPreview],
  );

  // Chrome (Blink) often ignores React updates to iframe `srcDoc`; Safari does not.
  // Remount via key + set the `srcdoc` property so the preview always refreshes.
  const previewFrameKey = useMemo(() => {
    let hash = previewHtml.length;
    const step = Math.max(1, Math.floor(previewHtml.length / 48));
    for (let i = 0; i < previewHtml.length; i += step) {
      hash = (Math.imul(hash, 31) + previewHtml.charCodeAt(i)) | 0;
    }
    return `${previewDate}:${hash}`;
  }, [previewHtml, previewDate]);

  useEffect(() => {
    setShareLinkUrl(null);
    setShareLinkError(null);
  }, [state]);

  useEffect(() => {
    if (step !== "preview") return;
    const frame = previewFrameRef.current;
    if (!frame) return;
    frame.srcdoc = previewHtml;
  }, [step, previewHtml, previewFrameKey]);

  const copyHtml = async () => {
    setCopyLabel("Preparing…");
    try {
      let nextState = state;
      const embedded = state.cards.filter((c) =>
        c.imageUrl?.startsWith("data:"),
      );
      if (embedded.length > 0) {
        const cards = [...nextState.cards];
        for (const card of embedded) {
          if (!card.imageUrl?.startsWith("data:")) continue;
          const uploaded = await uploadHomepageComposerArtworkAction({
            cardId: card.id,
            dataUrl: card.imageUrl,
          });
          if (uploaded.success && uploaded.url) {
            const idx = cards.findIndex((c) => c.id === card.id);
            if (idx >= 0) {
              cards[idx] = { ...cards[idx]!, imageUrl: uploaded.url };
            }
          }
        }
        nextState = { ...nextState, cards };
        setState(nextState);
      }

      const payload = exportHomepageHtml(nextState);
      await navigator.clipboard.writeText(payload);
      setCopyLabel("Copied full page!");
      setTimeout(() => setCopyLabel("Copy full page HTML"), 1600);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy full page HTML"), 2000);
    }
  };

  const createFullMonthShareLink = async (): Promise<string | null> => {
    setShareLinkBusy(true);
    setShareLinkError(null);
    try {
      const result = await createHomepageComposerShareAction({
        state,
        previewMode: "full_month",
        includeVisibilityMemos: true,
        shareStatus: "shared",
      });
      if (!result.success) {
        setShareLinkError(result.error);
        return null;
      }
      setShareLinkUrl(result.url);
      return result.url;
    } catch {
      setShareLinkError("Could not create share link. Try again.");
      return null;
    } finally {
      setShareLinkBusy(false);
    }
  };

  const openFullMonthSharePage = async (options?: { print?: boolean }) => {
    const url = shareLinkUrl ?? (await createFullMonthShareLink());
    if (!url) return;
    const target = options?.print ? `${url}?print=1` : url;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const hc = state.header.colors;
  const fc = state.footer.colors;
  const heroTextOk =
    contrastRatio(averageHex(hc.backgroundStart, hc.backgroundEnd), hc.textColor) >=
    3;
  const headerBtnOk = contrastRatio(hc.buttonBackground, hc.buttonText) >= 3;
  const footerBtnOk = contrastRatio(fc.buttonBackground, fc.buttonText) >= 3;

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
                Homepage Composer
              </h1>
              <p className="mt-0.5 max-w-xl text-sm leading-snug text-cos-muted">
                Build your homepage — header, cards, footer, helpful resources,
                colors, and on/off dates.
              </p>
            </div>
            <p
              className={cn(
                "shrink-0 text-[11px] font-semibold sm:text-xs",
                saveStatus.kind === "error"
                  ? "text-cos-error"
                  : step === "cards" && monthStatus === "unsaved"
                    ? "text-cos-brand-mustard"
                    : step === "cards" && monthStatus === "empty"
                      ? "text-cos-muted"
                      : saveStatus.kind === "saved" ||
                          (step === "cards" && monthStatus === "saved")
                        ? "text-cos-brand-sage"
                        : "text-cos-muted",
              )}
              aria-live="polite"
            >
              {saveStatus.kind === "error"
                ? formatSaveStatus(saveStatus)
                : step === "cards"
                  ? monthStatus === "saved"
                    ? `${workingMonthShort} saved`
                    : monthStatus === "empty"
                      ? `${workingMonthShort} · empty`
                      : `${workingMonthShort} · unsaved`
                  : formatSaveStatus(saveStatus)}
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
                body="Colors, welcome copy, buttons, cards section title, and announcements."
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
                  className="p-4 text-center sm:p-5"
                  style={{
                    background: `linear-gradient(135deg, ${hc.backgroundStart}, ${hc.backgroundEnd})`,
                    color: hc.textColor,
                  }}
                >
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] opacity-80">
                    {organizationName || "Your organization"}
                  </p>
                  <h2 className="font-display text-xl sm:text-2xl">
                    {state.header.title}
                  </h2>
                  {state.header.message.trim() ? (
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-snug opacity-95">
                      {state.header.message}
                    </p>
                  ) : null}
                  {(state.header.button1Label.trim() ||
                    state.header.button2Label.trim()) && (
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      {state.header.button1Label.trim() ? (
                        <span
                          className="inline-block rounded-full px-5 py-2.5 text-sm font-bold"
                          style={{
                            background: hc.buttonBackground,
                            color: hc.buttonText,
                          }}
                        >
                          {state.header.button1Label}
                        </span>
                      ) : null}
                      {state.header.button2Label.trim() ? (
                        <span
                          className="inline-block rounded-full px-5 py-2.5 text-sm font-bold"
                          style={{
                            background: hc.buttonBackground,
                            color: hc.buttonText,
                          }}
                        >
                          {state.header.button2Label}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
                {activeAnnouncements.length > 0 && (
                  <div
                    className="border-t border-cos-border px-4 py-3 text-sm"
                    style={{
                      background: hc.announcementBackground,
                      color: hc.announcementText,
                    }}
                  >
                    {activeAnnouncements.map((announcement) => (
                      <div key={announcement.id} className="flex gap-2 py-0.5">
                        <span aria-hidden>{announcement.emoji}</span>
                        <span>{announcement.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <SettingsBox
                compact
                title="Background colors"
                description="Gradient hero, text, buttons, and announcement bar."
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ColorField
                    label="Background start"
                    value={hc.backgroundStart}
                    onChange={(hex) =>
                      setState((p) => {
                        const backgroundStart = normalizeHex(
                          hex,
                          p.header.colors.backgroundStart,
                        );
                        const mid = averageHex(
                          backgroundStart,
                          p.header.colors.backgroundEnd,
                        );
                        return {
                          ...p,
                          header: {
                            ...p.header,
                            colors: {
                              ...p.header.colors,
                              backgroundStart,
                              textColor: contrastingText(mid),
                            },
                          },
                        };
                      })
                    }
                  />
                  <ColorField
                    label="Background end"
                    value={hc.backgroundEnd}
                    onChange={(hex) =>
                      setState((p) => {
                        const backgroundEnd = normalizeHex(
                          hex,
                          p.header.colors.backgroundEnd,
                        );
                        const mid = averageHex(
                          p.header.colors.backgroundStart,
                          backgroundEnd,
                        );
                        return {
                          ...p,
                          header: {
                            ...p.header,
                            colors: {
                              ...p.header.colors,
                              backgroundEnd,
                              textColor: contrastingText(mid),
                            },
                          },
                        };
                      })
                    }
                  />
                  <ColorField
                    label="Text color"
                    value={hc.textColor}
                    onChange={(hex) =>
                      setState((p) => ({
                        ...p,
                        header: {
                          ...p.header,
                          colors: {
                            ...p.header.colors,
                            textColor: normalizeHex(
                              hex,
                              p.header.colors.textColor,
                            ),
                          },
                        },
                      }))
                    }
                    hint={
                      heroTextOk
                        ? "Contrast OK"
                        : "Low contrast — try Auto text"
                    }
                    actionLabel="Auto text"
                    onAction={() =>
                      setState((p) => ({
                        ...p,
                        header: {
                          ...p.header,
                          colors: {
                            ...p.header.colors,
                            textColor: contrastingText(
                              averageHex(
                                p.header.colors.backgroundStart,
                                p.header.colors.backgroundEnd,
                              ),
                            ),
                          },
                        },
                      }))
                    }
                  />
                  <ColorField
                    label="Button color"
                    value={hc.buttonBackground}
                    onChange={(hex) =>
                      setState((p) => {
                        const buttonBackground = normalizeHex(
                          hex,
                          p.header.colors.buttonBackground,
                        );
                        return {
                          ...p,
                          header: {
                            ...p.header,
                            colors: {
                              ...p.header.colors,
                              buttonBackground,
                              buttonText: contrastingText(buttonBackground),
                            },
                          },
                        };
                      })
                    }
                  />
                  <ColorField
                    label="Button text"
                    value={hc.buttonText}
                    onChange={(hex) =>
                      setState((p) => ({
                        ...p,
                        header: {
                          ...p.header,
                          colors: {
                            ...p.header.colors,
                            buttonText: normalizeHex(
                              hex,
                              p.header.colors.buttonText,
                            ),
                          },
                        },
                      }))
                    }
                    hint={headerBtnOk ? "Contrast OK" : "Low contrast"}
                  />
                  <ColorField
                    label="Announcement bg"
                    value={hc.announcementBackground}
                    onChange={(hex) =>
                      setState((p) => {
                        const announcementBackground = normalizeHex(
                          hex,
                          p.header.colors.announcementBackground,
                        );
                        return {
                          ...p,
                          header: {
                            ...p.header,
                            colors: {
                              ...p.header.colors,
                              announcementBackground,
                              announcementText: contrastingText(
                                announcementBackground,
                              ),
                            },
                          },
                        };
                      })
                    }
                  />
                </div>
              </SettingsBox>

              <SettingsBox
                compact
                title="Title & buttons"
                description="Welcome copy and primary calls to action."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Title"
                    value={state.header.title}
                    onChange={(v) =>
                      setState((p) => ({
                        ...p,
                        header: { ...p.header, title: v },
                      }))
                    }
                  />
                  <Field
                    label="Message"
                    value={state.header.message}
                    onChange={(v) =>
                      setState((p) => ({
                        ...p,
                        header: { ...p.header, message: v },
                      }))
                    }
                    multiline
                  />
                  <Field
                    label="Button 1 label"
                    value={state.header.button1Label}
                    onChange={(v) =>
                      setState((p) => ({
                        ...p,
                        header: { ...p.header, button1Label: v },
                      }))
                    }
                  />
                  <Field
                    label="Button 1 URL"
                    value={state.header.button1Url}
                    onChange={(v) =>
                      setState((p) => ({
                        ...p,
                        header: { ...p.header, button1Url: v },
                      }))
                    }
                  />
                  <Field
                    label="Button 2 label"
                    value={state.header.button2Label}
                    onChange={(v) =>
                      setState((p) => ({
                        ...p,
                        header: { ...p.header, button2Label: v },
                      }))
                    }
                  />
                  <Field
                    label="Button 2 URL"
                    value={state.header.button2Url}
                    onChange={(v) =>
                      setState((p) => ({
                        ...p,
                        header: { ...p.header, button2Url: v },
                      }))
                    }
                  />
                </div>
              </SettingsBox>

              <SettingsBox
                compact
                title="Cards section"
                description="Large heading above your event cards in preview and export."
              >
                <Field
                  label="Section title"
                  value={state.cardsSectionTitle}
                  onChange={(v) =>
                    setState((p) => ({
                      ...p,
                      cardsSectionTitle: v,
                    }))
                  }
                  placeholder="What’s Happening"
                />
              </SettingsBox>

              <SettingsBox
                compact
                title="Announcements"
                description="Emoji + text rows shown below the hero gradient."
                actions={
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addAnnouncement}
                    >
                      <Plus className="h-4 w-4" />
                      Add announcement
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setShowAnnouncementEventPicker((open) => !open)
                      }
                      aria-expanded={showAnnouncementEventPicker}
                    >
                      <Calendar className="h-4 w-4" />
                      From calendar
                    </Button>
                  </div>
                }
              >
                {showAnnouncementEventPicker ? (
                  <div className="mb-4 rounded-[14px] border border-cos-border bg-cos-bg-alt/80 p-3">
                    <p className="text-sm font-semibold text-cos-text">
                      Add from your event calendar
                    </p>
                    <p className="mt-1 text-xs text-cos-muted">
                      Pick an event to create an announcement row — edit the
                      text and emoji after adding.
                    </p>
                    <label className="mt-3 block">
                      <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.05em] text-cos-muted">
                        Month
                      </span>
                      <select
                        className="w-full rounded-xl border border-cos-border bg-cos-card px-3 py-2.5 text-sm text-cos-text sm:max-w-xs"
                        value={eventFilterMonth}
                        onChange={(e) => setEventFilterMonth(e.target.value)}
                      >
                        {monthOptions.map((month) => (
                          <option key={month} value={month}>
                            {formatMonthLabel(month)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-3 max-h-48 space-y-2 overflow-auto">
                      {events.length === 0 ? (
                        <p className="text-sm text-cos-muted">
                          No events yet.{" "}
                          <Link
                            href="/events/create"
                            className="font-semibold text-cos-brand-sage underline"
                          >
                            Create an event
                          </Link>
                          .
                        </p>
                      ) : filteredEvents.length === 0 ? (
                        <p className="text-sm text-cos-muted">
                          No events in {formatMonthLabel(eventFilterMonth)}.
                        </p>
                      ) : (
                        filteredEvents.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between gap-2 rounded-[14px] border border-cos-border bg-cos-card px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-cos-text">
                                {event.title}
                              </p>
                              <p className="text-xs text-cos-muted">
                                {formatEventWhen(event.date, event.time) ||
                                  "Date TBD"}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => addAnnouncementFromEvent(event)}
                            >
                              Add
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
                {state.header.announcements.length === 0 ? (
                  <p className="text-sm text-cos-muted">
                    No announcements yet — add one to highlight dates or news.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {state.header.announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-2"
                      >
                        <EmojiPicker
                          value={announcement.emoji}
                          onChange={(emoji) =>
                            updateAnnouncement(announcement.id, { emoji })
                          }
                          label="Emoji"
                        />
                        <Field
                          label="Text"
                          value={announcement.text}
                          onChange={(text) =>
                            updateAnnouncement(announcement.id, { text })
                          }
                        />
                        <button
                          type="button"
                          className="mb-0.5 rounded-xl border border-cos-border px-2 py-2.5 text-cos-muted hover:text-cos-error"
                          onClick={() => removeAnnouncement(announcement.id)}
                          aria-label="Remove announcement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SettingsBox>
            </section>
          )}

          {step === "footer" && (
            <section className="space-y-3">
              <PanelHead
                title="Design your footer"
                body="Get Involved colors plus Helpful Resources quick links."
                actions={
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep("header")}
                    >
                      ← Header
                    </Button>
                    <Button type="button" onClick={() => setStep("cards")}>
                      Save → Cards
                    </Button>
                  </>
                }
              />

              <SettingsBox
                compact
                title="Footer design"
                description="Colors and copy for the Get Involved section."
              >
                <div
                  className="mb-4 rounded-[18px] px-6 py-8 text-center"
                  style={{ background: fc.background, color: fc.textColor }}
                >
                  <h3 className="font-display text-3xl">
                    {state.footer.ctaTitle}
                  </h3>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed opacity-90">
                    {state.footer.ctaBody}
                  </p>
                  <div className="mt-4">
                    <span
                      className="inline-block rounded-full px-5 py-2.5 text-sm font-bold"
                      style={{
                        background: fc.buttonBackground,
                        color: fc.buttonText,
                      }}
                    >
                      {state.footer.ctaButtonLabel}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ColorField
                    label="Footer background"
                    value={fc.background}
                    onChange={(hex) =>
                      setState((p) => {
                        const background = normalizeHex(
                          hex,
                          p.footer.colors.background,
                        );
                        return {
                          ...p,
                          footer: {
                            ...p.footer,
                            colors: {
                              ...p.footer.colors,
                              background,
                              textColor: contrastingText(background),
                            },
                          },
                        };
                      })
                    }
                  />
                  <ColorField
                    label="Footer text"
                    value={fc.textColor}
                    onChange={(hex) =>
                      setState((p) => ({
                        ...p,
                        footer: {
                          ...p.footer,
                          colors: {
                            ...p.footer.colors,
                            textColor: normalizeHex(
                              hex,
                              p.footer.colors.textColor,
                            ),
                          },
                        },
                      }))
                    }
                  />
                  <ColorField
                    label="Footer button"
                    value={fc.buttonBackground}
                    onChange={(hex) =>
                      setState((p) => {
                        const buttonBackground = normalizeHex(
                          hex,
                          p.footer.colors.buttonBackground,
                        );
                        return {
                          ...p,
                          footer: {
                            ...p.footer,
                            colors: {
                              ...p.footer.colors,
                              buttonBackground,
                              buttonText: contrastingText(buttonBackground),
                            },
                          },
                        };
                      })
                    }
                    hint={footerBtnOk ? "Contrast OK" : "Low contrast"}
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Title"
                    value={state.footer.ctaTitle}
                    onChange={(v) =>
                      setState((p) => ({
                        ...p,
                        footer: { ...p.footer, ctaTitle: v },
                      }))
                    }
                  />
                  <Field
                    label="Button label"
                    value={state.footer.ctaButtonLabel}
                    onChange={(v) =>
                      setState((p) => ({
                        ...p,
                        footer: { ...p.footer, ctaButtonLabel: v },
                      }))
                    }
                  />
                  <Field
                    label="Body"
                    value={state.footer.ctaBody}
                    onChange={(v) =>
                      setState((p) => ({
                        ...p,
                        footer: { ...p.footer, ctaBody: v },
                      }))
                    }
                    multiline
                  />
                  <Field
                    label="Button URL"
                    value={state.footer.ctaButtonUrl}
                    onChange={(v) =>
                      setState((p) => ({
                        ...p,
                        footer: { ...p.footer, ctaButtonUrl: v },
                      }))
                    }
                  />
                </div>
              </SettingsBox>

              <SettingsBox
                compact
                title="Helpful Resources"
                description={
                  activeResources.length > 0
                    ? "Quick links with emojis. Hidden in export if empty."
                    : undefined
                }
                actions={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addResource}
                  >
                    <Plus className="h-4 w-4" />
                    Add link
                  </Button>
                }
              >
                {activeResources.length > 0 && (
                  <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {activeResources.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-full px-3 py-4 text-center text-sm font-bold"
                        style={{
                          background: fc.resourceBackground,
                          color: fc.resourceText,
                        }}
                      >
                        <div className="text-xl">{r.emoji}</div>
                        {r.label}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <ColorField
                    label="Resource pill bg"
                    value={fc.resourceBackground}
                    onChange={(hex) =>
                      setState((p) => {
                        const resourceBackground = normalizeHex(
                          hex,
                          p.footer.colors.resourceBackground,
                        );
                        return {
                          ...p,
                          footer: {
                            ...p.footer,
                            colors: {
                              ...p.footer.colors,
                              resourceBackground,
                              resourceText: contrastingText(resourceBackground),
                            },
                          },
                        };
                      })
                    }
                  />
                  <ColorField
                    label="Resource text"
                    value={fc.resourceText}
                    onChange={(hex) =>
                      setState((p) => ({
                        ...p,
                        footer: {
                          ...p.footer,
                          colors: {
                            ...p.footer.colors,
                            resourceText: normalizeHex(
                              hex,
                              p.footer.colors.resourceText,
                            ),
                          },
                        },
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  {state.resources.map((r) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2"
                    >
                      <EmojiPicker
                        value={r.emoji}
                        onChange={(emoji) => updateResource(r.id, { emoji })}
                      />
                      <Field
                        label="Label"
                        value={r.label}
                        onChange={(label) => updateResource(r.id, { label })}
                      />
                      <Field
                        label="URL"
                        value={r.url}
                        onChange={(url) =>
                          updateResource(r.id, {
                            // Live-clean "#https://…" so export/paste links work.
                            url: url.replace(/^#(https?:\/\/)/i, "$1"),
                          })
                        }
                        placeholder="https://…"
                      />
                      <button
                        type="button"
                        className="mb-0.5 rounded-xl border border-cos-border px-2 py-2.5 text-cos-muted hover:text-cos-error"
                        onClick={() => removeResource(r.id)}
                        aria-label="Remove link"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </SettingsBox>
            </section>
          )}

          {step === "cards" && (
            <section className="space-y-3">
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-cos-border bg-cos-card px-3.5 py-3 shadow-[0_8px_28px_rgba(28,36,48,0.06)]",
                  monthBarPulse &&
                    "border-[rgba(42,122,134,0.35)] shadow-[0_0_0_4px_rgba(42,122,134,0.12)]",
                )}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-cos-muted">
                      Working on
                    </p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-cos-border bg-cos-bg-alt p-1">
                      <button
                        type="button"
                        className="inline-grid h-8 w-8 place-items-center rounded-full text-cos-muted transition hover:bg-cos-card hover:text-cos-text disabled:opacity-35"
                        aria-label="Previous month"
                        disabled={workingMonthIndex <= 0}
                        onClick={() => {
                          const prev = workingMonthKeys[workingMonthIndex - 1];
                          if (prev) goToWorkingMonth(prev);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <select
                        className="max-w-[11rem] appearance-none border-none bg-transparent py-1 pl-2.5 pr-7 font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-cos-text focus:outline-none"
                        style={{
                          backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%237a7166' stroke-width='2'%3E%3Cpath d='M2 4l4 4 4-4'/%3E%3C/svg%3E\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 8px center",
                        }}
                        aria-label="Working on month"
                        value={state.workingMonth}
                        onChange={(e) => goToWorkingMonth(e.target.value)}
                      >
                        {workingMonthKeys.map((month) => (
                          <option key={month} value={month}>
                            {formatMonthLabel(month)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="inline-grid h-8 w-8 place-items-center rounded-full text-cos-muted transition hover:bg-cos-card hover:text-cos-text disabled:opacity-35"
                        aria-label="Next month"
                        disabled={
                          workingMonthIndex < 0 ||
                          workingMonthIndex >= workingMonthKeys.length - 1
                        }
                        onClick={() => {
                          const next = workingMonthKeys[workingMonthIndex + 1];
                          if (next) goToWorkingMonth(next);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[12.5px] leading-snug text-cos-muted">
                    {monthStatus === "unsaved" ? (
                      <>
                        Unsaved changes for{" "}
                        <strong className="font-semibold text-cos-text">
                          {workingMonthShort}
                        </strong>
                      </>
                    ) : monthStatus === "empty" ? (
                      "Empty draft — not saved yet"
                    ) : (
                      <>
                        Saved homepage for{" "}
                        <strong className="font-semibold text-cos-text">
                          {workingMonthShort}
                        </strong>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      className="rounded-full px-2.5 py-2 text-sm font-bold text-[#2a7a86] hover:underline disabled:opacity-45"
                      disabled={copyFromMonths.length === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCopyMenuOpen((open) => !open);
                      }}
                    >
                      Copy from…
                    </button>
                    {copyMenuOpen ? (
                      <div
                        className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-[180px] rounded-[14px] border border-cos-border bg-cos-card p-1.5 shadow-[0_14px_36px_rgba(42,38,34,0.14)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {copyFromMonths.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            className="block w-full rounded-[10px] px-3 py-2 text-left text-sm font-semibold text-cos-text hover:bg-cos-bg-alt"
                            onClick={() => handleCopyFromMonth(item.key)}
                          >
                            {formatMonthLabel(item.key)}
                            <span className="mt-0.5 block text-[11px] font-medium text-cos-muted">
                              Saved · {item.cardCount}{" "}
                              {item.cardCount === 1 ? "card" : "cards"}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Button type="button" onClick={handleSaveThisMonth}>
                    Save this month
                  </Button>
                </div>
              </div>

              <PanelHead
                title="Homepage cards"
                body={
                  state.cards.length === 0
                    ? `Empty draft for ${workingMonthShort} — add cards or copy from a prior month.`
                    : `Cards for ${workingMonthShort} — reorder, edit, then save this month.`
                }
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
                      onClick={addCustomCard}
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.75} />
                      Add other card
                    </Button>
                    <Button type="button" onClick={() => setStep("preview")}>
                      Preview →
                    </Button>
                  </>
                }
              />
              <div className="rounded-[12px] bg-cos-brand-mustard/35 px-3 py-2 text-xs leading-snug text-cos-text sm:text-sm">
                On / off dates still control when each card appears. Saving by
                month keeps a full draft for that month so you can build ahead
                while another month is live.
              </div>
              <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)]">
                <div className="rounded-[18px] border border-cos-border bg-cos-card p-3 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                  <h3 className="font-display text-lg text-cos-text">
                    From your events
                  </h3>
                  <label className="mt-3 block">
                    <span className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.05em] text-cos-muted">
                      Event list month
                    </span>
                    <select
                      className="w-full rounded-xl border border-cos-border bg-cos-card px-3 py-2.5 text-sm text-cos-text"
                      value={eventFilterMonth}
                      onChange={(e) => setEventFilterMonth(e.target.value)}
                      aria-label="Event list month filter"
                    >
                      {monthOptions.map((month) => (
                        <option key={month} value={month}>
                          {formatMonthLabel(month)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mt-1.5 text-[11px] leading-snug text-cos-muted">
                    Filters this list only — not your homepage draft month.
                  </p>
                  <div className="mt-3 max-h-[70vh] space-y-2 overflow-auto">
                    {events.length === 0 ? (
                      <p className="text-sm text-cos-muted">
                        No events yet.{" "}
                        <Link
                          href="/events/create"
                          className="font-semibold text-cos-brand-sage underline"
                        >
                          Create an event
                        </Link>
                        .
                      </p>
                    ) : filteredEvents.length === 0 ? (
                      <p className="text-sm text-cos-muted">
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
                            className="flex cursor-pointer items-start gap-2.5 rounded-[14px] border border-cos-border bg-cos-card px-3 py-2.5 transition-colors duration-150 hover:border-cos-brand-sage"
                          >
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={checked}
                              onChange={(e) =>
                                toggleEvent(event.id, e.target.checked)
                              }
                            />
                            <span>
                              <span className="block text-sm font-semibold text-cos-text">
                                {event.title}
                              </span>
                              <span className="text-xs text-cos-muted">
                                {formatEventWhen(event.date, event.time) ||
                                  "Date TBD"}
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
                      On homepage · drag to reorder
                    </h3>
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cos-muted">
                      <span className="sr-only">Sort cards</span>
                      <select
                        value={cardSort}
                        onChange={(e) =>
                          applyCardSort(e.target.value as CardSortMode)
                        }
                        disabled={state.cards.length < 2}
                        className="h-9 min-w-[11.5rem] rounded-lg border border-cos-border bg-cos-card px-2.5 text-sm font-medium normal-case tracking-normal text-cos-text focus:border-cos-brand-forest focus:outline-none focus:ring-2 focus:ring-cos-brand-forest/20 disabled:opacity-50"
                      >
                        {CARD_SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            Sort: {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {state.cards.length === 0 ? (
                    <div className="mt-4 rounded-[16px] border border-dashed border-cos-border bg-cos-bg-alt/60 px-5 py-9 text-center">
                      <h4 className="font-display text-xl text-cos-text">
                        No cards for {workingMonthShort} yet
                      </h4>
                      <p className="mx-auto mt-2 max-w-sm text-sm leading-snug text-cos-muted">
                        This month is its own draft. Add cards from events, or
                        copy a saved month to get started.
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {copyFromMonths[0] ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() =>
                              handleCopyFromMonth(copyFromMonths[0]!.key)
                            }
                          >
                            Copy from {formatMonthShort(copyFromMonths[0].key)}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={addCustomCard}
                          >
                            <Plus className="h-4 w-4" strokeWidth={1.75} />
                            Add other card
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {state.cards.map((card) => (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={() => onDragStart(card.id)}
                          onDragOver={(e) => onDragOver(e, card.id)}
                          onDragEnd={() => setDragId(null)}
                          className={cn(
                            "rounded-[14px] border border-cos-border bg-cos-card p-3 transition-colors duration-150 hover:border-cos-brand-sage",
                            dragId === card.id && "opacity-50",
                          )}
                        >
                          <div className="grid grid-cols-[24px_72px_minmax(0,1fr)] items-start gap-3">
                            <GripVertical
                              className="mt-2 h-5 w-5 cursor-grab justify-self-center text-cos-muted"
                              strokeWidth={1.5}
                            />
                            <div className="space-y-1.5">
                              <div className="aspect-square h-[72px] w-[72px] overflow-hidden rounded-[14px] bg-cos-bg-alt">
                                {card.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={card.imageUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[10px] font-bold text-cos-brand-sage">
                                    1:1
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  title={
                                    compressingCardId === card.id
                                      ? "Working…"
                                      : "Upload artwork"
                                  }
                                  aria-label={
                                    compressingCardId === card.id
                                      ? "Working on artwork upload"
                                      : "Upload artwork"
                                  }
                                  disabled={compressingCardId !== null}
                                  onClick={() => openArtworkPicker(card.id)}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(42,38,34,0.05)] text-[#8a8278] transition-colors hover:bg-[rgba(47,74,60,0.08)] hover:text-[#2f4a3c] disabled:opacity-40"
                                >
                                  <Upload
                                    className="h-3 w-3"
                                    strokeWidth={1.5}
                                  />
                                </button>
                                <Link
                                  href={
                                    card.eventId
                                      ? campaignBuilderHref(
                                          card.eventId,
                                          "preview",
                                        )
                                      : "/create-with-ai"
                                  }
                                  title={
                                    card.eventId
                                      ? "Create artwork with AI"
                                      : "Create with AI"
                                  }
                                  aria-label={
                                    card.eventId
                                      ? "Create artwork with AI for this event"
                                      : "Open Create with AI"
                                  }
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(42,38,34,0.05)] text-[#8a8278] transition-colors hover:bg-[rgba(47,74,60,0.08)] hover:text-[#2f4a3c]"
                                >
                                  <Sparkles
                                    className="h-3 w-3"
                                    strokeWidth={1.5}
                                  />
                                </Link>
                              </div>
                            </div>
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  className="min-w-0 flex-1 rounded-lg border border-cos-border bg-cos-card px-2 py-1.5 font-display text-sm font-semibold text-cos-text"
                                  value={card.title}
                                  onChange={(e) =>
                                    updateCard(card.id, {
                                      title: e.target.value,
                                    })
                                  }
                                />
                                <span className="rounded-full bg-cos-bg-alt px-2.5 py-1 text-[11px] font-bold text-cos-brand-sage">
                                  {card.alwaysOn
                                    ? "Always"
                                    : `→ ${formatBadgeDate(card.expiresOn)}`}
                                </span>
                                <button
                                  type="button"
                                  className="rounded-xl border border-cos-border px-2 py-1.5 text-cos-muted hover:text-cos-error"
                                  onClick={() => removeCard(card.id)}
                                  aria-label="Remove card"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="relative">
                                <textarea
                                  className="w-full rounded-lg border border-cos-border bg-cos-card py-1.5 pl-2 pr-7 text-xs text-cos-text"
                                  rows={2}
                                  value={card.blurb}
                                  onChange={(e) => {
                                    setBlurbGenerateError(null);
                                    updateCard(card.id, {
                                      blurb: e.target.value,
                                    });
                                  }}
                                  placeholder="Short card description — or notes for AI"
                                />
                                <button
                                  type="button"
                                  title="Generate text"
                                  aria-label={
                                    generatingBlurbCardId === card.id
                                      ? "Generating text"
                                      : "Generate text"
                                  }
                                  disabled={generatingBlurbCardId !== null}
                                  onClick={() => void generateCardBlurb(card)}
                                  className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(42,38,34,0.05)] text-[#8a8278] transition-colors hover:bg-[rgba(47,74,60,0.08)] hover:text-[#2f4a3c] disabled:opacity-40"
                                >
                                  {generatingBlurbCardId === card.id ? (
                                    <Loader2
                                      className="h-3 w-3 animate-spin"
                                      strokeWidth={1.5}
                                    />
                                  ) : (
                                    <Sparkles
                                      className="h-3 w-3"
                                      strokeWidth={1.5}
                                    />
                                  )}
                                </button>
                              </div>
                              {blurbGenerateError?.cardId === card.id ? (
                                <p
                                  className="text-[11px] text-red-600"
                                  role="alert"
                                >
                                  {blurbGenerateError.message}
                                </p>
                              ) : null}
                              <input
                                className="w-full rounded-lg border border-cos-border bg-cos-card px-2 py-1.5 text-xs text-cos-text"
                                value={card.linkUrl}
                                onChange={(e) =>
                                  updateCard(card.id, {
                                    linkUrl: e.target.value,
                                  })
                                }
                                onBlur={(e) =>
                                  syncVolunteerLinkFromCard(
                                    card,
                                    e.target.value,
                                  )
                                }
                                placeholder={
                                  card.source === "event"
                                    ? "Volunteer page URL (updates the event)"
                                    : "Optional link URL"
                                }
                              />
                              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
                                <label className="block text-[11px] font-bold uppercase tracking-wide text-cos-muted">
                                  Link
                                  <input
                                    className="mt-1 w-full rounded-lg border border-cos-border bg-cos-card px-2 py-1.5 text-xs font-normal normal-case tracking-normal text-cos-text"
                                    value={card.linkLabel}
                                    onChange={(e) =>
                                      updateCard(card.id, {
                                        linkLabel: e.target.value,
                                      })
                                    }
                                    placeholder="Learn More →"
                                  />
                                </label>
                                <label className="block text-[11px] font-bold uppercase tracking-wide text-cos-muted">
                                  Card date
                                  <input
                                    type="date"
                                    className="mt-1 w-full rounded-lg border border-cos-border bg-cos-card px-2 py-1.5 text-xs font-normal normal-case tracking-normal text-cos-text"
                                    value={card.date ?? ""}
                                    onChange={(e) =>
                                      updateCard(card.id, {
                                        date: e.target.value || null,
                                      })
                                    }
                                  />
                                </label>
                                <label className="block text-[11px] font-bold uppercase tracking-wide text-cos-muted">
                                  Start time
                                  <input
                                    type="time"
                                    className="mt-1 w-full rounded-lg border border-cos-border bg-cos-card px-2 py-1.5 text-xs font-normal normal-case tracking-normal text-cos-text"
                                    value={toNativeTimeInputValue(card.time)}
                                    onChange={(e) =>
                                      updateCard(card.id, {
                                        time: fromNativeTimeInputValue(
                                          e.target.value,
                                        ),
                                      })
                                    }
                                  />
                                </label>
                              </div>
                              <p className="text-[10px] leading-snug text-cos-muted">
                                Card date and start time appear on the card
                                face. On / Off below only control when the card
                                is visible.
                              </p>
                              <div className="grid gap-2 rounded-[12px] bg-cos-bg-alt/80 p-2 sm:grid-cols-[auto_1fr_1fr]">
                                <label className="flex items-center gap-2 text-xs font-semibold text-cos-text">
                                  <input
                                    type="checkbox"
                                    checked={card.alwaysOn}
                                    onChange={(e) =>
                                      updateCard(card.id, {
                                        alwaysOn: e.target.checked,
                                      })
                                    }
                                  />
                                  Always on
                                </label>
                                <label className="block text-[11px] font-bold uppercase tracking-wide text-cos-muted">
                                  On date
                                  <input
                                    type="date"
                                    className="mt-1 w-full rounded-lg border border-cos-border bg-cos-card px-2 py-1.5 text-xs text-cos-text disabled:opacity-40"
                                    disabled={card.alwaysOn}
                                    value={card.startsOn ?? ""}
                                    onChange={(e) =>
                                      updateCard(card.id, {
                                        startsOn: e.target.value || null,
                                        alwaysOn: false,
                                      })
                                    }
                                  />
                                </label>
                                <label className="block text-[11px] font-bold uppercase tracking-wide text-cos-muted">
                                  Off date
                                  <input
                                    type="date"
                                    className="mt-1 w-full rounded-lg border border-cos-border bg-cos-card px-2 py-1.5 text-xs text-cos-text disabled:opacity-40"
                                    disabled={card.alwaysOn}
                                    value={card.expiresOn ?? ""}
                                    onChange={(e) =>
                                      updateCard(card.id, {
                                        expiresOn: e.target.value || null,
                                        alwaysOn: false,
                                      })
                                    }
                                  />
                                </label>
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
                body={`Showing ${formatMonthLabel(state.workingMonth)} cards with your shared header and footer. Drag the date slider to watch cards roll on and off. On full month, open the share page or save as PDF to send for review.`}
                actions={
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep("cards")}
                    >
                      ← Cards
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
                  <div className="flex flex-wrap items-center gap-2">
                    {isFullMonthPreview ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 w-9 shrink-0 p-0"
                          disabled={shareLinkBusy}
                          onClick={() => void openFullMonthSharePage()}
                          title="Open page"
                          aria-label="Open page"
                        >
                          <ExternalLink className="h-4 w-4" strokeWidth={2} />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 w-9 shrink-0 p-0"
                          disabled={shareLinkBusy}
                          onClick={() => void openFullMonthSharePage({ print: true })}
                          title="Save as PDF"
                          aria-label="Save as PDF"
                        >
                          <Download className="h-4 w-4" strokeWidth={2} />
                        </Button>
                      </>
                    ) : null}
                    <span className="rounded-xl border border-cos-border bg-cos-card px-3 py-2 text-sm font-semibold text-cos-text">
                      {formatPreviewSliderLabel(previewDate)}
                    </span>
                  </div>
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
                {isFullMonthPreview && shareLinkError ? (
                  <p className="mt-2 text-xs font-semibold text-cos-error" role="alert">
                    {shareLinkError}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-cos-muted">
                  <span>
                    {isFullMonthPreview
                      ? `${visibleCardCount} card${visibleCardCount === 1 ? "" : "s"} on the page · slide to see rotation`
                      : `${visibleCardCount} card${visibleCardCount === 1 ? "" : "s"} visible · footer${
                          activeResources.length > 0
                            ? ` · ${activeResources.length} quick links`
                            : " · no quick links"
                        }`}
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
                        const d = new Date();
                        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

              <div className="overflow-hidden rounded-[22px] border border-cos-border bg-white shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <iframe
                  key={previewFrameKey}
                  ref={previewFrameRef}
                  title="Homepage full page preview"
                  srcDoc={previewHtml}
                  className="block w-full border-0 bg-white"
                  style={{ minHeight: 920, height: "80vh" }}
                />
              </div>
            </section>
          )}

          {step === "export" && (
            <section className="space-y-3">
              <PanelHead
                title="Copy full page code"
                body="Complete homepage HTML — styles, header, cards, footer, helpful resources, and date script."
                actions={
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setStep("preview")}
                    >
                      ← Preview
                    </Button>
                    <Button type="button" onClick={copyHtml}>
                      {copyLabel}
                    </Button>
                  </>
                }
              />
              <div className="max-w-4xl rounded-[22px] border border-cos-border bg-cos-card p-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <ul className="space-y-2 text-sm text-cos-text">
                  <li>✓ Full page (not cards only)</li>
                  <li>✓ Header &amp; footer colors with contrast-aware text</li>
                  <li>✓ Cards with editable on/off dates</li>
                  <li>✓ Helpful Resources emoji quick links</li>
                  <li>✓ Empty cards or resources sections omitted</li>
                </ul>
                <pre className="mt-4 max-h-[420px] overflow-auto rounded-[14px] bg-cos-dark p-4 text-xs leading-relaxed text-[#d9e0d6]">
                  {html}
                </pre>
              </div>
            </section>
          )}
        </div>
      </div>

      {monthToast ? (
        <div
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-cos-text px-4 py-2.5 text-sm font-semibold text-cos-bg shadow-[0_12px_32px_rgba(42,38,34,0.22)]"
          role="status"
        >
          {monthToast}
        </div>
      ) : null}
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
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="font-display text-2xl text-cos-text">{title}</h2>
        <p className="mt-0.5 max-w-xl text-xs leading-snug text-cos-muted sm:text-sm">
          {body}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
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
  hint,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  hint?: string;
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
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalizeHex(value, "#000000")}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-cos-border bg-transparent p-1"
        />
        <input
          className="w-full rounded-xl border border-cos-border bg-cos-card px-3 py-2.5 font-mono text-sm text-cos-text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {hint ? (
        <span className="mt-1 block text-[11px] text-cos-muted">{hint}</span>
      ) : null}
    </label>
  );
}
