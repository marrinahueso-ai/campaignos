"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Archive,
  Check,
  ImagePlus,
  Loader2,
  Trash2,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { AppImage } from "@/components/images/AppImage";
import {
  approveBackgroundAssetsAction,
  bulkUploadBackgroundAssetsAction,
  deleteBackgroundSourceAction,
  generateBackgroundBatchAction,
  rejectBackgroundAssetsAction,
  setBackgroundAssetStatusAction,
  updateBackgroundAssetAction,
  uploadBackgroundSourceAction,
} from "@/lib/background-library/actions";
import {
  BACKGROUND_LIBRARY_BATCH_SIZE,
  BACKGROUND_LIBRARY_BULK_TOTAL_BYTES,
  BACKGROUND_LIBRARY_BULK_UPLOAD_MAX,
  BACKGROUND_LIBRARY_DETAIL_THUMB_WIDTH,
  BACKGROUND_LIBRARY_GRID_THUMB_WIDTH,
  BACKGROUND_LIBRARY_MAX_BYTES,
} from "@/lib/background-library/constants";
import type {
  BackgroundAsset,
  BackgroundLibrary,
  BackgroundLibrarySummary,
  BackgroundSchoolLevel,
  BackgroundSeason,
  BackgroundSource,
} from "@/lib/background-library/types";

type TabId = "review" | "published" | "archived" | "sources";

type Props = {
  tab: TabId;
  summary: BackgroundLibrarySummary;
  libraries: BackgroundLibrary[];
  sources: BackgroundSource[];
  pending: BackgroundAsset[];
  published: BackgroundAsset[];
  archived: BackgroundAsset[];
};

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "pending_review"
      ? "bg-amber-50 text-amber-900"
      : status === "published"
        ? "bg-emerald-50 text-emerald-900"
        : status === "archived"
          ? "bg-cos-bg text-cos-muted"
          : "bg-sky-50 text-sky-900";
  const label =
    status === "pending_review"
      ? "Awaiting"
      : status === "source"
        ? "Source"
        : status;
  return (
    <span
      className={`absolute top-2 right-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${styles}`}
    >
      {label}
    </span>
  );
}

function LibraryThumb({
  publicUrl,
  alt,
  width,
  sizes,
  priority = false,
}: {
  publicUrl: string;
  alt: string;
  width: number;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <AppImage
      src={publicUrl}
      alt={alt}
      fill
      preset={width <= 400 ? "card" : "detail"}
      displayWidth={width}
      displayHeight={width}
      resize="cover"
      displayQuality={72}
      sizes={sizes}
      priority={priority}
      className="object-cover"
    />
  );
}

