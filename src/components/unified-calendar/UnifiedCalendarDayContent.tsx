"use client";

import { PlanningCalendarItemChip } from "@/components/communications-planning-calendar/PlanningCalendarItemChip";
import {
  groupItemsByDaySection,
  type CalendarDaySection,
} from "@/lib/communications-calendar/unified-calendar-layers";
import { preferSearchMatches } from "@/lib/communications-calendar/calendar-home-search";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

const SECTION_LABELS: Record<CalendarDaySection, string> = {
  events: "Events",
  communications: "Posts",
};

interface UnifiedCalendarDayContentProps {
  items: (PlanningCalendarItem & { isOverdue: boolean; isToday: boolean })[];
  onSelectItem: (item: PlanningCalendarItem) => void;
  onDragError?: (message: string) => void;
  compact?: boolean;
  itemLimit?: number;
  /** Mockup-faithful flat chip list (no Events/Posts section labels). */
  ease?: boolean;
  highlightedItemIds?: ReadonlySet<string> | null;
}

export function UnifiedCalendarDayContent({
  items,
  onSelectItem,
  onDragError,
  compact = false,
  itemLimit = 6,
  ease = false,
  highlightedItemIds = null,
}: UnifiedCalendarDayContentProps) {
  if (ease || compact) {
    const ordered = preferSearchMatches(items, highlightedItemIds);
    const visible = ordered.slice(0, itemLimit);
    const hidden = items.length - visible.length;

    if (visible.length === 0) {
      return null;
    }

    return (
      <div>
        {visible.map((item) => (
          <PlanningCalendarItemChip
            key={item.id}
            item={item}
            compact
            highlighted={Boolean(highlightedItemIds?.has(item.id))}
            onSelect={onSelectItem}
            onDragError={onDragError}
          />
        ))}
        {hidden > 0 ? (
          <p className="px-1 text-[11px] font-bold text-cos-muted">
            +{hidden} more
          </p>
        ) : null}
      </div>
    );
  }

  const groups = groupItemsByDaySection(items);
  const sections = (["events", "communications"] as const).filter(
    (section) => groups[section].length > 0,
  );

  if (sections.length === 0) {
    return (
      <p className="py-4 text-center text-xs leading-relaxed text-cos-muted/70">
        Nothing scheduled
      </p>
    );
  }

  let shown = 0;

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const sectionItems = groups[section];
        const remaining = itemLimit - shown;
        if (remaining <= 0) return null;

        const visible = sectionItems.slice(0, remaining);
        shown += visible.length;

        return (
          <div key={section}>
            <p className="mb-1 text-xs font-medium text-cos-muted">
              {SECTION_LABELS[section]}
            </p>
            <div className="space-y-1">
              {visible.map((item) => (
                <PlanningCalendarItemChip
                  key={item.id}
                  item={item}
                  highlighted={Boolean(highlightedItemIds?.has(item.id))}
                  onSelect={onSelectItem}
                  onDragError={onDragError}
                />
              ))}
            </div>
          </div>
        );
      })}

      {items.length > shown && (
        <p className="px-1 text-[10px] font-medium text-cos-primary">
          +{items.length - shown} more
        </p>
      )}
    </div>
  );
}
