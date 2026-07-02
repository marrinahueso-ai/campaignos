import type {
  CalendarEventCategory,
  CalendarEventReviewStatus,
} from "@/types/calendar-review";
import { Badge } from "@/components/ui/Badge";

const statusConfig: Record<
  CalendarEventReviewStatus,
  { label: string; variant: "default" | "success" | "warning" | "info" }
> = {
  ready: { label: "Ready", variant: "success" },
  needs_review: { label: "Needs Review", variant: "warning" },
  conflict: { label: "Conflict", variant: "default" },
};

interface CalendarReviewStatusBadgeProps {
  status: CalendarEventReviewStatus;
}

export function CalendarReviewStatusBadge({
  status,
}: CalendarReviewStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={
        status === "conflict"
          ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-100"
          : undefined
      }
    >
      {config.label}
    </Badge>
  );
}

const categoryStyles: Record<CalendarEventCategory, string> = {
  "PTO Event": "bg-cos-accent-soft text-cos-text ring-cos-border",
  "School Event": "bg-cos-bg-alt text-cos-text ring-cos-border",
  Holiday: "bg-cos-warning text-cos-warning-text ring-cos-border",
  "Early Release": "bg-cos-accent-soft text-cos-text ring-cos-border",
};

interface CalendarReviewCategoryBadgeProps {
  category: CalendarEventCategory;
}

export function CalendarReviewCategoryBadge({
  category,
}: CalendarReviewCategoryBadgeProps) {
  return (
    <Badge className={`ring-1 ring-inset ${categoryStyles[category]}`}>
      {category}
    </Badge>
  );
}
