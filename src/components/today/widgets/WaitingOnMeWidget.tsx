import Link from "next/link";
import { Check, FileText, MessageSquare, UserRound } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import type { TodayActionItem } from "@/types/today";

interface WaitingOnMeWidgetProps {
  items: TodayActionItem[];
}

export function WaitingOnMeWidget({ items }: WaitingOnMeWidgetProps) {
  const visible = items.slice(0, 3);

  return (
    <DashboardWidgetCard icon={UserRound} title="Waiting on me">
      {visible.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-cos-muted">
          <Check className="h-4 w-4 text-cos-success" aria-hidden />
          You&apos;re all caught up.
        </p>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="space-y-3">
            {visible.map((item) => {
              const Icon = iconForAction(item.title);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-3 rounded-xl transition-colors hover:bg-cos-card/70"
                  >
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cos-card text-cos-muted ring-1 ring-black/[0.04]">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-cos-text">
                        {shortActionLabel(item.title)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-cos-muted">
                        {item.eventTitle}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-cos-muted">
                      {formatShortDate(item.dueDate)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {items.length > 0 ? (
            <Link
              href={items[0]!.href}
              className="mt-4 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
            >
              View all ({items.length}) →
            </Link>
          ) : null}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

function shortActionLabel(title: string): string {
  const forIndex = title.lastIndexOf(" for ");
  if (forIndex > 0) {
    return title.slice(0, forIndex);
  }
  return title;
}

function iconForAction(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("reply") || lower.includes("message")) {
    return MessageSquare;
  }
  return FileText;
}

function formatShortDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
