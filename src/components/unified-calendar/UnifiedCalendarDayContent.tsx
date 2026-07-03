"use client";

import { PlanningCalendarItemChip } from "@/components/communications-planning-calendar/PlanningCalendarItemChip";
import {
  groupItemsByDaySection,
  type CalendarDaySection,
} from "@/lib/communications-calendar/unified-calendar-layers";
import { cn } from "@/lib/utils/cn";
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
}

export function UnifiedCalendarDayContent({
  items,
  onSelectItem,
  onDragError,
  compact = false,
  itemLimit = 6,
}: UnifiedCalendarDayContentProps) {
  const groups = groupItemsByDaySection(items);
  const sections = (["events", "communications"] as const).filter(
    (section) => groups[section].length > 0,
  );

  if (sections.length === 0) {
    return compact ? null : (
      <p className="py-4 text-center text-xs leading-relaxed text-cos-muted/70">
        Nothing scheduled
      </p>
    );
  }

  let shown = 0;

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      {sections.map((section) => {
        const sectionItems = groups[section];
        const remaining = itemLimit - shown;
        if (remaining <= 0) return null;

        const visible = sectionItems.slice(0, remaining);
        shown += visible.length;

        return (
          <div key={section}>
            <p
              className={cn(
                "mb-1 font-medium text-cos-muted",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              {SECTION_LABELS[section]}
            </p>
            <div className="space-y-1">
              {visible.map((item) => (
                <PlanningCalendarItemChip
                  key={item.id}
                  item={item}
                  compact={compact}
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
