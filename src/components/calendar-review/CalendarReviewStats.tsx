import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Copy,
  GraduationCap,
  RefreshCw,
  Sun,
  Users,
} from "lucide-react";
import { CalendarReviewStatCard } from "@/components/calendar-review/CalendarReviewStatCard";
import {
  statKeyToFilter,
  type CalendarReviewFilter,
  type CalendarReviewStatKey,
} from "@/lib/calendar-import/review-filters";
import type { CalendarReviewStats } from "@/types/calendar-review";

interface CalendarReviewStatsProps {
  stats: CalendarReviewStats;
  activeFilter: CalendarReviewFilter;
  onFilterChange: (key: CalendarReviewStatKey) => void;
}

const statItems: {
  key: CalendarReviewStatKey;
  label: string;
  icon: typeof CalendarDays;
  accentClassName: string;
}[] = [
  {
    key: "totalEventsFound" as const,
    label: "Total Events Found",
    icon: CalendarDays,
    accentClassName: "bg-cos-accent-soft text-cos-accent",
  },
  {
    key: "ptoEvents" as const,
    label: "PTO Events",
    icon: Users,
    accentClassName: "bg-cos-success-bg text-cos-success-text",
  },
  {
    key: "schoolEvents" as const,
    label: "School Events",
    icon: GraduationCap,
    accentClassName: "bg-cos-bg-alt text-cos-text",
  },
  {
    key: "holidays" as const,
    label: "Holidays",
    icon: Sun,
    accentClassName: "bg-cos-warning text-cos-warning-text",
  },
  {
    key: "earlyReleaseDays" as const,
    label: "Early Release Days",
    icon: Clock,
    accentClassName: "bg-cos-accent-soft text-cos-text",
  },
  {
    key: "conflictsFound" as const,
    label: "Conflicts Found",
    icon: AlertTriangle,
    accentClassName: "bg-cos-error-bg text-cos-error-text",
  },
  {
    key: "duplicatesFound" as const,
    label: "Duplicates",
    icon: Copy,
    accentClassName: "bg-slate-100 text-slate-700",
  },
  {
    key: "updatesFound" as const,
    label: "Updates",
    icon: RefreshCw,
    accentClassName: "bg-amber-50 text-amber-800",
  },
];

export function CalendarReviewStats({
  stats,
  activeFilter,
  onFilterChange,
}: CalendarReviewStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {statItems.map(({ key, label, icon, accentClassName }) => (
        <CalendarReviewStatCard
          key={key}
          label={label}
          value={stats[key]}
          icon={icon}
          accentClassName={accentClassName}
          isActive={activeFilter === statKeyToFilter(key)}
          onClick={() => onFilterChange(key)}
        />
      ))}
    </div>
  );
}
