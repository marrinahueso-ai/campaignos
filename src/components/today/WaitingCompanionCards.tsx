import Link from "next/link";
import { Check } from "lucide-react";
import type { TodayActionItem, TodayWaitingOnOthersItem } from "@/types/today";

interface WaitingOnYouSectionProps {
  items: TodayActionItem[];
}

interface WaitingOnOthersSectionProps {
  items: TodayWaitingOnOthersItem[];
}

export function WaitingOnYouSection({ items }: WaitingOnYouSectionProps) {
  return (
    <section className="space-y-5">
      <h2 className="cos-section-title">Waiting on you</h2>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-base text-cos-muted">
          <Check className="h-4 w-4 text-cos-success" aria-hidden />
          You&apos;re all caught up.
        </p>
      ) : (
        <ul className="space-y-6">
          {items.slice(0, 5).map((item) => (
            <li key={item.id} className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cos-border" aria-hidden />
              <div className="min-w-0 space-y-1">
                <Link
                  href={item.href}
                  className="text-base font-medium text-cos-text transition-colors duration-200 hover:text-cos-primary"
                >
                  {shortActionLabel(item.title)}
                </Link>
                <p className="text-sm text-cos-muted">
                  {formatRelativeDue(item.dueDate, item.isOverdue)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function WaitingOnOthersSection({ items }: WaitingOnOthersSectionProps) {
  return (
    <section className="space-y-5">
      <h2 className="cos-section-title">Waiting on others</h2>
      {items.length === 0 ? (
        <p className="text-base text-cos-muted">
          Nothing is waiting on anyone else right now.
        </p>
      ) : (
        <ul className="space-y-6">
          {items.slice(0, 5).map((item) => {
            const parsed = parseWaitingOnOthers(item);
            return (
              <li key={item.id} className="space-y-1">
                <p className="text-sm text-cos-muted">{parsed.who}</p>
                <p className="text-base text-cos-text">{parsed.action}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function shortActionLabel(title: string): string {
  const forIndex = title.lastIndexOf(" for ");
  if (forIndex > 0) {
    return title.slice(0, forIndex);
  }
  return title;
}

function parseWaitingOnOthers(item: TodayWaitingOnOthersItem): {
  who: string;
  action: string;
} {
  const approvalMatch = item.title.match(/^Needs board approval — (.+)$/);
  if (approvalMatch) {
    return {
      who: "Board",
      action: `Reviewing ${approvalMatch[1]}`,
    };
  }

  return {
    who: item.eventTitle,
    action: item.title,
  };
}

function formatRelativeDue(dueDate: string, isOverdue: boolean): string {
  if (isOverdue) return "Needs your attention";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return dueDate;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dueDate}T12:00:00`);
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff <= 7) {
    return target.toLocaleDateString("en-US", { weekday: "long" });
  }
  if (diff > 7) {
    return target.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return dueDate;
}
