import Link from "next/link";
import type { TodayAttentionCounts } from "@/types/today";

interface TodayAttentionLinksProps {
  counts: TodayAttentionCounts;
}

/**
 * Quiet count links under Up Next — not cards. Hide segments when zero.
 */
export function TodayAttentionLinks({ counts }: TodayAttentionLinksProps) {
  const links: Array<{ href: string; label: string }> = [];

  if (counts.reviewCount > 0) {
    links.push({
      href: "/approvals",
      label:
        counts.reviewCount === 1
          ? "1 to review"
          : `${counts.reviewCount} to review`,
    });
  }

  if (counts.volunteerCount > 0) {
    links.push({
      href: "/volunteers",
      label:
        counts.volunteerCount === 1
          ? "1 needs volunteers"
          : `${counts.volunteerCount} need volunteers`,
    });
  }

  if (counts.tasksThisWeekCount > 0) {
    links.push({
      href: "/tasks?tab=my_tasks&view=this_week",
      label:
        counts.tasksThisWeekCount === 1
          ? "1 task this week"
          : `${counts.tasksThisWeekCount} tasks this week`,
    });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Needs attention" className="pt-1">
      <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-cos-text/80">
        {links.map((link, index) => (
          <li key={link.href} className="flex items-center gap-x-2">
            {index > 0 && (
              <span aria-hidden className="text-cos-muted">
                ·
              </span>
            )}
            <Link
              href={link.href}
              className="underline decoration-cos-border underline-offset-4 transition-colors hover:text-cos-primary hover:decoration-cos-primary/40"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
