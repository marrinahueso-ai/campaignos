"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Cloud,
  Download,
  ImagePlus,
  Loader2,
  MessageSquare,
  Printer,
  Send,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { BackgroundLibraryPicker } from "@/components/background-library/BackgroundLibraryPicker";
import { EventPickerModal } from "@/components/newsletters/builder/EventPickerModal";
import { updateFlyerDraft } from "@/lib/flyers/actions";
import {
  buildFlyerGeneratePayload,
  formatFlyerEventDate,
  printSizeLabel,
  type FlyerGenerateBrandKit,
} from "@/lib/flyers/generate-payload";
import type {
  Flyer,
  FlyerComposerState,
  FlyerPrintSize,
  FlyerVersion,
} from "@/lib/flyers/types";
import type { NewsletterComposerEvent } from "@/lib/newsletter-composer/types";
import { cn } from "@/lib/utils/cn";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "generating";

const EDIT_CHIPS = [
  "Make more playful",
  "Increase contrast",
  "Bigger headline",
  "Warm school colors",
] as const;

type Props = {
  flyer: Flyer;
  events: NewsletterComposerEvent[];
  brandKit: FlyerGenerateBrandKit | null;
  canEdit: boolean;
  approverDisplayName: string | null;
};

function formatEventMeta(event: NewsletterComposerEvent): string {
  const dateLabel = formatFlyerEventDate(event.date) || event.date || "";
  const parts = [dateLabel, event.time, event.location].filter(
    (part) => part && String(part).trim(),
  );
  return parts.join(" · ") || "No date set";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

async function downloadPng(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function printImage(url: string) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return;
  popup.document.write(
    `<!doctype html><html><head><title>Print flyer</title></head><body style="margin:0;background:#fff;display:flex;justify-content:center;"><img src="${url.replace(/"/g, "&quot;")}" alt="Flyer" style="max-width:100%;height:auto;" onload="window.focus();window.print();" /></body></html>`,
  );
  popup.document.close();
}

export function FlyerBuilderShell({
  flyer,
  events,
  brandKit,
  canEdit,
  approverDisplayName,
}: Props) {
  const router = useRouter();
  const inspirationInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const initial = flyer.composerState ?? {};
  const [title, setTitle] = useState(flyer.title || "");
  const [eventId, setEventId] = useState<string | null>(flyer.eventId);
  const [printSize, setPrintSize] = useState<FlyerPrintSize>(
    flyer.printSize || "letter",
  );
  const [aiDirection, setAiDirection] = useState(initial.aiDirection ?? "");
  const [editDirection, setEditDirection] = useState(initial.editDirection ?? "");
  const [qrEnabled, setQrEnabled] = useState(initial.qrEnabled ?? false);
  const [qrUrl, setQrUrl] = useState(initial.qrUrl ?? "");
  const [brandEnabled, setBrandEnabled] = useState(
    initial.brandEnabled ?? Boolean(brandKit),
  );
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(
    initial.selectedLogoId ?? brandKit?.logos[0]?.id ?? null,
  );
  const [inspirationPhotoUrl, setInspirationPhotoUrl] = useState<string | null>(
    initial.inspirationPhotoUrl ?? null,
  );
  const [inspirationPhotoSource, setInspirationPhotoSource] = useState<
    "upload" | "library" | null
  >(
    initial.inspirationPhotoSource === "upload" ||
      initial.inspirationPhotoSource === "library"
      ? initial.inspirationPhotoSource
      : null,
  );
  const [inspirationPhotoLabel, setInspirationPhotoLabel] = useState<
    string | null
  >(initial.inspirationPhotoLabel ?? null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(
    flyer.previewImageUrl,
  );
  const [versions, setVersions] = useState<FlyerVersion[]>(
    initial.versions ?? [],
  );
  const [activeVersionId, setActiveVersionId] = useState<string | null>(
    initial.activeVersionId ?? null,
  );
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(
    flyer.status === "changes_requested" && Boolean(flyer.changeRequestNote),
  );
  const [status, setStatus] = useState(flyer.status);

  const selectedEvent =
    events.find((event) => event.id === eventId) ?? null;
  const isHalf = printSize === "half";
  const isGenerating = saveStatus === "generating";
  const readOnly = !canEdit || status === "needs_approval" || status === "approved";
  const canSendForApproval =
    Boolean(previewImageUrl) &&
    !isGenerating &&
    (status === "draft" || status === "changes_requested") &&
    (canEdit || status === "changes_requested");
  const sendLabel =
    status === "changes_requested" ? "Resubmit" : "Send for Approval";

  function applySelectedEvent(event: NewsletterComposerEvent | null) {
    setEventId(event?.id ?? null);
    if (event && !title.trim()) {
      setTitle(event.title);
    }
  }

  function composerStatePatch(
    overrides: Partial<FlyerComposerState> = {},
  ): FlyerComposerState {
    return {
      aiDirection,
      editDirection,
      qrEnabled,
      qrUrl,
      brandEnabled,
      selectedLogoId,
      inspirationPhotoUrl,
      inspirationPhotoSource,
      inspirationPhotoLabel,
      previousFlyerUrl: previewImageUrl,
      versions,
      activeVersionId,
      orgName: brandKit?.organizationShortName,
      headline: title,
      ctaUrl: qrUrl,
      ...overrides,
    };
  }

  async function persistDraft(overrides?: {
    title?: string;
    eventId?: string | null;
    printSize?: FlyerPrintSize;
    composerState?: FlyerComposerState;
    previewImageUrl?: string | null;
  }) {
    if (readOnly && !overrides) return { ok: false as const, error: "Read only" };
    setSaveStatus("saving");
    const result = await updateFlyerDraft({
      flyerId: flyer.id,
      title: overrides?.title ?? title,
      eventId: overrides?.eventId !== undefined ? overrides.eventId : eventId,
      printSize: overrides?.printSize ?? printSize,
      composerState: overrides?.composerState ?? composerStatePatch(),
      previewImageUrl:
        overrides?.previewImageUrl !== undefined
          ? overrides.previewImageUrl
          : previewImageUrl,
      quiet: true,
    });
    if (!result.ok) {
      setSaveStatus("error");
      setError(result.error);
      return result;
    }
    setSaveStatus("saved");
    return result;
  }

  function handleSaveDraft() {
    if (readOnly) return;
    setError(null);
    startTransition(async () => {
      await persistDraft();
    });
  }

  async function runGenerate(mode: "generate" | "update") {
    if (readOnly) return;
    setError(null);
    setSendMessage(null);
    if (mode === "generate" && !aiDirection.trim()) {
      setError("Add a short description before generating.");
      return;
    }
    if (mode === "update" && !editDirection.trim()) {
      setError("Describe what to change, then tap Update.");
      return;
    }
    if (mode === "update" && !previewImageUrl) {
      setError("Generate a flyer first, then refine it.");
      return;
    }

    setSaveStatus("generating");
    const payload = buildFlyerGeneratePayload({
      printSize,
      aiDirection,
      editDirection: mode === "update" ? editDirection : null,
      title,
      orgName: brandKit?.organizationShortName,
      event: selectedEvent
        ? {
            title: selectedEvent.title,
            date: selectedEvent.date,
            time: selectedEvent.time,
            location: selectedEvent.location,
          }
        : null,
      qrEnabled,
      qrUrl,
      brandEnabled,
      brandKit,
      selectedLogoId,
      inspirationPhotoUrl,
      inspirationPhotoSource,
      inspirationPhotoLabel,
      previousFlyerUrl: mode === "update" ? previewImageUrl : null,
    });

    try {
      const response = await fetch("/api/flyer-composer/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string | null;
        imageUrl?: string | null;
        imageBase64?: string | null;
      };
      if (!response.ok || !data.success) {
        setSaveStatus("error");
        setError(data.error || "Couldn’t generate that flyer. Try again.");
        return;
      }
      const imageUrl = data.imageUrl || data.imageBase64 || null;
      if (!imageUrl) {
        setSaveStatus("error");
        setError("Generation finished without an image.");
        return;
      }
      const version: FlyerVersion = {
        id: `v_${Date.now()}`,
        imageUrl,
        createdAt: Date.now(),
      };
      const nextVersions = [version, ...versions].slice(0, 12);
      setVersions(nextVersions);
      setActiveVersionId(version.id);
      setPreviewImageUrl(imageUrl);
      if (mode === "update") setEditDirection("");
      const result = await updateFlyerDraft({
        flyerId: flyer.id,
        title,
        eventId,
        printSize,
        previewImageUrl: imageUrl,
        composerState: composerStatePatch({
          versions: nextVersions,
          activeVersionId: version.id,
          previousFlyerUrl: imageUrl,
          editDirection: mode === "update" ? "" : editDirection,
        }),
        quiet: true,
      });
      if (!result.ok) {
        setSaveStatus("error");
        setError(result.error);
        return;
      }
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
      setError("Couldn’t reach the flyer generator. Try again.");
    }
  }

  function handleSendForApproval() {
    if (readOnly && status !== "changes_requested") return;
    if (!previewImageUrl) {
      setError("Generate a flyer before sending for approval.");
      return;
    }
    setError(null);
    setSendMessage(null);
    startTransition(async () => {
      await persistDraft();
      try {
        const response = await fetch("/api/flyer-composer/send-for-approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flyerId: flyer.id,
            submissionKey: flyer.id,
            eventId: eventId || null,
            imageUrl: previewImageUrl,
            headline: title.trim() || "Flyer",
            orgName: brandKit?.organizationShortName ?? null,
            templateName: printSizeLabel(printSize),
          }),
        });
        const data = (await response.json()) as {
          success?: boolean;
          message?: string;
          error?: string;
        };
        if (!response.ok || !data.success) {
          setError(data.error || data.message || "Couldn’t send for approval.");
          return;
        }
        setStatus("needs_approval");
        setSendMessage(
          data.message ||
            (approverDisplayName
              ? `Sent to ${approverDisplayName}.`
              : "Sent for approval."),
        );
        router.refresh();
      } catch {
        setError("Couldn’t send for approval. Try again.");
      }
    });
  }

  return (
    <div className="-mx-4 -my-8 flex h-[calc(100dvh-3.75rem)] min-h-[560px] flex-col overflow-hidden bg-[#fffcf7] text-cos-text lg:-mx-8 lg:-my-10">
      <header className="z-50 flex h-16 shrink-0 items-center justify-between border-b border-cos-border bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <Link
            href="/flyers"
            className="flex items-center gap-2 text-sm font-medium text-cos-muted transition hover:text-cos-text"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Flyer Library</span>
          </Link>
          <div className="hidden h-6 w-px bg-cos-border sm:block" />
          <div className="flex min-w-0 items-center gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={readOnly}
              placeholder="Untitled flyer"
              className="min-w-0 truncate border-0 bg-transparent text-sm font-bold text-cos-text outline-none placeholder:text-cos-muted disabled:opacity-70"
            />
            <span className="hidden items-center gap-1.5 rounded bg-cos-bg px-2 py-0.5 text-[10px] tracking-widest text-cos-muted uppercase sm:inline-flex">
              {saveStatus === "generating" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Generating
                </>
              ) : saveStatus === "saving" || isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <Cloud className="h-3 w-3 text-[#0d7e5e]" /> Saved
                </>
              ) : (
                "Draft"
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {!readOnly ? (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isPending || isGenerating}
              className="px-3 py-2 text-sm font-medium text-cos-muted transition hover:text-cos-text disabled:opacity-50 sm:px-4"
            >
              Save Draft
            </button>
          ) : null}
          {canSendForApproval ? (
            <button
              type="button"
              onClick={handleSendForApproval}
              disabled={isPending || isGenerating || !previewImageUrl}
              className="inline-flex items-center gap-2 rounded-full bg-[#0d7e5e] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0a6b4f] disabled:opacity-50 sm:px-6"
            >
              {sendLabel}
              <Send className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </header>

      {showNotes && flyer.changeRequestNote ? (
        <div className="relative z-40 flex items-center justify-between border-b border-amber-100 bg-amber-50 px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <p className="text-xs leading-tight text-amber-900">
              <span className="font-bold">Changes Requested:</span>{" "}
              “{flyer.changeRequestNote}”
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNotes(false)}
            className="text-amber-600 transition hover:text-amber-800"
            aria-label="Dismiss notes"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {(error || sendMessage) && (
        <div
          className={cn(
            "border-b px-6 py-2 text-sm",
            error
              ? "border-red-100 bg-red-50 text-[#a65a3a]"
              : "border-[#0d7e5e]/20 bg-[#e6f3ee] text-[#0d7e5e]",
          )}
          role={error ? "alert" : "status"}
        >
          {error || sendMessage}
        </div>
      )}

      {approverDisplayName && !readOnly ? (
        <div className="border-b border-cos-border bg-cos-bg/60 px-6 py-1.5 text-[11px] text-cos-muted">
          Sends to:{" "}
          <span className="font-semibold text-cos-text">{approverDisplayName}</span>
        </div>
      ) : null}

      <main className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="hidden w-80 shrink-0 flex-col border-r border-cos-border bg-cos-bg md:flex">
          <div className="border-b border-cos-border bg-white/50 p-5">
            <h2 className="mb-1 text-[10px] font-bold tracking-[0.15em] text-cos-muted uppercase">
              Flyer Setup
            </h2>
            <p className="text-[11px] text-cos-muted">
              Configure your flyer details below.
            </p>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
                Associated Event
              </label>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setEventPickerOpen(true)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-cos-border bg-white px-4 py-3 text-left transition hover:border-[#0d7e5e] disabled:opacity-60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-[#0d7e5e]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-cos-text">
                      {selectedEvent?.title ?? "Choose an event…"}
                    </p>
                    <p className="truncate text-[11px] text-cos-muted">
                      {selectedEvent
                        ? formatEventMeta(selectedEvent)
                        : "Optional — for Files & Approvals"}
                    </p>
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-cos-muted" />
              </button>
              {selectedEvent && !readOnly ? (
                <button
                  type="button"
                  onClick={() => applySelectedEvent(null)}
                  className="text-[11px] font-medium text-cos-muted transition hover:text-cos-text"
                >
                  Clear event
                </button>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
                Page Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "letter" as const, label: "Letter (8.5×11)", tall: true },
                    {
                      id: "half" as const,
                      label: "Half (8.5×5.5)",
                      tall: false,
                    },
                  ] as const
                ).map((size) => {
                  const active = printSize === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      disabled={readOnly}
                      onClick={() => setPrintSize(size.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border bg-white p-3 transition-all disabled:opacity-60",
                        active
                          ? "border-2 border-[#0d7e5e]"
                          : "border-cos-border hover:border-[#0d7e5e]",
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-sm border",
                          size.tall ? "h-8 w-6" : "h-5 w-8",
                          active
                            ? "border-[#0d7e5e]/30 bg-[#e6f3ee]/50"
                            : "border-cos-border bg-[#fffcf7]",
                        )}
                      />
                      <span
                        className={cn(
                          "text-[10px] font-bold",
                          !active && "text-cos-muted",
                        )}
                      >
                        {size.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
                AI Prompt / Description
              </label>
              <textarea
                rows={4}
                disabled={readOnly}
                value={aiDirection}
                onChange={(e) => setAiDirection(e.target.value)}
                placeholder="Describe your flyer… e.g. A fun, colorful flyer for a school BBQ."
                className="w-full resize-none rounded-xl border border-cos-border bg-white p-3 text-sm focus:border-[#0d7e5e] focus:outline-none disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
                Inspiration (Optional)
              </label>
              <input
                ref={inspirationInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={readOnly}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !file.type.startsWith("image/")) return;
                  void readFileAsDataUrl(file).then((dataUrl) => {
                    setInspirationPhotoUrl(dataUrl);
                    setInspirationPhotoSource("upload");
                    setInspirationPhotoLabel(file.name);
                  });
                }}
              />
              {inspirationPhotoUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-cos-border bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inspirationPhotoUrl}
                    alt=""
                    className="h-28 w-full object-cover"
                  />
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => {
                        setInspirationPhotoUrl(null);
                        setInspirationPhotoSource(null);
                        setInspirationPhotoLabel(null);
                      }}
                      className="absolute top-2 right-2 rounded-full bg-white/90 p-1 text-cos-muted shadow"
                      aria-label="Remove inspiration"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => inspirationInputRef.current?.click()}
                  className="group w-full cursor-pointer rounded-xl border-2 border-dashed border-cos-border p-4 text-center transition hover:border-[#0d7e5e] disabled:opacity-60"
                >
                  <ImagePlus className="mx-auto mb-2 h-5 w-5 text-cos-muted group-hover:text-[#0d7e5e]" />
                  <p className="text-[10px] font-medium text-cos-muted">
                    Upload image (PNG/JPG)
                  </p>
                </button>
              )}
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setLibraryOpen(true)}
                className="w-full rounded-xl border border-cos-border bg-white py-2 text-[11px] font-bold text-cos-muted transition hover:border-[#0d7e5e] hover:text-[#0d7e5e] disabled:opacity-60"
              >
                Browse Gallery
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
                  Brand Kit
                </label>
                <button
                  type="button"
                  disabled={readOnly || !brandKit}
                  role="switch"
                  aria-checked={brandEnabled}
                  onClick={() => setBrandEnabled((v) => !v)}
                  className={cn(
                    "relative h-5 w-10 rounded-full transition-colors disabled:opacity-50",
                    brandEnabled ? "bg-[#0d7e5e]" : "bg-cos-border",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 h-3 w-3 rounded-full bg-white transition-all",
                      brandEnabled ? "right-1" : "left-1",
                    )}
                  />
                </button>
              </div>
              {brandKit && brandEnabled ? (
                <div className="space-y-2 rounded-xl border border-cos-border bg-white p-3">
                  <p className="text-[11px] font-bold">
                    {brandKit.organizationShortName}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {brandKit.logos.map((logo) => (
                      <button
                        key={logo.id}
                        type="button"
                        disabled={readOnly}
                        onClick={() => setSelectedLogoId(logo.id)}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center overflow-hidden rounded border bg-cos-bg",
                          selectedLogoId === logo.id
                            ? "border-[#0d7e5e] ring-2 ring-[#0d7e5e]/30"
                            : "border-cos-border",
                        )}
                        title={logo.label}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logo.url}
                          alt=""
                          className="h-8 w-8 object-contain"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-cos-muted">
                  {brandKit
                    ? "Turn on to include school logos and colors."
                    : "Add logos in Settings → Branding."}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
                Include QR Code
              </span>
              <button
                type="button"
                disabled={readOnly}
                role="switch"
                aria-checked={qrEnabled}
                onClick={() => setQrEnabled((v) => !v)}
                className={cn(
                  "relative h-5 w-10 rounded-full transition-colors disabled:opacity-50",
                  qrEnabled ? "bg-[#0d7e5e]" : "bg-cos-border",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 h-3 w-3 rounded-full bg-white transition-all",
                    qrEnabled ? "right-1" : "left-1",
                  )}
                />
              </button>
            </div>
          </div>
          <div className="border-t border-cos-border bg-white/50 p-5">
            <button
              type="button"
              disabled={readOnly || isGenerating}
              onClick={() => void runGenerate("generate")}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d7e5e] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#0a6b4f] disabled:opacity-50"
            >
              <span>Generate Flyer</span>
              <WandSparkles className="h-3.5 w-3.5 transition group-hover:rotate-12" />
            </button>
          </div>
        </aside>

        {/* Center canvas */}
        <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#fffcf7]">
          <div
            className="flex flex-1 items-start justify-center overflow-y-auto p-6 sm:p-12 [background-image:radial-gradient(circle_at_1px_1px,rgba(44,40,37,0.1)_1px,transparent_0)] [background-size:24px_24px]"
          >
            {isGenerating ? (
              <div
                className={cn(
                  "relative w-full overflow-hidden border border-cos-border bg-white p-12",
                  isHalf ? "max-w-[720px] aspect-[8.5/5.5]" : "max-w-[600px] aspect-[8.5/11]",
                )}
              >
                <div className="space-y-6">
                  <div className="h-48 animate-pulse rounded-2xl bg-gradient-to-r from-cos-bg via-white to-cos-bg bg-[length:200%_100%]" />
                  <div className="h-10 w-3/4 animate-pulse rounded-lg bg-cos-bg" />
                  <div className="h-5 w-1/2 animate-pulse rounded-lg bg-cos-bg" />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm">
                  <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#0d7e5e]" />
                  <p className="text-sm font-bold text-[#0d7e5e]">
                    AI is designing your flyer...
                  </p>
                </div>
              </div>
            ) : previewImageUrl ? (
              <div
                className={cn(
                  "w-full overflow-hidden border border-cos-border bg-white shadow-sm",
                  isHalf ? "max-w-[720px]" : "max-w-[600px]",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImageUrl}
                  alt={title || "Flyer preview"}
                  className={cn(
                    "w-full object-contain",
                    isHalf ? "aspect-[8.5/5.5]" : "aspect-[8.5/11]",
                  )}
                />
              </div>
            ) : (
              <div className="mt-16 max-w-md text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-cos-bg">
                  <Sparkles className="h-8 w-8 animate-pulse text-cos-border" />
                </div>
                <h3 className="font-display text-2xl font-bold">
                  Ready to create?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-cos-muted">
                  Fill in the details on the left and click Generate Flyer to see
                  your design come to life with AI.
                </p>
                {/* Mobile generate */}
                <button
                  type="button"
                  disabled={readOnly || isGenerating}
                  onClick={() => void runGenerate("generate")}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0d7e5e] px-5 py-2.5 text-sm font-bold text-white md:hidden"
                >
                  Generate Flyer
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right sidebar */}
        <aside className="hidden w-80 shrink-0 flex-col overflow-hidden border-l border-cos-border bg-cos-bg lg:flex">
          <div className="border-b border-cos-border bg-white p-6">
            <h2 className="mb-1 text-[10px] font-bold tracking-[0.15em] text-cos-muted uppercase">
              Refine & Edit
            </h2>
            <p className="text-sm font-bold">Post-Generation Controls</p>
          </div>
          <div className="flex-1 space-y-8 overflow-y-auto p-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
                Edit with AI
              </label>
              <textarea
                rows={3}
                disabled={readOnly || !previewImageUrl}
                value={editDirection}
                onChange={(e) => setEditDirection(e.target.value)}
                placeholder="e.g. Make the title bigger or change colors to blue and gold"
                className="w-full resize-none rounded-xl border border-cos-border bg-white p-3 text-xs shadow-sm focus:border-[#0d7e5e] focus:outline-none disabled:opacity-60"
              />
              <div className="flex flex-wrap gap-2">
                {EDIT_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={readOnly || !previewImageUrl}
                    onClick={() =>
                      setEditDirection((prev) =>
                        prev.trim() ? `${prev.trim()} ${chip}` : chip,
                      )
                    }
                    className="rounded-md border border-cos-border bg-white px-2 py-1 text-[10px] text-cos-muted transition hover:border-[#0d7e5e] hover:text-[#0d7e5e] disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={
                  readOnly ||
                  !previewImageUrl ||
                  !editDirection.trim() ||
                  isGenerating
                }
                onClick={() => void runGenerate("update")}
                className="w-full rounded-xl bg-[#0d7e5e] py-2.5 text-xs font-bold text-white transition hover:bg-[#0a6b4f] disabled:opacity-50"
              >
                Update
              </button>
            </div>

            {versions.length > 0 ? (
              <div className="space-y-3 border-t border-cos-border pt-6">
                <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
                  Versions
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {versions.map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => {
                        setActiveVersionId(version.id);
                        setPreviewImageUrl(version.imageUrl);
                      }}
                      className={cn(
                        "aspect-[3/4] overflow-hidden rounded-lg border",
                        activeVersionId === version.id
                          ? "border-2 border-[#0d7e5e]"
                          : "border-cos-border opacity-70 hover:opacity-100",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={version.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {qrEnabled ? (
              <div className="space-y-3 border-t border-cos-border pt-6">
                <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
                  QR destination URL
                </label>
                <input
                  type="url"
                  disabled={readOnly}
                  value={qrUrl}
                  onChange={(e) => setQrUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-lg border border-cos-border bg-white px-3 py-2 text-xs focus:border-[#0d7e5e] focus:outline-none disabled:opacity-60"
                />
              </div>
            ) : null}

            <div className="space-y-3 border-t border-cos-border pt-6">
              <label className="text-[10px] font-bold tracking-widest text-cos-muted uppercase">
                Export & Actions
              </label>
              <button
                type="button"
                disabled={!previewImageUrl}
                onClick={() => {
                  if (!previewImageUrl) return;
                  void downloadPng(
                    previewImageUrl,
                    `${(title || "flyer").replace(/\s+/g, "-").toLowerCase()}.png`,
                  );
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-cos-border bg-white py-3 text-xs font-bold transition hover:bg-cos-bg disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> Download PNG
              </button>
              <button
                type="button"
                disabled={!previewImageUrl}
                onClick={() => previewImageUrl && printImage(previewImageUrl)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-cos-border bg-white py-3 text-xs font-bold transition hover:bg-cos-bg disabled:opacity-50"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              {eventId && previewImageUrl ? (
                <button
                  type="button"
                  disabled={isPending || isGenerating}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      try {
                        const response = await fetch("/api/flyer-composer/save", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            eventId,
                            imageUrl: previewImageUrl,
                            headline: title.trim() || null,
                            title: title.trim() || null,
                            versionId: activeVersionId,
                          }),
                        });
                        const data = (await response.json()) as {
                          success?: boolean;
                          message?: string;
                          error?: string;
                          filesHref?: string | null;
                        };
                        if (!response.ok || !data.success) {
                          setError(
                            data.error ||
                              data.message ||
                              "Couldn’t save to Files.",
                          );
                          return;
                        }
                        setSendMessage(
                          data.message ||
                            (data.filesHref
                              ? "Saved to the event’s Files tab."
                              : "Saved to Files."),
                        );
                      } catch {
                        setError("Couldn’t save to Files. Try again.");
                      }
                    });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-cos-border bg-white py-3 text-xs font-bold transition hover:bg-cos-bg disabled:opacity-50"
                >
                  Save to Files
                </button>
              ) : null}
            </div>
          </div>
          {flyer.changeRequestNote ? (
            <div className="border-t border-cos-border bg-white p-6">
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-amber-600 transition hover:bg-amber-50"
              >
                <MessageSquare className="h-3.5 w-3.5" /> View Approval Notes
              </button>
            </div>
          ) : null}
        </aside>
      </main>

      <BackgroundLibraryPicker
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(asset) => {
          setLibraryOpen(false);
          setInspirationPhotoUrl(asset.publicUrl);
          setInspirationPhotoSource("library");
          setInspirationPhotoLabel(asset.title || "Gallery image");
        }}
      />

      <EventPickerModal
        open={eventPickerOpen}
        events={events}
        selectedEventId={eventId}
        multiSelect={false}
        title="Link an event"
        description="Choose an event you've already created — name, date, time, and location are included when you generate."
        onClose={() => setEventPickerOpen(false)}
        onSelect={(event) => {
          applySelectedEvent(event);
          setEventPickerOpen(false);
        }}
      />
    </div>
  );
}
