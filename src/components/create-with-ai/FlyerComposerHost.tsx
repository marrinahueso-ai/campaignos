import { statSync } from "node:fs";
import { join } from "node:path";

type FlyerComposerHostProps = {
  view?: string | null;
  eventId?: string | null;
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

/** Hosts the static Flyer composer inside dashboard Sidebar + header chrome. */
export function FlyerComposerHost({
  view,
  eventId,
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
  const trimmedEventId = eventId?.trim();
  if (trimmedEventId) {
    params.set("eventId", trimmedEventId);
  }
  if (fresh) {
    params.set("fresh", "1");
  }

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100dvh-3.75rem)] min-h-[560px] flex-col overflow-hidden bg-[#f6f2eb] lg:-mx-8 lg:-my-10">
      <iframe
        src={`/create-with-ai-flyer.html?${params.toString()}`}
        title="Flyer composer"
        className="min-h-0 w-full flex-1 border-0 bg-[#f6f2eb]"
        allow="microphone"
      />
    </div>
  );
}
