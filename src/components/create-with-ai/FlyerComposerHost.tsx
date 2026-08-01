import { statSync } from "node:fs";
import { join } from "node:path";

type FlyerComposerHostProps = {
  view?: string | null;
  eventId?: string | null;
  /** Active org — required to scope iframe draft localStorage. */
  organizationId?: string | null;
  fresh?: boolean;
};

const VALID_VIEWS = new Set(["start", "inputs", "result", "edit"]);

/** Bust iframe cache when the static flyer HTML file changes. */
function flyerHtmlCacheKey(): string {
  try {
    return String(
      Math.floor(
        statSync(join(process.cwd(), "public/create-with-ai-flyer.html"))
          .mtimeMs,
      ),
    );
  } catch {
    return "1";
  }
}

/**
 * Hosts the static Flyer composer inside dashboard Sidebar + header chrome.
 * The iframe document loads Pilot Fraunces + DM Sans (same stack as Social
 * Create-with-AI) via Google Fonts under the flyer embed CSP.
 */
export function FlyerComposerHost({
  view,
  eventId,
  organizationId,
  fresh = false,
}: FlyerComposerHostProps) {
  const resolved =
    view && VALID_VIEWS.has(view)
      ? view
      : view === "templates" || view === "chooser"
        ? "start"
        : view === "editArtwork" || view === "edit-artwork"
          ? "edit"
          : "start";

  const params = new URLSearchParams({
    embed: "1",
    view: resolved,
    v: flyerHtmlCacheKey(),
  });
  const trimmedOrgId = organizationId?.trim();
  if (trimmedOrgId) {
    params.set("organizationId", trimmedOrgId);
  }
  const trimmedEventId = eventId?.trim();
  if (trimmedEventId) {
    params.set("eventId", trimmedEventId);
  }
  if (fresh) {
    params.set("fresh", "1");
  }

  // Remount iframe when org/event context changes so in-memory state cannot bleed.
  const frameKey = `${trimmedOrgId || "no-org"}:${trimmedEventId || "no-event"}:${resolved}:${fresh ? "1" : "0"}`;

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100dvh-3.75rem)] min-h-[560px] flex-col overflow-hidden bg-[#f6f2eb] lg:-mx-8 lg:-my-10">
      <iframe
        key={frameKey}
        src={`/create-with-ai-flyer.html?${params.toString()}`}
        title="Flyer composer"
        className="min-h-0 w-full flex-1 border-0 bg-[#f6f2eb]"
        allow="microphone"
      />
    </div>
  );
}
