"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { FlyerStatusBadge } from "@/components/flyers/FlyerStatusBadge";
import { createFlyer, deleteFlyer } from "@/lib/flyers/actions";
import {
  FLYER_LIBRARY_FILTERS,
  flyerLibraryHref,
  flyerMatchesLibraryFilter,
  type FlyerLibraryFilter,
} from "@/lib/flyers/library-filters";
import type { Flyer, FlyerStatus } from "@/lib/flyers/types";
import { formatRelativeTime } from "@/lib/approvals-scheduling/status";
import { cn } from "@/lib/utils/cn";

export type FlyerLibraryEventInfo = {
  id: string;
  title: string;
  date: string | null;
};

type Props = {
  flyers: Flyer[];
  events: FlyerLibraryEventInfo[];
  filter: FlyerLibraryFilter;
  canEdit: boolean;
};

const DELETABLE = new Set<FlyerStatus>([
  "draft",
  "changes_requested",
  "needs_approval",
]);

function formatEventDate(date: string | null): string | null {
  if (!date?.trim()) return null;
  try {
    return new Date(`${date.trim()}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

function cardCta(status: FlyerStatus): string {
  switch (status) {
    case "draft":
      return "Edit Draft";
    case "changes_requested":
      return "View Flyer";
    case "needs_approval":
      return "View status";
    case "approved":
      return "Open";
    default:
      return "Open";
  }
}

export function FlyerLibraryShell({
  flyers,
  events,
  filter,
  canEdit,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<"all" | "none" | string>("all");
  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const eventsById = useMemo(() => {
    const map = new Map<string, FlyerLibraryEventInfo>();
    for (const event of events) map.set(event.id, event);
    return map;
  }, [events]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flyers.filter((flyer) => {
      if (!flyerMatchesLibraryFilter(flyer.status, filter)) return false;
      if (eventFilter === "none" && flyer.eventId) return false;
      if (
        eventFilter !== "all" &&
        eventFilter !== "none" &&
        flyer.eventId !== eventFilter
      ) {
        return false;
      }
      if (!q) return true;
      const event = flyer.eventId ? eventsById.get(flyer.eventId) : null;
      const haystack = `${flyer.title} ${event?.title ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [flyers, filter, eventFilter, search, eventsById]);

  function setFilter(next: FlyerLibraryFilter) {
    const params = new URLSearchParams();
    if (next !== "all") params.set("filter", next);
    const qs = params.toString();
    router.replace(qs ? `/flyers?${qs}` : "/flyers");
  }

  async function handleNewFlyer() {
    if (!canEdit || creating) return;
    setError(null);
    setCreating(true);
    const result = await createFlyer(
      eventFilter !== "all" && eventFilter !== "none"
        ? { eventId: eventFilter }
        : undefined,
    );
    setCreating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/create-with-ai/flyer?flyerId=${encodeURIComponent(result.flyerId)}`);
  }

  function handleDelete(flyer: Flyer) {
    const label = flyer.title?.trim() || "this flyer";
    if (
      !window.confirm(
        `Delete “${label}”? This permanently removes the draft and can’t be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    setPendingId(flyer.id);
    startTransition(async () => {
      const result = await deleteFlyer({ flyerId: flyer.id });
      setPendingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="studio-page space-y-10 pb-16">
      <section className="relative border-b border-cos-border pb-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(44,40,37,0.12)_1px,transparent_0)] [background-size:20px_20px]"
        />
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold tracking-[0.2em] text-cos-muted uppercase">
              Event Materials
            </p>
            <h1 className="font-display text-[clamp(2.5rem,5vw,3.75rem)] font-semibold leading-[0.98] tracking-[-0.03em] text-cos-text">
              Flyers
            </h1>
          </div>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 left-4 h-3.5 w-3.5 -translate-y-1/2 text-cos-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search flyers..."
                className="w-full rounded-full border border-cos-border bg-cos-bg py-2.5 pr-4 pl-10 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-primary focus:outline-none"
              />
            </div>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute top-1/2 left-4 h-3.5 w-3.5 -translate-y-1/2 text-cos-muted" />
              <select
                value={eventFilter}
                onChange={(e) =>
                  setEventFilter(e.target.value as typeof eventFilter)
                }
                className="w-full appearance-none rounded-full border border-cos-border bg-cos-bg py-2.5 pr-10 pl-10 text-sm font-medium text-cos-text focus:border-cos-primary focus:outline-none sm:w-auto"
              >
                <option value="all">All Events</option>
                <option value="none">No event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-3.5 w-3.5 -translate-y-1/2 text-cos-muted" />
            </div>
            {canEdit ? (
              <button
                type="button"
                disabled={creating}
                onClick={() => void handleNewFlyer()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-cos-primary px-5 py-2.5 text-sm font-bold text-[#f6f2eb] transition hover:bg-cos-primary-hover disabled:opacity-60"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                {creating ? "Creating…" : "New Flyer"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <div className="relative inline-flex items-center gap-1 rounded-full border border-cos-border bg-cos-bg p-1.5">
          {FLYER_LIBRARY_FILTERS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "relative z-10 rounded-full px-5 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors",
                  active
                    ? "bg-white text-cos-text shadow-sm"
                    : "text-cos-muted hover:text-cos-text",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {error ? (
        <p className="text-sm text-[#a65a3a]" role="alert">
          {error}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-cos-border bg-cos-card/60 px-6 py-20 text-center">
          <p className="font-display text-2xl text-cos-text">No flyers yet</p>
          <p className="mt-2 max-w-sm text-sm text-cos-muted">
            Create a print flyer for hallways, backpacks, and event nights.
          </p>
          {canEdit ? (
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleNewFlyer()}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-cos-primary px-5 py-2.5 text-sm font-bold text-[#f6f2eb] transition hover:bg-cos-primary-hover disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              New Flyer
            </button>
          ) : null}
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((flyer) => {
            const href = flyerLibraryHref(flyer);
            const event = flyer.eventId
              ? eventsById.get(flyer.eventId)
              : null;
            const eventDate = formatEventDate(event?.date ?? null);
            const eventLine = event
              ? eventDate
                ? `${event.title} · ${eventDate}`
                : event.title
              : "No event";
            const relative = formatRelativeTime(flyer.updatedAt);
            const meta =
              flyer.status === "needs_approval" && flyer.submittedAt
                ? `Submitted ${formatRelativeTime(flyer.submittedAt)}`
                : `Last edited ${relative}`;

            return (
              <article key={flyer.id} className="group">
                <Link
                  href={href}
                  className="block"
                  prefetch={false}
                >
                  <div
                    className={cn(
                      "relative mb-5 aspect-[8.5/11] overflow-hidden rounded-xl border border-cos-border bg-white shadow-[0_8px_30px_-12px_rgba(44,40,37,0.12)]",
                      flyer.status === "draft" && "grayscale-[0.35]",
                    )}
                  >
                    {flyer.previewImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={flyer.previewImageUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-cos-bg text-sm text-cos-muted">
                        No preview yet
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(44,40,37,0.4)] opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="translate-y-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-cos-text shadow-lg transition-transform group-hover:translate-y-0">
                        {cardCta(flyer.status)}
                      </span>
                    </div>
                    <div className="absolute top-4 left-4">
                      <FlyerStatusBadge status={flyer.status} />
                    </div>
                  </div>
                </Link>
                <div className="px-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <Link href={href} prefetch={false}>
                      <h3 className="font-display text-xl font-bold text-cos-text">
                        {flyer.title?.trim() || "Untitled flyer"}
                      </h3>
                    </Link>
                    {canEdit && DELETABLE.has(flyer.status) ? (
                      <button
                        type="button"
                        disabled={isPending && pendingId === flyer.id}
                        onClick={() => handleDelete(flyer)}
                        className="rounded-full p-1.5 text-cos-muted transition hover:bg-cos-bg hover:text-cos-text disabled:opacity-50"
                        aria-label="Delete flyer"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    ) : null}
                  </div>
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarDays className="h-2.5 w-2.5 text-[#0d7e5e]" />
                    <span className="text-[11px] font-medium text-cos-muted">
                      {eventLine}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-cos-muted">
                    {meta}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
