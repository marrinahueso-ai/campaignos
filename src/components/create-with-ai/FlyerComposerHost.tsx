type FlyerComposerHostProps = {
  view?: string | null;
};

const VALID_VIEWS = new Set(["start", "inputs", "result", "edit"]);

/** Hosts the static Flyer composer inside dashboard Sidebar + header chrome. */
export function FlyerComposerHost({ view }: FlyerComposerHostProps) {
  const resolved =
    view && VALID_VIEWS.has(view)
      ? view
      : view === "templates" || view === "chooser"
        ? "start"
        : view === "editArtwork" || view === "edit-artwork"
          ? "edit"
          : "start";

  const params = new URLSearchParams({ embed: "1", view: resolved });

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
