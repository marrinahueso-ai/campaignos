"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import type { GiphyGifSummary, GiphyProxyResponse } from "@/lib/giphy/types";
import { cn } from "@/lib/utils/cn";

type GiphyGifPickerProps = {
  onSelect: (gif: GiphyGifSummary) => void;
  className?: string;
};

async function fetchGiphy(path: string): Promise<GiphyProxyResponse> {
  const response = await fetch(path, { method: "GET", credentials: "same-origin" });
  const payload = (await response.json()) as GiphyProxyResponse;
  return {
    configured: Boolean(payload.configured),
    gifs: Array.isArray(payload.gifs) ? payload.gifs : [],
    message: payload.message ?? null,
  };
}

const SCROLL_AREA_CLASS = "h-[min(28rem,55vh)]";

export function GiphyGifPicker({ onSelect, className }: GiphyGifPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGifSummary[]>([]);
  const [configured, setConfigured] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      try {
        const path = debouncedQuery
          ? `/api/giphy/search?q=${encodeURIComponent(debouncedQuery)}`
          : "/api/giphy/trending";
        const result = await fetchGiphy(path);
        if (cancelled) {
          return;
        }
        setConfigured(result.configured);
        setGifs(result.gifs);
        setMessage(result.message ?? null);
      } catch {
        if (!cancelled) {
          setConfigured(true);
          setGifs([]);
          setMessage("Could not load GIFs. Try again.");
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

  return (
    <div
      className={cn(
        "flex w-[min(28rem,92vw)] flex-col rounded-xl border border-cos-border bg-white p-3 shadow-lg",
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
              className="group relative aspect-square w-full min-h-[11.5rem] shrink-0 overflow-hidden rounded-lg bg-cos-bg/60 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-cos-dark"
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
        </div>
      )}

      <p className="mt-2 text-center text-[10px] font-medium tracking-wide text-cos-muted uppercase">
        Powered by GIPHY
      </p>
    </div>
  );
}
