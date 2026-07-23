"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, Search } from "lucide-react";
import type { GiphyGifSummary, GiphyProxyResponse } from "@/lib/giphy/types";
import { cn } from "@/lib/utils/cn";

type GiphyGifPickerProps = {
  onSelect: (gif: GiphyGifSummary) => void;
  /** Anchor element (GIF button) used to position the fixed portal panel. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Optional ref to the portaled panel — needed for outside-click handling. */
  panelRef?: RefObject<HTMLDivElement | null>;
  className?: string;
};

async function fetchGiphy(path: string): Promise<GiphyProxyResponse> {
  const response = await fetch(path, { method: "GET", credentials: "same-origin" });
  const payload = (await response.json()) as GiphyProxyResponse;
  return {
    configured: Boolean(payload.configured),
    gifs: Array.isArray(payload.gifs) ? payload.gifs : [],
    message: payload.message ?? null,
    nextOffset: payload.nextOffset ?? null,
    hasMore: Boolean(payload.hasMore),
  };
}

function giphyPath(query: string, offset = 0): string {
  const params = new URLSearchParams();
  if (offset > 0) {
    params.set("offset", String(offset));
  }
  if (query) {
    params.set("q", query);
    const qs = params.toString();
    return `/api/giphy/search?${qs}`;
  }
  const qs = params.toString();
  return qs ? `/api/giphy/trending?${qs}` : "/api/giphy/trending";
}

function mergeUniqueGifs(
  existing: GiphyGifSummary[],
  incoming: GiphyGifSummary[],
): GiphyGifSummary[] {
  if (existing.length === 0) {
    return incoming;
  }
  const seen = new Set(existing.map((gif) => gif.id));
  const merged = [...existing];
  for (const gif of incoming) {
    if (!seen.has(gif.id)) {
      seen.add(gif.id);
      merged.push(gif);
    }
  }
  return merged;
}

/** ~512px tall scroll region — never inherits parent height. */
const SCROLL_AREA_CLASS = "h-[min(32rem,60vh)]";
/** ~576px / 95vw — set in JS too so flex ancestors cannot squeeze it. */
const PANEL_WIDTH_PX = 36 * 16;

function useFixedAnchorStyle(
  anchorRef: RefObject<HTMLElement | null>,
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    left: 0,
    bottom: 0,
    width: PANEL_WIDTH_PX,
    zIndex: 9999,
    visibility: "hidden",
  });

  useLayoutEffect(() => {
    function update() {
      const el = anchorRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const width = Math.min(PANEL_WIDTH_PX, window.innerWidth * 0.95);
      const gap = 8;
      let left = rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      const bottom = Math.max(8, window.innerHeight - rect.top + gap);
      setStyle({
        position: "fixed",
        left,
        bottom,
        width,
        zIndex: 9999,
        visibility: "visible",
      });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef]);

  return style;
}

export function GiphyGifPicker({
  onSelect,
  anchorRef,
  panelRef,
  className,
}: GiphyGifPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGifSummary[]>([]);
  const [configured, setConfigured] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const fixedStyle = useFixedAnchorStyle(anchorRef);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage(null);
      setHasMore(false);
      setNextOffset(null);
      try {
        const result = await fetchGiphy(giphyPath(debouncedQuery, 0));
        if (cancelled) {
          return;
        }
        setConfigured(result.configured);
        setGifs(result.gifs);
        setMessage(result.message ?? null);
        setHasMore(Boolean(result.hasMore));
        setNextOffset(result.nextOffset ?? null);
      } catch {
        if (!cancelled) {
          setConfigured(true);
          setGifs([]);
          setMessage("Could not load GIFs. Try again.");
          setHasMore(false);
          setNextOffset(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  async function loadMore() {
    if (loading || loadingMore || !hasMore || nextOffset == null) {
      return;
    }
    setLoadingMore(true);
    setMessage(null);
    try {
      const result = await fetchGiphy(giphyPath(debouncedQuery, nextOffset));
      setConfigured(result.configured);
      setGifs((prev) => mergeUniqueGifs(prev, result.gifs));
      setMessage(result.message ?? null);
      setHasMore(Boolean(result.hasMore));
      setNextOffset(result.nextOffset ?? null);
    } catch {
      setMessage("Could not load more GIFs. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (!mounted) {
    return null;
  }

  const panel = (
    <div
      ref={(node) => {
        if (panelRef) {
          panelRef.current = node;
        }
      }}
      style={fixedStyle}
      className={cn(
        // Explicit min-width so nothing can collapse the portal panel.
        "flex w-[min(36rem,95vw)] min-w-[min(36rem,95vw)] max-w-[95vw] flex-col rounded-xl border border-cos-border bg-white p-3 shadow-2xl",
        className,
      )}
      role="dialog"
      aria-label="GIF picker"
    >
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-cos-border bg-cos-bg/40 px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-cos-muted" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search GIPHY"
          aria-label="Search GIFs"
          className="w-full bg-transparent text-sm text-cos-text placeholder:text-cos-muted focus:outline-none"
          autoFocus
        />
      </div>

      {!configured ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 text-center",
            SCROLL_AREA_CLASS,
          )}
        >
          <p className="text-sm font-medium text-cos-text">GIF search isn’t set up yet</p>
          <p className="text-xs leading-snug text-cos-muted">
            {message?.includes("GIPHY_API_KEY")
              ? message
              : message || "Add GIPHY_API_KEY to enable GIF search"}
          </p>
        </div>
      ) : loading ? (
        <div
          className={cn("flex items-center justify-center text-xs text-cos-muted", SCROLL_AREA_CLASS)}
        >
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          Loading GIFs…
        </div>
      ) : gifs.length === 0 ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 text-center",
            SCROLL_AREA_CLASS,
          )}
        >
          <p className="text-sm text-cos-text">No GIFs found</p>
          <p className="text-xs text-cos-muted">
            {message ?? (debouncedQuery ? "Try a different search." : "Trending is empty right now.")}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "grid grid-cols-2 content-start items-start gap-3 overflow-y-auto",
            SCROLL_AREA_CLASS,
          )}
        >
          {gifs.map((gif) => (
            <button
              key={gif.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(gif)}
              className="group relative aspect-square w-full min-h-[15rem] min-w-[13.5rem] shrink-0 overflow-hidden rounded-lg bg-cos-bg/60 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-cos-dark"
              aria-label={gif.title || "Select GIF"}
              title={gif.title || "Select GIF"}
            >
              <img
                src={gif.previewUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
          {hasMore ? (
            <div className="col-span-2 flex justify-center pb-1 pt-1">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex items-center rounded-lg border border-cos-border bg-white px-3 py-1.5 text-xs font-medium text-cos-text transition-colors hover:bg-cos-bg/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cos-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </button>
            </div>
          ) : null}
        </div>
      )}

      <p className="mt-2 text-center text-[10px] font-medium tracking-wide text-cos-muted uppercase">
        Powered by GIPHY
      </p>
    </div>
  );

  return createPortal(panel, document.body);
}