export function BackgroundLibraryShell({
  tab,
  summary,
  libraries,
  sources,
  pending,
  published,
  archived,
}: Props) {
  const router = useRouter();
  const [pendingUi, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState("");
  const [generatingSourceId, setGeneratingSourceId] = useState<string | null>(
    null,
  );

  const assets = useMemo(() => {
    if (tab === "review") return pending;
    if (tab === "published") return published;
    if (tab === "archived") return archived;
    return [];
  }, [tab, pending, published, archived]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (libraryFilter && !asset.libraryIds.includes(libraryFilter)) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        asset.title,
        asset.tags.join(" "),
        asset.colors.join(" "),
        asset.libraryNames.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [assets, search, libraryFilter]);

  const selectedAsset = assets.find((asset) => asset.id === selectedId) ?? null;

  const [metaTitle, setMetaTitle] = useState("");
  const [metaTags, setMetaTags] = useState("");
  const [metaColors, setMetaColors] = useState("");
  const [metaSeason, setMetaSeason] = useState<BackgroundSeason>("anytime");
  const [metaLevel, setMetaLevel] = useState<BackgroundSchoolLevel>("any");
  const [metaLibraries, setMetaLibraries] = useState<string[]>([]);
  const [bulkLibraryIds, setBulkLibraryIds] = useState<string[]>([]);

  function selectAsset(asset: BackgroundAsset) {
    setSelectedId(asset.id);
    setMetaTitle(asset.title);
    setMetaTags(asset.tags.join(", "));
    setMetaColors(asset.colors.join(", "));
    setMetaSeason(asset.season);
    setMetaLevel(asset.schoolLevel);
    setMetaLibraries(asset.libraryIds);
  }

  function toggleCheck(id: string) {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function run(action: () => Promise<{ success: boolean; message: string }>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setMessage(result.message);
        setChecked([]);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  function friendlyUploadError(caught: unknown): string {
    const message =
      caught instanceof Error
        ? caught.message
        : typeof caught === "string"
          ? caught
          : "";
    if (/Body exceeded|body size|413/i.test(message)) {
      const limitMb = Math.round(
        BACKGROUND_LIBRARY_BULK_TOTAL_BYTES / (1024 * 1024),
      );
      const fileMb = Math.round(BACKGROUND_LIBRARY_MAX_BYTES / (1024 * 1024));
      return `Upload is too large for one request. Use fewer images, or keep each under ${fileMb}MB (${limitMb}MB total for bulk).`;
    }
    return message || "Upload failed. Refresh the page and try again.";
  }

  async function onUpload(formData: FormData) {
    setError(null);
    setMessage(null);
    const file = formData.get("file");
    if (file instanceof File && file.size > BACKGROUND_LIBRARY_MAX_BYTES) {
      setError(
        `Image must be ${Math.round(BACKGROUND_LIBRARY_MAX_BYTES / (1024 * 1024))}MB or smaller.`,
      );
      return;
    }
    try {
      const result = await uploadBackgroundSourceAction(formData);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      router.push("/ops/background-library?tab=sources");
      router.refresh();
    } catch (caught) {
      setError(friendlyUploadError(caught));
    }
  }

  async function onBulkUpload(formData: FormData) {
    setError(null);
    setMessage(null);
    for (const libraryId of bulkLibraryIds) {
      formData.append("libraryIds", libraryId);
    }
    const files = formData.getAll("files").filter(
      (entry): entry is File => entry instanceof File && entry.size > 0,
    );
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > BACKGROUND_LIBRARY_BULK_TOTAL_BYTES) {
      const limitMb = Math.round(
        BACKGROUND_LIBRARY_BULK_TOTAL_BYTES / (1024 * 1024),
      );
      setError(
        `Those images total more than ${limitMb}MB. Upload fewer files or smaller images.`,
      );
      return;
    }
    try {
      const result = await bulkUploadBackgroundAssetsAction(formData);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      router.push("/ops/background-library?tab=review");
      router.refresh();
    } catch (caught) {
      setError(friendlyUploadError(caught));
    }
  }

  function onGenerate(sourceId: string) {
    setGeneratingSourceId(sourceId);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await generateBackgroundBatchAction({
        sourceId,
        count: BACKGROUND_LIBRARY_BATCH_SIZE,
      });
      setGeneratingSourceId(null);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
      router.push("/ops/background-library?tab=review");
      router.refresh();
    });
  }

  return (
    <div className="studio-page space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-cos-brand-mustard uppercase">
            Owner
          </p>
          <h1 className="font-serif text-3xl text-cos-text">Background Library</h1>
          <p className="mt-1 max-w-xl text-sm text-cos-muted">
            Upload inspiration, generate {BACKGROUND_LIBRARY_BATCH_SIZE} individual
            backgrounds, approve into libraries, or delete rejects. Platform-only —
            not a school admin tool.
          </p>
        </div>
        <Link
          href="/ops"
          className="text-sm font-medium text-cos-muted underline-offset-2 hover:text-cos-text hover:underline"
        >
          ← Owner ops
        </Link>
      </div>

      {(message || error) && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            error
              ? "border border-cos-error/30 bg-cos-error/10 text-cos-error-text"
              : "border border-cos-success/30 bg-cos-success/10 text-cos-success-text"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Total", summary.total],
          ["Awaiting review", summary.pendingReview],
          ["Published", summary.published],
          ["Archived", summary.archived],
          ["Total uses", summary.totalUses],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-cos-border bg-cos-card px-4 py-4 shadow-sm"
          >
            <p className="text-[11px] font-bold tracking-wide text-cos-muted uppercase">
              {label}
            </p>
            <p className="mt-1 font-serif text-3xl text-cos-text tabular-nums">
              {Number(value).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-cos-border pb-px">
        {(
          [
            ["review", "Review Queue", summary.pendingReview],
            ["published", "Published", summary.published],
            ["archived", "Archived", summary.archived],
            ["sources", "Source Graphics", summary.sources],
          ] as const
        ).map(([id, label, count]) => (
          <Link
            key={id}
            href={`/ops/background-library?tab=${id}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
              tab === id
                ? "border-cos-dark text-cos-text"
                : "border-transparent text-cos-muted hover:text-cos-text"
            }`}
          >
            {label}{" "}
            <span className="text-xs font-bold text-cos-muted">{count}</span>
          </Link>
        ))}
      </div>

      {tab === "sources" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <form
                action={onUpload}
                className="rounded-2xl border border-dashed border-cos-border bg-cos-card p-5"
              >
                <h2 className="font-serif text-xl text-cos-text">Upload source graphic</h2>
                <p className="mt-1 text-sm text-cos-muted">
                  One inspiration image. Generate creates {BACKGROUND_LIBRARY_BATCH_SIZE}{" "}
                  separate backgrounds (not a grid).
                </p>
                <div className="mt-4 grid gap-3">
                  <input
                    name="title"
                    placeholder="Title (e.g. Chalkboard fall mood)"
                    className="rounded-xl border border-cos-border bg-cos-bg px-3 py-2 text-sm"
                  />
                  <input
                    name="notes"
                    placeholder="Notes (optional)"
                    className="rounded-xl border border-cos-border bg-cos-bg px-3 py-2 text-sm"
                  />
                  <input
                    name="file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    required
                    className="text-sm"
                  />
                </div>
                <div className="mt-4">
                  <Button type="submit" disabled={pendingUi}>
                    {pendingUi ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    Upload source
                  </Button>
                </div>
              </form>

              <form
                action={onBulkUpload}
                className="rounded-2xl border border-dashed border-cos-brand-sage/40 bg-cos-card p-5"
              >
                <h2 className="font-serif text-xl text-cos-text">Bulk upload to library</h2>
                <p className="mt-1 text-sm text-cos-muted">
                  Finished artwork goes straight to the review queue (no AI). Originals are
                  stored once; grids use sized thumbnails.
                </p>
                <div className="mt-4 grid gap-3">
                  <input
                    name="files"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    required
                    className="text-sm"
                  />
                  <p className="text-xs text-cos-muted">
                    Up to {BACKGROUND_LIBRARY_BULK_UPLOAD_MAX} images · 12MB each · PNG /
                    JPEG / WebP / GIF
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-[11px] font-bold tracking-wide text-cos-muted uppercase">
                      Season
                      <select
                        name="season"
                        defaultValue="anytime"
                        className="mt-1 w-full rounded-xl border border-cos-border bg-cos-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-cos-text"
                      >
                        <option value="anytime">Anytime</option>
                        <option value="fall">Fall</option>
                        <option value="winter">Winter</option>
                        <option value="spring">Spring</option>
                        <option value="summer">Summer</option>
                      </select>
                    </label>
                    <label className="block text-[11px] font-bold tracking-wide text-cos-muted uppercase">
                      Level
                      <select
                        name="schoolLevel"
                        defaultValue="any"
                        className="mt-1 w-full rounded-xl border border-cos-border bg-cos-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-cos-text"
                      >
                        <option value="any">Any</option>
                        <option value="elementary">Elementary</option>
                        <option value="middle">Middle</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold tracking-wide text-cos-muted uppercase">
                      Libraries (optional)
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {libraries.map((library) => {
                        const on = bulkLibraryIds.includes(library.id);
                        return (
                          <label
                            key={library.id}
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              on
                                ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
                                : "border-cos-border bg-cos-bg text-cos-text"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={on}
                              onChange={() =>
                                setBulkLibraryIds((prev) =>
                                  on
                                    ? prev.filter((id) => id !== library.id)
                                    : [...prev, library.id],
                                )
                              }
                            />
                            {library.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Button type="submit" disabled={pendingUi}>
                    {pendingUi ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    Upload to review queue
                  </Button>
                </div>
              </form>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sources.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-cos-border px-6 py-16 text-center">
                  <h3 className="font-serif text-xl text-cos-text">No source graphics yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-cos-muted">
                    Upload an inspiration image to start generating library backgrounds, or
                    bulk upload finished artwork into the review queue.
                  </p>
                </div>
              ) : (
                sources.map((source) => (
                  <article
                    key={source.id}
                    className="overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-sm"
                  >
                    <div className="relative aspect-square bg-cos-bg">
                      <StatusPill status="source" />
                      <LibraryThumb
                        publicUrl={source.publicUrl}
                        alt={source.title}
                        width={BACKGROUND_LIBRARY_GRID_THUMB_WIDTH}
                        sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 280px"
                      />
                    </div>
                    <div className="space-y-3 p-3">
                      <div>
                        <h3 className="text-sm font-bold text-cos-text">{source.title}</h3>
                        <p className="text-xs text-cos-muted">
                          {source.variationCount} variations linked
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={pendingUi || generatingSourceId === source.id}
                          onClick={() => onGenerate(source.id)}
                        >
                          {generatingSourceId === source.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Wand2 className="h-3.5 w-3.5" />
                          )}
                          Generate {BACKGROUND_LIBRARY_BATCH_SIZE}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={pendingUi}
                          onClick={() =>
                            run(() =>
                              deleteBackgroundSourceAction({ sourceId: source.id }),
                            )
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
          <aside className="rounded-2xl border border-cos-border bg-cos-card p-4 text-sm text-cos-muted shadow-sm">
            <h3 className="font-serif text-lg text-cos-text">How it works</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-4">
              <li>Upload one inspiration image, or bulk upload finished artwork.</li>
              <li>
                For sources: click Generate — AI creates {BACKGROUND_LIBRARY_BATCH_SIZE}{" "}
                separate images.
              </li>
              <li>Approve keepers into libraries; rejects are deleted.</li>
              <li>Schools later pick published assets as inspiration (normal AI cost).</li>
            </ol>
          </aside>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, tags…"
              className="min-w-[200px] flex-1 rounded-full border border-cos-border bg-cos-card px-4 py-2 text-sm shadow-sm"
            />
            <select
              value={libraryFilter}
              onChange={(event) => setLibraryFilter(event.target.value)}
              className="rounded-full border border-cos-border bg-cos-card px-3 py-2 text-sm shadow-sm"
            >
              <option value="">All libraries</option>
              {libraries.map((library) => (
                <option key={library.id} value={library.id}>
                  {library.name}
                </option>
              ))}
            </select>
            {tab === "review" && checked.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cos-brand-sage/30 bg-cos-brand-sage/10 px-3 py-2">
                <span className="text-sm font-semibold text-cos-text">
                  {checked.length} selected
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={pendingUi}
                  title="Uses libraries checked in the detail panel (or Generic)"
                  onClick={() => {
                    const fallback =
                      libraries.find((l) => l.slug === "generic")?.id ??
                      libraries[0]?.id;
                    const libraryIds =
                      metaLibraries.length > 0
                        ? metaLibraries
                        : fallback
                          ? [fallback]
                          : [];
                    if (libraryIds.length === 0) {
                      setError("Create a library before approving.");
                      return;
                    }
                    run(() =>
                      approveBackgroundAssetsAction({
                        assetIds: checked,
                        libraryIds,
                      }),
                    );
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={pendingUi}
                  onClick={() =>
                    run(() => rejectBackgroundAssetsAction({ assetIds: checked }))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Reject / delete
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {filteredAssets.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-cos-border px-6 py-16 text-center">
                  <h3 className="font-serif text-xl text-cos-text">
                    {tab === "review"
                      ? "Review queue is clear"
                      : tab === "published"
                        ? "No published backgrounds match"
                        : "Nothing archived"}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-cos-muted">
                    {tab === "review"
                      ? "Upload a source and generate variations, or bulk upload finished artwork."
                      : "Adjust filters or move items from another tab."}
                  </p>
                </div>
              ) : (
                filteredAssets.map((asset) => {
                  const isSelected = selectedId === asset.id;
                  const isChecked = checked.includes(asset.id);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => selectAsset(asset)}
                      className={`overflow-hidden rounded-2xl border bg-cos-card text-left shadow-sm transition ${
                        isSelected
                          ? "border-cos-dark ring-2 ring-cos-dark/15"
                          : "border-cos-border hover:border-cos-brand-sage"
                      }`}
                    >
                      <div className="relative aspect-square bg-cos-bg">
                        {tab === "review" ? (
                          <span
                            role="checkbox"
                            aria-checked={isChecked}
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleCheck(asset.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                toggleCheck(asset.id);
                              }
                            }}
                            className={`absolute top-2 left-2 z-10 grid h-5 w-5 place-items-center rounded-md text-[11px] font-bold text-white ${
                              isChecked ? "bg-cos-dark" : "bg-black/35"
                            }`}
                          >
                            {isChecked ? "✓" : ""}
                          </span>
                        ) : null}
                        <StatusPill status={asset.status} />
                        <LibraryThumb
                          publicUrl={asset.publicUrl}
                          alt={asset.title}
                          width={BACKGROUND_LIBRARY_GRID_THUMB_WIDTH}
                          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 220px"
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="line-clamp-2 text-sm font-bold text-cos-text">
                          {asset.title}
                        </h3>
                        <p className="mt-1 text-xs text-cos-muted">
                          {asset.libraryNames[0]
                            ? `${asset.libraryNames[0]}${
                                asset.libraryNames.length > 1
                                  ? ` +${asset.libraryNames.length - 1}`
                                  : ""
                              }`
                            : "Unassigned"}{" "}
                          · Used {asset.usageCount}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <aside className="sticky top-4 h-fit rounded-2xl border border-cos-border bg-cos-card shadow-sm">
              {selectedAsset ? (
                <div>
                  <div className="relative aspect-square bg-cos-bg">
                    <LibraryThumb
                      publicUrl={selectedAsset.publicUrl}
                      alt={selectedAsset.title}
                      width={BACKGROUND_LIBRARY_DETAIL_THUMB_WIDTH}
                      sizes="340px"
                      priority
                    />
                  </div>
                  <div className="space-y-3 p-4">
                    <h2 className="font-serif text-xl text-cos-text">{selectedAsset.title}</h2>
                    <label className="block text-[11px] font-bold tracking-wide text-cos-muted uppercase">
                      Title
                      <input
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-cos-border bg-cos-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-cos-text"
                      />
                    </label>
                    <label className="block text-[11px] font-bold tracking-wide text-cos-muted uppercase">
                      Tags
                      <input
                        value={metaTags}
                        onChange={(e) => setMetaTags(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-cos-border bg-cos-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-cos-text"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block text-[11px] font-bold tracking-wide text-cos-muted uppercase">
                        Season
                        <select
                          value={metaSeason}
                          onChange={(e) =>
                            setMetaSeason(e.target.value as BackgroundSeason)
                          }
                          className="mt-1 w-full rounded-xl border border-cos-border bg-cos-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-cos-text"
                        >
                          <option value="anytime">Anytime</option>
                          <option value="fall">Fall</option>
                          <option value="winter">Winter</option>
                          <option value="spring">Spring</option>
                          <option value="summer">Summer</option>
                        </select>
                      </label>
                      <label className="block text-[11px] font-bold tracking-wide text-cos-muted uppercase">
                        Level
                        <select
                          value={metaLevel}
                          onChange={(e) =>
                            setMetaLevel(e.target.value as BackgroundSchoolLevel)
                          }
                          className="mt-1 w-full rounded-xl border border-cos-border bg-cos-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-cos-text"
                        >
                          <option value="any">Any</option>
                          <option value="elementary">Elementary</option>
                          <option value="middle">Middle</option>
                          <option value="high">High</option>
                        </select>
                      </label>
                    </div>
                    <label className="block text-[11px] font-bold tracking-wide text-cos-muted uppercase">
                      Colors
                      <input
                        value={metaColors}
                        onChange={(e) => setMetaColors(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-cos-border bg-cos-bg px-3 py-2 text-sm font-normal normal-case tracking-normal text-cos-text"
                      />
                    </label>
                    <div>
                      <p className="text-[11px] font-bold tracking-wide text-cos-muted uppercase">
                        Libraries
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {libraries.map((library) => {
                          const on = metaLibraries.includes(library.id);
                          return (
                            <label
                              key={library.id}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                on
                                  ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
                                  : "border-cos-border bg-cos-bg text-cos-text"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={on}
                                onChange={() =>
                                  setMetaLibraries((prev) =>
                                    on
                                      ? prev.filter((id) => id !== library.id)
                                      : [...prev, library.id],
                                  )
                                }
                              />
                              {library.name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-cos-muted">
                      Used {selectedAsset.usageCount.toLocaleString()} times
                    </p>
                    <div className="flex flex-wrap gap-2 border-t border-cos-border pt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pendingUi}
                        onClick={() =>
                          run(() =>
                            updateBackgroundAssetAction({
                              assetId: selectedAsset.id,
                              title: metaTitle,
                              tags: metaTags,
                              colors: metaColors,
                              season: metaSeason,
                              schoolLevel: metaLevel,
                              libraryIds: metaLibraries,
                            }),
                          )
                        }
                      >
                        Save
                      </Button>
                      {tab === "review" ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={pendingUi || metaLibraries.length === 0}
                            onClick={() =>
                              run(() =>
                                approveBackgroundAssetsAction({
                                  assetIds: [selectedAsset.id],
                                  libraryIds: metaLibraries,
                                }),
                              )
                            }
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={pendingUi}
                            onClick={() =>
                              run(() =>
                                rejectBackgroundAssetsAction({
                                  assetIds: [selectedAsset.id],
                                }),
                              )
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {tab === "published" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={pendingUi}
                          onClick={() =>
                            run(() =>
                              setBackgroundAssetStatusAction({
                                assetId: selectedAsset.id,
                                status: "archived",
                              }),
                            )
                          }
                        >
                          <Archive className="h-3.5 w-3.5" />
                          Archive
                        </Button>
                      ) : null}
                      {tab === "archived" ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={pendingUi}
                          onClick={() =>
                            run(() =>
                              setBackgroundAssetStatusAction({
                                assetId: selectedAsset.id,
                                status: "published",
                              }),
                            )
                          }
                        >
                          Restore
                        </Button>
                      ) : null}
                      {tab !== "review" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={pendingUi}
                          onClick={() =>
                            run(() =>
                              rejectBackgroundAssetsAction({
                                assetIds: [selectedAsset.id],
                              }),
                            )
                          }
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-16 text-center">
                  <h3 className="font-serif text-lg text-cos-text">Select a background</h3>
                  <p className="mt-2 text-sm text-cos-muted">
                    Preview, edit metadata, assign libraries, then approve or delete.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
