import Link from "next/link";
import type {
  TodayActionItem,
  TodayWaitingOnOthersItem,
  TodayWhatsNext,
} from "@/types/today";

interface TodayCompanionSectionProps {
  whatsNext: TodayWhatsNext;
  waitingOnMe: TodayActionItem[];
  waitingOnOthers: TodayWaitingOnOthersItem[];
}

export function TodayCompanionSection({
  whatsNext,
  waitingOnMe,
  waitingOnOthers,
}: TodayCompanionSectionProps) {
  const rest = dedupeWaitingItems(waitingOnMe, whatsNext);
  const hasRest = rest.length > 0;
  const hasTeam = waitingOnOthers.length > 0;

  if (!hasRest && !hasTeam) {
    return null;
  }

  return (
    <section className="cos-card">
      {hasRest && (
        <div className="space-y-1">
          <p className="text-sm leading-relaxed text-cos-muted">{companionIntro(rest.length)}</p>
          <ul className="mt-4 divide-y divide-cos-border/70">
            {rest.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="group flex items-start justify-between gap-4 py-3.5 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium text-cos-text transition-colors group-hover:text-cos-primary">
                      {actionLabel(item)}
                    </p>
                    <p className="text-sm text-cos-muted">{item.eventTitle}</p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-xs text-cos-muted">
                    {formatRelativeDue(item.dueDate, item.isOverdue)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasTeam && (
        <div
          className={
            hasRest ? "mt-5 border-t border-cos-border/70 pt-5" : "space-y-1"
          }
        >
          <p className="text-sm leading-relaxed text-cos-muted">{teamIntro(waitingOnOthers)}</p>
          <ul className={hasRest ? "mt-3 space-y-2.5" : "mt-4 space-y-2.5"}>
            {waitingOnOthers.slice(0, 4).map((item) => {
              const parsed = parseTeamItem(item);
              return (
                <li key={item.id} className="text-sm">
                  <span className="text-cos-muted">{parsed.who}</span>
                  <span className="text-cos-muted"> · </span>
                  <span className="text-cos-text">{parsed.action}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function companionIntro(count: number): string {
  if (count === 1) {
    return "When you have a moment — one more thing worth a look.";
  }
  if (count === 2) {
    return "When you have a moment — a couple more things on your list.";
  }
  return "When you have a moment — these are next in line after your focus above.";
}

function teamIntro(items: TodayWaitingOnOthersItem[]): string {
  if (items.length === 1) {
    return "Your team has something in review — no action needed from you right now.";
  }
  return `${items.length} items are with your team — you're clear until they circle back.`;
}

function dedupeWaitingItems(
  items: TodayActionItem[],
  whatsNext: TodayWhatsNext,
): TodayActionItem[] {
  if (whatsNext.kind === "caught_up" || !whatsNext.eventId) {
    return items;
  }

  return items.filter((item) => {
    if (item.eventId !== whatsNext.eventId) {
      return true;
    }
    if (whatsNext.href && item.href === whatsNext.href) {
      return false;
    }
    const nextAction = whatsNext.title.replace(/\s+for\s+.+$/i, "").trim();
    const itemAction = item.title.replace(/\s+for\s+.+$/i, "").trim();
    return nextAction.toLowerCase() !== itemAction.toLowerCase();
  });
}

function actionLabel(item: TodayActionItem): string {
  const forIndex = item.title.lastIndexOf(" for ");
  if (forIndex > 0) {
    return item.title.slice(0, forIndex);
  }
  return item.title;
}

function parseTeamItem(item: TodayWaitingOnOthersItem): { who: string; action: string } {
  const approvalMatch = item.title.match(/^Needs board approval — (.+)$/);
  if (approvalMatch) {
    return { who: "Board", action: `Reviewing ${approvalMatch[1]}` };
  }

  const waitingMatch = item.title.match(/^Waiting on approval — (.+)$/);
  if (waitingMatch) {
    return { who: "Your team", action: waitingMatch[1]! };
  }

  return { who: item.eventTitle, action: item.title };
}

function formatRelativeDue(dueDate: string, isOverdue: boolean): string {
  if (isOverdue) return "Whenever you can";

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
    return target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return dueDate;
}
