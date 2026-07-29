"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { CalendarImportEasePanel } from "@/components/calendar-import/CalendarImportEasePanel";
import { CalendarImportPlanList } from "@/components/unified-calendar/CalendarImportPlanList";
import { CalendarLayerColorsProvider } from "@/components/unified-calendar/CalendarLayerColorsContext";
import { CalendarComingUpEase } from "@/components/unified-calendar/CalendarComingUpEase";
import { UnifiedCalendarControlPanel } from "@/components/unified-calendar/UnifiedCalendarControlPanel";
import { PlanningCalendarAgendaView } from "@/components/communications-planning-calendar/PlanningCalendarAgendaView";
import { PlanningCalendarDetailPanel } from "@/components/communications-planning-calendar/PlanningCalendarDetailPanel";
import type { PlanningDragPayload } from "@/components/communications-planning-calendar/PlanningCalendarItemChip";
import { PlanningCalendarMonthView } from "@/components/communications-planning-calendar/PlanningCalendarMonthView";
import { PlanningCalendarWeekView } from "@/components/communications-planning-calendar/PlanningCalendarWeekView";
import {
  applyOptimisticReschedule,
  matchesDragPayload,
} from "@/components/communications-planning-calendar/planning-calendar-dnd";
import { saveCalendarLayoutAction } from "@/lib/communications-calendar/calendar-layout-actions";
import {
  defaultCalendarLayout,
  resolveCalendarLayerColors,
  setCalendarLayerColor,
  type CalendarLayout,
} from "@/lib/communications-calendar/calendar-layout";
import {
  filterItemsByLayers,
  getDefaultActiveLayers,
  isCampaignEventItem,
  type CalendarLayerId,
} from "@/lib/communications-calendar/unified-calendar-layers";
import { filterCalendarItemsBySearch } from "@/lib/communications-calendar/calendar-home-search";
import {
  enrichItemFlags,
  getInitialCalendarFocus,
  getUpcomingItems,
} from "@/lib/communications-calendar/planning-utils";
import {
  addMonths,
  addWeeks,
  formatMonthLabel,
  formatWeekRange,
  getMonthGridDates,
  getWeekDates,
} from "@/lib/communications-calendar/workload";
import { getTodayDateString, normalizeDateOnly } from "@/lib/utils/dates";
import type {
  PlanningCalendarData,
  PlanningCalendarItem,
  PlanningCalendarView,
} from "@/types/communications-calendar";

interface UnifiedCalendarShellProps {
  data: PlanningCalendarData;
  initialLayout?: CalendarLayout;
  initialView?: PlanningCalendarView;
  importSections?: {
    google: ReactNode;
    subscribe: ReactNode;
    upload: ReactNode;
  };
  reviewPanel?: ReactNode;
}

