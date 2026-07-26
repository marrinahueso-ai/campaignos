"use client";

import {
  EaseBox,
  EaseSectionLabel,
} from "@/components/events-phase3/EventDetailEaseUi";

export type EventDetailActivityItem = {
  id: string;
  title: string;
  detail: string | null;
  at: string;
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function EventDetailActivityEasePanel({
  items,
}: {
  items: EventDetailActivityItem[];
}) {
  return (
    <section>
      <EaseSectionLabel>What&apos;s happened</EaseSectionLabel>
      <EaseBox>
        {items.length === 0 ? (
          <p className="text-sm text-cos-muted">
            No activity has been recorded for this event yet.
          </p>
        ) : (
          <div className="flex flex-col">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[16px_1fr] gap-3 border-b border-cos-border py-3 last:border-0"
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#6b8171]"
                  aria-hidden
                />
                <div>
                  <strong className="mb-0.5 block text-sm font-bold text-cos-text">
                    {item.title}
                  </strong>
                  <p className="m-0 text-xs text-cos-muted">
                    {[item.detail, formatWhen(item.at)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </EaseBox>
    </section>
  );
}