export function UnifiedCalendarShell({
  data,
  initialLayout,
  initialView = "month",
  importSections,
  reviewPanel,
}: UnifiedCalendarShellProps) {
  const router = useRouter();
  const today = getTodayDateString();
  const initialFocus = getInitialCalendarFocus(data.items, today);

  const [view, setView] = useState<PlanningCalendarView>(initialView);
  const [year, setYear] = useState(initialFocus.year);
  const [month, setMonth] = useState(initialFocus.month);
  const [weekAnchor, setWeekAnchor] = useState(initialFocus.weekAnchor);
  const [activeLayers, setActiveLayers] = useState<Set<CalendarLayerId>>(
    getDefaultActiveLayers,
  );
  const [layout, setLayout] = useState(
    () => initialLayout ?? defaultCalendarLayout(),
  );
  const layoutRef = useRef(layout);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  const handleViewChange = useCallback((next: PlanningCalendarView) => {
    setView(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    if (!initialLayout) return;
    setLayout(initialLayout);
    layoutRef.current = initialLayout;
  }, [initialLayout]);

  const layerColors = useMemo(
    () => resolveCalendarLayerColors(layout),
    [layout],
  );

  function handleLayerColorChange(
    layerId: CalendarLayerId,
    color: string | null,
  ) {
    const previous = layoutRef.current;
    const next = setCalendarLayerColor(previous, layerId, color);
    layoutRef.current = next;
    setLayout(next);
    setLayoutError(null);
    void (async () => {
      const result = await saveCalendarLayoutAction(next);
      if (!result.success) {
        layoutRef.current = previous;
        setLayout(previous);
        setLayoutError(result.error ?? "Could not save calendar colors.");
      }
    })();
  }
  const [selectedItem, setSelectedItem] = useState<PlanningCalendarItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [localItems, setLocalItems] = useState(data.items);
  const itemsSnapshotRef = useRef(data.items);
  const hasAutoFocused = useRef(false);

  useEffect(() => {
    setLocalItems(data.items);
    itemsSnapshotRef.current = data.items;
  }, [data.items]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const param = new URLSearchParams(window.location.search).get("tab");
    if (param) return;
    if (window.matchMedia("(max-width: 768px)").matches) {
      handleViewChange("agenda");
    }
  }, [handleViewChange]);

  useEffect(() => {
    if (data.items.length === 0 || hasAutoFocused.current) {
      return;
    }

    hasAutoFocused.current = true;
    const focus = getInitialCalendarFocus(data.items, today);
    setYear(focus.year);
    setMonth(focus.month);
    setWeekAnchor(focus.weekAnchor);
  }, [data.items, today]);

  const enrichedItems = useMemo(
    () => localItems.map((item) => enrichItemFlags(item, today)),
    [localItems, today],
  );

  const layerFilteredItems = useMemo(
    () => filterItemsByLayers(enrichedItems, activeLayers),
    [enrichedItems, activeLayers],
  );

  const filteredItems = useMemo(
    () => filterCalendarItemsBySearch(layerFilteredItems, searchQuery),
    [layerFilteredItems, searchQuery],
  );

  const monthGridDates = useMemo(
    () => (view === "month" ? getMonthGridDates(year, month) : []),
    [view, year, month],
  );

  const itemsInCurrentPeriod = useMemo(() => {
    if (view === "month") {
      const dateSet = new Set(monthGridDates);
      return filteredItems.filter((item) =>
        dateSet.has(normalizeDateOnly(item.scheduledDate)),
      );
    }

    if (view === "week" || view === "best-times") {
      const dateSet = new Set(getWeekDates(weekAnchor));
      return filteredItems.filter((item) =>
        dateSet.has(normalizeDateOnly(item.scheduledDate)),
      );
    }

    return filteredItems;
  }, [view, monthGridDates, weekAnchor, filteredItems]);

  const showEmptyPeriodHint =
    !searchQuery.trim() &&
    (view === "month" || view === "week" || view === "best-times") &&
    layerFilteredItems.length > 0 &&
    itemsInCurrentPeriod.length === 0;

  const showSearchNoMatches =
    searchQuery.trim() &&
    (view === "month" || view === "week" || view === "best-times") &&
    filteredItems.length === 0;

  const showSearchNoMatchesInPeriod =
    searchQuery.trim() &&
    filteredItems.length > 0 &&
    itemsInCurrentPeriod.length === 0 &&
    (view === "month" || view === "week" || view === "best-times");

  const upcomingItems = useMemo(
    () =>
      getUpcomingItems(
        enrichedItems.filter(isCampaignEventItem),
        today,
        7,
      ),
    [enrichedItems, today],
  );

  function goToFirstEvent() {
    const focus = getInitialCalendarFocus(filteredItems, today);
    setYear(focus.year);
    setMonth(focus.month);
    setWeekAnchor(focus.weekAnchor);
  }

  const periodLabel = useMemo(() => {
    if (view === "import-list") {
      return data.importListFilename
        ? `Imported — ${data.importListFilename}`
        : "Imported events";
    }
    if (view === "month") return formatMonthLabel(year, month);
    if (view === "week" || view === "best-times") {
      return formatWeekRange(getWeekDates(weekAnchor));
    }
    return "All events";
  }, [view, year, month, weekAnchor, data.importListFilename]);

  function goToday() {
    const now = new Date(`${getTodayDateString()}T12:00:00`);
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setWeekAnchor(getTodayDateString());
  }

  function goPrevious() {
    if (view === "month") {
      const next = addMonths(year, month, -1);
      setYear(next.year);
      setMonth(next.month);
      return;
    }
    if (view === "week" || view === "best-times") {
      setWeekAnchor(addWeeks(weekAnchor, -1));
    }
  }

  function goNext() {
    if (view === "month") {
      const next = addMonths(year, month, 1);
      setYear(next.year);
      setMonth(next.month);
      return;
    }
    if (view === "week" || view === "best-times") {
      setWeekAnchor(addWeeks(weekAnchor, 1));
    }
  }

  const handleOptimisticReschedule = useCallback(
    (payload: PlanningDragPayload, date: string, hour?: number) => {
      const timezone = data.postingHeatmap?.timezone ?? "America/Chicago";
      setLocalItems((current) => {
        itemsSnapshotRef.current = current;
        return current.map((item) =>
          matchesDragPayload(item, payload)
            ? applyOptimisticReschedule(item, date, hour, timezone)
            : item,
        );
      });
    },
    [data.postingHeatmap?.timezone],
  );

  const handleRescheduleFailed = useCallback((_payload: PlanningDragPayload) => {
    setLocalItems(itemsSnapshotRef.current);
  }, []);

  const handleRescheduled = useCallback(() => {
    // Background refresh — chip already moved optimistically.
    router.refresh();
  }, [router]);

  const selectedEnriched =
    selectedItem &&
    enrichedItems.find((entry) => entry.id === selectedItem.id);

  const showHeatmap = view === "best-times";

  return (
    <CalendarLayerColorsProvider colors={layerColors}>
      <div className="studio-page relative mx-auto max-w-[1600px] space-y-5 pb-12 before:pointer-events-none before:absolute before:top-0 before:left-[-2rem] before:h-60 before:w-60 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:top-10 after:right-0 after:h-52 after:w-52 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']">
        {layoutError ? (
          <p className="text-sm text-cos-error" role="alert">
            {layoutError}
          </p>
        ) : null}
        <UnifiedCalendarControlPanel
          view={view}
          periodLabel={periodLabel}
          activeLayers={activeLayers}
          layerColors={layerColors}
          layerColorOverrides={layout.colors ?? {}}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onViewChange={handleViewChange}
          onPrevious={goPrevious}
          onNext={goNext}
          onToday={goToday}
          onLayersChange={setActiveLayers}
          onLayerColorChange={handleLayerColorChange}
          postingHeatmap={data.postingHeatmap}
          showPostingHeatmap={showHeatmap && data.postingHeatmap != null}
        />

        {showSearchNoMatches ? (
          <p className="text-sm text-cos-muted">
            No matches for &ldquo;{searchQuery.trim()}&rdquo;. Try event names,
            posting times, or dates.
          </p>
        ) : null}

        {showSearchNoMatchesInPeriod ? (
          <p className="text-sm text-cos-muted">
            No matches in {periodLabel}. Browse other weeks or clear search.
          </p>
        ) : null}

        {showEmptyPeriodHint && (
          <div className="rounded-[22px] border border-cos-border bg-[rgba(255,252,247,0.65)] px-5 py-4 text-sm text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
            <p className="font-display text-lg font-semibold">
              No events in {periodLabel}
            </p>
            <p className="mt-1 text-cos-muted">
              Your imported dates are in other months. Use the arrows to browse,
              switch to Agenda to see everything, or jump to the first event
              month.
            </p>
            <button
              type="button"
              onClick={goToFirstEvent}
              className="mt-3 rounded-full bg-cos-text px-4 py-2 text-[13px] font-bold text-cos-card"
            >
              Go to first event
            </button>
          </div>
        )}

        {view === "month" ? (
          <>
            <PlanningCalendarMonthView
              items={filteredItems}
              year={year}
              month={month}
              onSelectItem={setSelectedItem}
              onOptimisticReschedule={handleOptimisticReschedule}
              onRescheduleFailed={handleRescheduleFailed}
              onRescheduled={handleRescheduled}
            />
            <CalendarComingUpEase
              upcomingItems={upcomingItems}
              onSelectUpcomingItem={setSelectedItem}
            />
          </>
        ) : null}
        {view === "week" || view === "best-times" ? (
          <PlanningCalendarWeekView
            items={filteredItems}
            anchorDate={weekAnchor}
            onSelectItem={setSelectedItem}
            onOptimisticReschedule={handleOptimisticReschedule}
            onRescheduleFailed={handleRescheduleFailed}
            onRescheduled={handleRescheduled}
            postingHeatmap={data.postingHeatmap}
            showPostingHeatmap={showHeatmap}
          />
        ) : null}
        {view === "agenda" ? (
          <PlanningCalendarAgendaView
            items={filteredItems}
            onSelectItem={setSelectedItem}
          />
        ) : null}

        {view === "import-list" ? (
          <CalendarImportPlanList
            events={data.importedEvents}
            filename={data.importListFilename}
            playbookOptions={data.importListPlaybooks}
            onNavigateView={handleViewChange}
          />
        ) : null}

        {view === "import" && importSections ? (
          <CalendarImportEasePanel
            embedded
            googleSection={importSections.google}
            subscribeSection={importSections.subscribe}
            uploadSection={importSections.upload}
            onContinueToReview={() => handleViewChange("review")}
          />
        ) : null}

        {view === "review" && reviewPanel
          ? isValidElement(reviewPanel)
            ? cloneElement(
                reviewPanel as ReactElement<{ onGoToImport?: () => void }>,
                { onGoToImport: () => handleViewChange("import") },
              )
            : reviewPanel
          : null}

        {selectedEnriched ? (
          <>
            <button
              type="button"
              aria-label="Close detail panel overlay"
              className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-[1px]"
              onClick={() => setSelectedItem(null)}
            />
            <PlanningCalendarDetailPanel
              item={selectedEnriched}
              onClose={() => setSelectedItem(null)}
            />
          </>
        ) : null}
      </div>
    </CalendarLayerColorsProvider>
  );
}
