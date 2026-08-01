"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { DM_Sans, Fraunces } from "next/font/google";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { WarmBreathFrame } from "@/components/motion/WarmBreathFrame";

const smcSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--smc-sans",
});
const smcSerif = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--smc-serif",
});
import {
  sendForApprovalAction,
  syncAppliedMilestoneArtworkAction,
} from "@/lib/campaign-builder-v2/actions";
import { brandKitIdForAi } from "@/lib/campaign-builder-v2/brand-kit";
import {
  getSharedCaptionText,
  syncCaptionsToPlatforms,
} from "@/lib/campaign-builder-v2/caption-utils";
import {
  allMilestonesGenerated,
  canResendMilestoneForApproval,
  captionPlatformsForFormats,
  countCompleteMilestones,
  derivedPreviewStatus,
  describeApprovalSubmitBlockers,
  isMilestoneEligibleForApprovalSubmit,
  listMilestoneContentGaps,
  preserveApprovalWorkflowStatus,
  previewAfterResendForApproval,
  resolveMilestoneGenerationStatus,
} from "@/lib/campaign-builder-v2/milestone-status";
import { isPublishNowDelivery } from "@/lib/campaign-builder-v2/delivery-method";
import {
  PLATFORM_FORMAT_OPTIONS,
  isPlaceholderArtworkUrl,
} from "@/lib/campaign-builder-v2/platform-utils";
import type { SetupLogoOption } from "@/lib/artwork-v2/setup-logos";
import type {
  CampaignBuilderMilestone,
  MilestoneArtwork,
  MilestoneGenerationStatus,
  MilestonePreviewContent,
  PlatformFormat,
} from "@/lib/campaign-builder-v2/types";
import "./social-composer.css";
import { SocialComposerEventPicker } from "./SocialComposerEventPicker";

const EditMilestoneModal = dynamic(
  () =>
    import("@/components/campaign-builder-v2/EditMilestoneModal").then(
      (module) => ({
        default: module.EditMilestoneModal,
      }),
    ),
  { ssr: false },
);

const FALLBACK_GRADIENTS = [
  "linear-gradient(145deg, #2f4a3c 0%, #6b8171 50%, #d4a84b 100%)",
  "linear-gradient(145deg, #0b2f5b 0%, #2f9fb3 55%, #7fd0df 100%)",
  "linear-gradient(145deg, #c4922e 0%, #e0b65a 45%, #f5e6c2 100%)",
  "linear-gradient(145deg, #2f4a3c 0%, #0b2f5b 50%, #d4a84b 100%)",
  "linear-gradient(145deg, #6b8171 0%, #b8c9bc 100%)",
];

function gradientForIndex(index: number): string {
  const safeIndex = index < 0 ? 0 : index;
  return FALLBACK_GRADIENTS[safeIndex % FALLBACK_GRADIENTS.length];
}

function handleize(label: string | null | undefined): string {
  const trimmed = (label ?? "").trim();
  return trimmed ? trimmed.toLowerCase().replace(/\s+/g, "") : "yourcampaign";
}

function monthDay(dateStr: string | null | undefined): { mo: string; dy: string } {
  if (!dateStr) {
    return { mo: "—", dy: "—" };
  }
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { mo: "—", dy: "—" };
  }
  return {
    mo: date.toLocaleDateString("en-US", { month: "short" }),
    dy: String(date.getDate()),
  };
}

function formatLongDate(dateStr: string | null | undefined): string {
  if (!dateStr) {
    return "—";
  }
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) {
    return "—";
  }
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(timeStr: string | null | undefined): string {
  if (!timeStr) {
    return "";
  }
  const [hoursRaw, minutesRaw] = timeStr.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw ?? "0");
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return timeStr;
  }
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = ((hours + 11) % 12) + 1;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatScheduleLabel(dateStr: string, timeStr: string): string {
  const datePart = formatShortDate(dateStr);
  const timePart = formatTimeLabel(timeStr);
  return timePart ? `${datePart} · ${timePart}` : datePart;
}

function formatsSummaryFromPlatforms(formats: PlatformFormat[]): string {
  if (!formats || formats.length === 0) {
    return "—";
  }
  const views = new Set<string>();
  for (const format of formats) {
    views.add(format.includes("story") ? "Story" : "Feed");
  }
  return Array.from(views).join(" · ");
}

const FORMAT_OPTION_DESC: Partial<Record<PlatformFormat, string>> = {
  "facebook-feed": "Square · Facebook",
  "facebook-story": "Vertical · Facebook",
  "instagram-feed": "Square · Instagram",
  "instagram-story": "Vertical · Meta story",
  "instagram-story-manual":
    "Email kit at send time — add music, stickers, link stickers yourself",
};

function fmtSummaryHeadline(formats: PlatformFormat[]): string {
  if (formats.length === 0) {
    return "No formats selected";
  }
  const labels = formats.map(
    (id) => PLATFORM_FORMAT_OPTIONS.find((option) => option.id === id)?.label ?? id,
  );
  if (labels.length <= 2) {
    return labels.join(", ");
  }
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

function statusPill(status: MilestoneGenerationStatus): { cls: string; label: string } {
  switch (status) {
    case "generated":
      return { cls: "pill-ready", label: "Ready" };
    case "approved":
      return { cls: "pill-ready", label: "Approved" };
    case "scheduled":
      return { cls: "pill-ready", label: "Scheduled" };
    case "published":
      return { cls: "pill-ready", label: "Published" };
    case "changes_requested":
      return { cls: "pill-changes", label: "Changes requested" };
    case "awaiting_approval":
      return { cls: "pill-gen", label: "In review" };
    case "needs_review":
      return { cls: "pill-draft", label: "Needs review" };
    case "generating":
      return { cls: "pill-gen", label: "Generating…" };
    case "queued":
      return { cls: "pill-gen", label: "Queued" };
    case "failed":
      return { cls: "pill-changes", label: "Failed" };
    case "ready_to_generate":
    default:
      return { cls: "pill-gen", label: "To generate" };
  }
}

type PreviewSettingsHighlight =
  | "formats"
  | "caption"
  | "schedule"
  | "manual"
  | null;

/** Delivery gaps that block a calm Save → Review handoff (not approval submit). */
function listPreviewDeliveryGaps(preview: MilestonePreviewContent): string[] {
  const gaps: string[] = [];
  if (!isPublishNowDelivery(preview.deliveryMethod)) {
    if (!preview.scheduleDate.trim()) {
      gaps.push("publish date");
    } else if (!preview.scheduleTime.trim()) {
      gaps.push("publish time");
    }
  }
  if (preview.enabledFormats.includes("instagram-story-manual")) {
    if (!preview.manualEmailTo.trim()) {
      gaps.push("kit email");
    } else if (!preview.emailSendDate.trim()) {
      gaps.push("email send date");
    }
  }
  return gaps;
}

function listPreviewHandoffGaps(preview: MilestonePreviewContent | null): string[] {
  if (!preview) {
    return ["artwork & caption"];
  }
  return [
    ...listMilestoneContentGaps(preview),
    ...listPreviewDeliveryGaps(preview),
  ];
}

function highlightForGap(gap: string): PreviewSettingsHighlight {
  if (gap.includes("format")) return "formats";
  if (gap.includes("caption")) return null; // opens Edit modal
  if (gap.includes("image") || gap.includes("artwork")) return null;
  if (gap.includes("publish") || gap.includes("schedule")) return "schedule";
  if (gap.includes("email") || gap.includes("kit")) return "manual";
  return "formats";
}

function previewListMeta(
  preview: MilestonePreviewContent | null,
  fallbackFormats: PlatformFormat[],
): { cls: string; label: string; hint: string | null } {
  const status = resolveMilestoneGenerationStatus(preview, fallbackFormats);
  if (status === "generating" || status === "queued") {
    return { cls: "pill-gen", label: "Generating…", hint: null };
  }
  if (status === "failed") {
    return { cls: "pill-changes", label: "Needs work", hint: "Generation failed" };
  }
  if (status === "changes_requested") {
    return { cls: "pill-changes", label: "Needs work", hint: "Changes requested" };
  }
  if (
    status === "awaiting_approval" ||
    status === "approved" ||
    status === "scheduled" ||
    status === "published" ||
    status === "generated"
  ) {
    const deliveryGaps = preview ? listPreviewDeliveryGaps(preview) : [];
    if (deliveryGaps.length > 0) {
      return {
        cls: "pill-draft",
        label: "Needs work",
        hint: `Missing ${deliveryGaps[0]}`,
      };
    }
    return { cls: "pill-ready", label: "Ready", hint: null };
  }

  const gaps = listPreviewHandoffGaps(preview);
  if (gaps.length === 0) {
    return { cls: "pill-ready", label: "Ready", hint: null };
  }

  const derived = preview ? derivedPreviewStatus(preview) : "draft";
  if (derived === "draft" && status === "ready_to_generate") {
    return {
      cls: "pill-draft",
      label: "Draft",
      hint: `Missing ${gaps[0]}`,
    };
  }
  return {
    cls: "pill-draft",
    label: "Needs work",
    hint: `Missing ${gaps[0]}`,
  };
}

export function SocialMediaComposer({
  eventTitle: _eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const { currentStep, goToStep } = useCampaignBuilder();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  const activeNav: "setup" | "milestones" | "preview" | "review" =
    currentStep === "milestones"
      ? "milestones"
      : currentStep === "preview"
        ? "preview"
        : currentStep === "review" || currentStep === "published"
          ? "review"
          : "setup";

  const focusCanvas =
    activeNav === "preview" || activeNav === "review";

  return (
    <div
      className={`smc ${smcSans.variable} ${smcSerif.variable} ${smcSans.className}${focusCanvas ? " focus-canvas" : ""}`}
      style={
        {
          ["--sans" as string]: "var(--smc-sans), system-ui, sans-serif",
          ["--serif" as string]: "var(--smc-serif), Georgia, serif",
        } as React.CSSProperties
      }
    >
      <div className="app">
        <div className="main-col">
          <div className="content">
            <Link href="/create-with-ai" className="back">
              ← Create with AI
            </Link>
            <h1 className="serif">Social Media Composer</h1>
            <p className="lede">
              Same studio feel as Homepage &amp; Newsletter — logos from Setup,
              drag-and-drop inspiration, communication plans that map posts, then
              edit &amp; re-approve after generate.
            </p>

            <div className="layout">
              <nav className="steps" aria-label="Composer steps">
                <p className="steps-heading">Steps</p>
                <button
                  type="button"
                  className={`step-btn${activeNav === "setup" ? " active" : ""}`}
                  onClick={() => goToStep("inspiration")}
                >
                  <span className="label">1 · Setup</span>
                  <span className="hint">Logos, inspiration &amp; communication plan</span>
                </button>
                <button
                  type="button"
                  className={`step-btn${activeNav === "milestones" ? " active" : ""}`}
                  onClick={() => goToStep("milestones")}
                >
                  <span className="label">2 · Posts</span>
                  <span className="hint">Reorder, dates &amp; notes</span>
                </button>
                <button
                  type="button"
                  className={`step-btn${activeNav === "preview" ? " active" : ""}`}
                  onClick={() => goToStep("preview")}
                >
                  <span className="label">3 · Preview</span>
                  <span className="hint">Edit posts &amp; how they go out</span>
                </button>
                <button
                  type="button"
                  className={`step-btn${activeNav === "review" ? " active" : ""}`}
                  onClick={() => goToStep("review")}
                >
                  <span className="label">4 · Review</span>
                  <span className="hint">Approve &amp; send</span>
                </button>
              </nav>

              <div className="panel">
                {currentStep === "milestones" ? (
                  <MilestonesPanel onToast={showToast} />
                ) : currentStep === "preview" ? (
                  <PreviewPanel onToast={showToast} />
                ) : currentStep === "review" ? (
                  <ReviewPanel onToast={showToast} />
                ) : currentStep === "published" ? (
                  <PublishedPanel />
                ) : (
                  <SetupPanel onToast={showToast} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}

function SetupPanel({
  onToast,
}: {
  onToast: (message: string) => void;
}) {
  const {
    session,
    updateInspiration,
    setPlaybookId,
    selectCampaign,
    addInspirationImage,
    removeInspirationImage,
    saveCreativeSetupAndContinue,
    playbookOptions,
    campaignOptions,
    logoOptions,
    isSaving,
  } = useCampaignBuilder();

  const { inspiration } = session;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbookError, setPlaybookError] = useState<string | null>(null);
  const [inspDragOver, setInspDragOver] = useState(false);

  function addInspirationFiles(fileList: FileList | File[] | null | undefined) {
    const files = Array.from(fileList ?? []);
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        addInspirationImage(file);
      }
    }
  }

  const selectedLogo = logoOptions.find((logo) => logo.id === inspiration.selectedLogoId) ?? null;
  const campaignTitle =
    inspiration.campaignName.trim() ||
    campaignOptions.find((option) => option.id === session.eventId)?.title ||
    "Your event";
  const sortedMilestones = useMemo(
    () => [...session.milestones].sort((a, b) => a.sortOrder - b.sortOrder),
    [session.milestones],
  );
  const handle = handleize(campaignTitle);
  const colors = [
    inspiration.primarySchoolColor,
    inspiration.secondarySchoolColor,
    ...(inspiration.customPaletteColors ?? []),
  ].filter((color): color is string => Boolean(color));

  async function handleSave() {
    setError(null);
    setIsContinuing(true);
    try {
      const result = await saveCreativeSetupAndContinue();
      if (!result.success) {
        setError(result.message ?? "Could not save creative setup.");
      } else {
        onToast("Creative setup saved");
      }
    } finally {
      setIsContinuing(false);
    }
  }

  async function handlePlaybookChange(nextId: string) {
    setPlaybookError(null);
    const result = await setPlaybookId(nextId);
    if (!result.success) {
      setPlaybookError(result.message ?? "Could not update communication plan posts.");
    } else {
      onToast("Communication Plan mapped");
    }
  }

  function selectLogo(logo: SetupLogoOption | null) {
    if (!logo) {
      updateInspiration({
        selectedLogoId: null,
        includeLogoInArtwork: false,
        includeLogoInArtworkUserSet: true,
        uploadedLogoUrl: null,
        uploadedLogoLabel: null,
      });
    } else {
      updateInspiration({
        selectedLogoId: logo.id,
        includeLogoInArtwork: true,
        includeLogoInArtworkUserSet: true,
        uploadedLogoUrl: null,
        uploadedLogoLabel: null,
      });
    }
    onToast("Logo from Setup applied");
  }

  return (
    <section>
      <div className="panel-head">
        <div>
          <h2>Creative Setup</h2>
          <p>
            Brand logos from Setup, drag inspiration into order, pick a
            communication plan that maps your post plan.
          </p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSave()}
            disabled={isContinuing || isSaving}
          >
            {isContinuing ? "Saving…" : "Save → Posts"}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-changes">{error}</div> : null}

      <div className="split">
        <div>
          <div className="box">
            <h3>Campaign</h3>
            <p className="desc">
              Tied to your event — same spirit as Newsletter issue header.
            </p>
            <div className="grid-2">
              <div>
                <label className="field-label" htmlFor="social-composer-event-search">
                  Event
                </label>
                <SocialComposerEventPicker
                  selectedEventId={session.eventId}
                  campaignOptions={campaignOptions}
                  onSelect={selectCampaign}
                />
              </div>
              <div>
                <label className="field-label">Campaign date</label>
                <input
                  className="field"
                  value={formatLongDate(inspiration.eventDate)}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="box">
            <h3>Brand logos</h3>
            <p className="desc">
              Pulled from <strong>Setup → Brand</strong>. Same
              logos Homepage &amp; Social share.
            </p>
            <div className="logo-grid">
              {logoOptions.map((logo) => (
                <button
                  key={logo.id}
                  type="button"
                  className={`logo-card${inspiration.selectedLogoId === logo.id ? " selected" : ""}`}
                  onClick={() => selectLogo(logo)}
                >
                  <div className="preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo.url} alt={logo.label} />
                  </div>
                  <div className="name">{logo.label}</div>
                  <div className="src">From Setup</div>
                </button>
              ))}
              <button
                type="button"
                className={`logo-card${!inspiration.selectedLogoId ? " selected" : ""}`}
                onClick={() => selectLogo(null)}
              >
                <div className="preview none">None</div>
                <div className="name">No logo</div>
                <div className="src">Artwork only</div>
              </button>
            </div>
            {logoOptions.length === 0 ? (
              <p className="desc" style={{ marginTop: 10, marginBottom: 0 }}>
                No organization logos yet — add them in your brand kit.
              </p>
            ) : null}
          </div>

          <div className="box">
            <h3>Inspiration</h3>
            <p className="desc">
              Upload images to guide the look &amp; feel of generated artwork.
            </p>
            <div className="dnd-hint">✦ Drag images here or click + to upload</div>
            <label className="field-label">Inspiration images</label>
            <div
              className={`insp-drop${inspDragOver ? " drag-over" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setInspDragOver(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = "copy";
                setInspDragOver(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const next = event.relatedTarget as Node | null;
                if (next && event.currentTarget.contains(next)) {
                  return;
                }
                setInspDragOver(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setInspDragOver(false);
                addInspirationFiles(event.dataTransfer.files);
              }}
            >
              {inspiration.inspirationImages.map((image) => (
                <div
                  key={image.id}
                  className="insp-tile"
                  style={{
                    backgroundImage: `url(${image.previewUrl || image.url || ""})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => removeInspirationImage(image.id)}
                    aria-label={`Remove ${image.label}`}
                    style={{
                      position: "absolute",
                      right: 6,
                      top: 6,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(28,36,48,.72)",
                      color: "#fff",
                      fontSize: 11,
                      lineHeight: "20px",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="insp-tile"
                aria-label="Add inspiration image"
                style={{
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(107,129,113,.08)",
                  border: "1.5px dashed rgba(107,129,113,.45)",
                  color: "var(--sage)",
                  fontSize: 20,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                +
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                addInspirationFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          <div className="box">
            <h3>Communication Plan</h3>
            <p className="desc">
              Choosing a communication plan <strong>maps real posts</strong> into
              your campaign plan — not just a label.
            </p>
            <label className="field-label">Communication Plan</label>
            <select
              className="field"
              value={inspiration.playbookId}
              onChange={(event) => void handlePlaybookChange(event.target.value)}
            >
              {playbookOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {playbookError ? (
              <p className="desc" style={{ color: "var(--danger)" }}>
                {playbookError}
              </p>
            ) : null}
            {sortedMilestones.length > 0 ? (
              <div className="playbook-map">
                <h4>Maps to {sortedMilestones.length} posts</h4>
                {sortedMilestones.map((milestone) => {
                  const { mo, dy } = monthDay(milestone.suggestedDate);
                  return (
                    <div key={milestone.id} className="map-row">
                      <span className="map-chip">
                        {mo} {dy}
                      </span>
                      <span className="map-arrow">→</span>
                      <strong>{milestone.name}</strong>
                      <span style={{ marginLeft: "auto", color: "var(--muted)" }}>
                        {formatsSummaryFromPlatforms(milestone.platformFormats)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="box">
            <h3>Brand colors &amp; voice</h3>
            <p className="desc">Brand colors + a short voice note for captions.</p>
            <div className="color-row" style={{ marginBottom: 14 }}>
              {colors.length > 0 ? (
                colors.map((color, index) => (
                  <div
                    key={`${color}-${index}`}
                    className="swatch"
                    style={{ background: color }}
                  />
                ))
              ) : (
                <p className="desc" style={{ margin: 0 }}>
                  No colors selected yet.
                </p>
              )}
            </div>
            <label className="field-label">Caption voice</label>
            <textarea
              className="field"
              rows={3}
              value={inspiration.voiceTone}
              onChange={(event) => updateInspiration({ voiceTone: event.target.value })}
              placeholder="Warm, clear, short. Celebrate people and the event…"
            />
          </div>
        </div>

        <aside className="live-pane">
          <div className="live-label">Live vibe preview</div>
          <div className="live-well">
            <div className="phone">
              <div className="phone-notch" />
              <div className="phone-screen">
                <div className="ig-bar">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="ig-avatar" />
                    {handle}
                  </div>
                  ···
                </div>
                <div
                  className="feed-art"
                  style={
                    inspiration.inspirationImages[0]?.previewUrl ||
                    inspiration.inspirationImages[0]?.url
                      ? {
                          backgroundImage: `url(${
                            inspiration.inspirationImages[0].previewUrl ||
                            inspiration.inspirationImages[0].url
                          })`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  <span className="badge">Feed</span>
                  {selectedLogo ? (
                    <div className="logo-chip">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedLogo.url}
                        alt=""
                        style={{ width: "70%", height: "70%", objectFit: "contain" }}
                      />
                    </div>
                  ) : null}
                  <div className="title">{campaignTitle}</div>
                </div>
                <div className="ig-meta">
                  <div className="likes">♡ 128 likes</div>
                  <div className="cap">
                    <strong>{handle}</strong>{" "}
                    {inspiration.voiceTone || "Save the date — details coming soon."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function MilestonesPanel({ onToast }: { onToast: (message: string) => void }) {
  const { session, addMilestone, reorderMilestones, updateMilestone, goToStep } =
    useCampaignBuilder();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const milestones = useMemo(
    () => [...session.milestones].sort((a, b) => a.sortOrder - b.sortOrder),
    [session.milestones],
  );
  const previewById = useMemo(
    () => new Map(session.previewContents.map((content) => [content.milestoneId, content])),
    [session.previewContents],
  );

  function handleDrop(targetId: string) {
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) {
      return;
    }
    const fromIndex = milestones.findIndex((m) => m.id === sourceId);
    const toIndex = milestones.findIndex((m) => m.id === targetId);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }
    reorderMilestones(fromIndex, toIndex);
    onToast("Posts reordered");
  }

  return (
    <section>
      <div className="panel-head">
        <div>
          <h2>Posts</h2>
          <p>Drag to reorder. Click a row to expand &amp; edit — collapse when you’re done.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={() => goToStep("inspiration")}>
            ← Setup
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => goToStep("preview")}
            disabled={milestones.length === 0}
          >
            Save → Preview
          </button>
        </div>
      </div>

      <div className="box">
        <div className="dnd-hint">⠿ Drag cards to reorder</div>
        <div className="ms-list">
          {milestones.map((milestone) => {
            const preview = previewById.get(milestone.id) ?? null;
            const status = resolveMilestoneGenerationStatus(preview, milestone.platformFormats);
            const pill = statusPill(status);
            const { mo, dy } = monthDay(milestone.suggestedDate);
            const isOpen = expandedId === milestone.id;
            return (
              <div
                key={milestone.id}
                className={`ms-card${isOpen ? " open" : ""}${dragOverId === milestone.id ? " drag-over" : ""}`}
                draggable
                onDragStart={() => {
                  dragIdRef.current = milestone.id;
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverId(milestone.id);
                }}
                onDragLeave={() =>
                  setDragOverId((current) => (current === milestone.id ? null : current))
                }
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(milestone.id);
                }}
                onDragEnd={() => {
                  dragIdRef.current = null;
                  setDragOverId(null);
                }}
              >
                <button
                  type="button"
                  className="ms-head"
                  onClick={() => setExpandedId(isOpen ? null : milestone.id)}
                >
                  <span className="ms-grip" title="Drag to reorder">
                    ⠿
                  </span>
                  <div className="m-date">
                    <div className="mo">{mo}</div>
                    <div className="dy">{dy}</div>
                  </div>
                  <div>
                    <p className="m-title">{milestone.name}</p>
                    <p className="m-meta">{formatsSummaryFromPlatforms(milestone.platformFormats)}</p>
                  </div>
                  <span className={`pill ${pill.cls}`}>{pill.label}</span>
                  <span className="chev">▼</span>
                </button>
                {isOpen ? (
                  <MilestoneEditBody
                    key={milestone.id}
                    milestone={milestone}
                    onSave={(patch) => {
                      updateMilestone(milestone.id, patch);
                      setExpandedId(null);
                      onToast("Post saved");
                    }}
                    onCollapse={() => setExpandedId(null)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: 10 }}
          onClick={() => {
            addMilestone();
            onToast("Post added");
          }}
        >
          + Add post
        </button>
      </div>
    </section>
  );
}

function MilestoneEditBody({
  milestone,
  onSave,
  onCollapse,
}: {
  milestone: CampaignBuilderMilestone;
  onSave: (patch: Partial<CampaignBuilderMilestone>) => void;
  onCollapse: () => void;
}) {
  const [title, setTitle] = useState(milestone.name);
  const [date, setDate] = useState(milestone.suggestedDate);
  const [notes, setNotes] = useState(milestone.purpose || milestone.artworkNotes || "");
  const formatsLabel = formatsSummaryFromPlatforms(milestone.platformFormats);

  return (
    <div className="ms-body">
      <div className="grid-2">
        <div>
          <label className="field-label">Title</label>
          <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div>
          <label className="field-label">Date</label>
          <input
            className="field"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <label className="field-label">Formats</label>
        <input className="field" value={formatsLabel} readOnly />
      </div>
      <div style={{ marginTop: 10 }}>
        <label className="field-label">Notes</label>
        <textarea
          className="field"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      <div className="actions" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() =>
            onSave({
              name: title,
              suggestedDate: date,
              purpose: notes,
              artworkNotes: notes,
            })
          }
        >
          Save post
        </button>
        <button type="button" className="btn btn-sm btn-secondary" onClick={onCollapse}>
          Collapse
        </button>
      </div>
    </div>
  );
}

function PreviewPanel({ onToast }: { onToast: (message: string) => void }) {
  const {
    session,
    goToStep,
    setSelectedMilestoneId,
    updatePreviewContent,
    generateMilestoneContent,
    generatingMilestoneId,
  } = useCampaignBuilder();
  const router = useRouter();

  const [mode, setMode] = useState<"feed" | "story">("feed");
  const [fmtOpen, setFmtOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [settingsHighlight, setSettingsHighlight] =
    useState<PreviewSettingsHighlight>(null);
  const [lightbox, setLightbox] = useState<{
    title: string;
    imageUrl: string | null;
    gradient: string;
    view: "feed" | "story";
  } | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editInitialTab, setEditInitialTab] = useState<"artwork" | "captions">(
    "artwork",
  );

  function openEdit(tab: "artwork" | "captions" = "artwork") {
    setEditInitialTab(tab);
    setEditModalOpen(true);
  }
  const [isResending, setIsResending] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const milestones = useMemo(
    () => [...session.milestones].sort((a, b) => a.sortOrder - b.sortOrder),
    [session.milestones],
  );
  const selectedId = session.selectedMilestoneId ?? milestones[0]?.id ?? null;
  const selectedIndex = milestones.findIndex((m) => m.id === selectedId);
  const selectedMilestone = milestones.find((m) => m.id === selectedId) ?? null;
  const selectedPreview =
    session.previewContents.find((c) => c.milestoneId === selectedId) ?? null;

  const status = resolveMilestoneGenerationStatus(
    selectedPreview,
    selectedMilestone?.platformFormats,
  );
  const isChangesRequested = status === "changes_requested";
  const canResend = selectedPreview ? canResendMilestoneForApproval(selectedPreview) : false;
  const isGenerating = generatingMilestoneId === selectedId || status === "generating";

  const gradient = gradientForIndex(selectedIndex);
  const feedUrl =
    selectedPreview?.artwork.feedUrl && !isPlaceholderArtworkUrl(selectedPreview.artwork.feedUrl)
      ? selectedPreview.artwork.feedUrl
      : null;
  const storyUrl =
    selectedPreview?.artwork.storyUrl && !isPlaceholderArtworkUrl(selectedPreview.artwork.storyUrl)
      ? selectedPreview.artwork.storyUrl
      : null;

  const sharedCaption = selectedPreview ? getSharedCaptionText(selectedPreview.captions) : "";
  const enabledFormats = selectedPreview?.enabledFormats ?? [];
  const publishNowSelected = selectedPreview
    ? isPublishNowDelivery(selectedPreview.deliveryMethod)
    : true;
  const hasManual = enabledFormats.includes("instagram-story-manual");
  const handle = handleize(session.inspiration.campaignName);
  const progress = useMemo(() => {
    let complete = 0;
    for (const milestone of milestones) {
      const preview =
        session.previewContents.find((c) => c.milestoneId === milestone.id) ?? null;
      if (listPreviewHandoffGaps(preview).length === 0) {
        complete += 1;
      }
    }
    return { complete, total: milestones.length };
  }, [milestones, session.previewContents]);
  const hasGeneratedArt = Boolean(feedUrl || storyUrl);

  async function handleGenerate() {
    if (!selectedId) {
      return;
    }
    setGenerateError(null);
    const result = await generateMilestoneContent(selectedId);
    if (!result.success) {
      setGenerateError(result.message);
    } else {
      onToast("Artwork generated");
    }
  }

  function handleSaveToReview() {
    for (const milestone of milestones) {
      const preview =
        session.previewContents.find((c) => c.milestoneId === milestone.id) ?? null;
      const gaps = listPreviewHandoffGaps(preview);
      if (gaps.length === 0) {
        continue;
      }
      setSelectedMilestoneId(milestone.id);
      const highlight = highlightForGap(gaps[0]);
      setSettingsHighlight(highlight);
      if (gaps[0].includes("image") || gaps[0].includes("artwork")) {
        openEdit("artwork");
      } else if (gaps[0].includes("caption")) {
        openEdit("captions");
      }
      if (highlight === "manual") {
        setManualOpen(true);
        setFmtOpen(true);
      } else if (highlight === "formats") {
        setFmtOpen(true);
      }
      onToast(`${milestone.name}: missing ${gaps[0]}`);
      return;
    }
    setSettingsHighlight(null);
    goToStep("review");
  }

  async function resend(artwork?: MilestoneArtwork) {
    if (!selectedPreview || !selectedMilestone) {
      throw new Error("Select a post before resending for approval.");
    }
    setIsResending(true);
    try {
      const artworkToSubmit = artwork ?? selectedPreview.artwork;
      if (artwork) {
        updatePreviewContent(selectedPreview.milestoneId, { artwork: artworkToSubmit });
        const syncResult = await syncAppliedMilestoneArtworkAction({
          eventId: session.eventId,
          milestones: session.milestones,
          milestoneId: selectedPreview.milestoneId,
          artwork: artworkToSubmit,
        });
        if (!syncResult.success) {
          throw new Error(syncResult.message);
        }
      }
      const previewForSubmit = { ...selectedPreview, artwork: artworkToSubmit };
      const result = await sendForApprovalAction({
        eventId: session.eventId,
        campaignName: session.inspiration.campaignName,
        milestones: [selectedMilestone],
        previewContents: [previewForSubmit],
      });
      if (!result.success) {
        throw new Error(result.message);
      }
      updatePreviewContent(selectedPreview.milestoneId, {
        artwork: artworkToSubmit,
        ...previewAfterResendForApproval(previewForSubmit),
      });
      setEditModalOpen(false);
      onToast(result.message || "Sent for re-approval");
      router.refresh();
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Unable to resend for approval.");
      throw error;
    } finally {
      setIsResending(false);
    }
  }

  async function handleApplyArtwork(artwork: MilestoneArtwork) {
    if (!selectedPreview) {
      return;
    }
    const currentStatus = resolveMilestoneGenerationStatus(
      selectedPreview,
      selectedMilestone?.platformFormats,
    );
    updatePreviewContent(selectedPreview.milestoneId, {
      artwork,
      status: "needs-review",
      generationStatus: preserveApprovalWorkflowStatus(currentStatus, "needs_review"),
    });
    setEditModalOpen(false);
    try {
      await syncAppliedMilestoneArtworkAction({
        eventId: session.eventId,
        milestones: session.milestones,
        milestoneId: selectedPreview.milestoneId,
        artwork,
      });
      router.refresh();
    } catch {
      // Best-effort sync — local state already updated.
    }
  }

  function openLightbox(view: "feed" | "story") {
    const imageUrl = view === "feed" ? feedUrl : storyUrl;
    setLightbox({
      title: selectedMilestone?.name ?? "Artwork",
      imageUrl,
      gradient,
      view,
    });
  }

  function handleDownload(imageUrl: string | null, label: string) {
    if (!imageUrl) {
      onToast("No artwork to download yet");
      return;
    }
    window.open(imageUrl, "_blank", "noopener,noreferrer");
    onToast(`Opening ${label} artwork…`);
  }

  function toggleFormat(format: PlatformFormat) {
    if (!selectedPreview) {
      return;
    }
    const next = enabledFormats.includes(format)
      ? enabledFormats.filter((f) => f !== format)
      : [...enabledFormats, format];
    updatePreviewContent(selectedPreview.milestoneId, { enabledFormats: next });
  }

  function handleCaptionChange(text: string) {
    if (!selectedPreview) {
      return;
    }
    const fromFormats = captionPlatformsForFormats(enabledFormats);
    const milestonePlatforms = selectedMilestone?.platforms ?? [];
    const platforms =
      fromFormats.length > 0
        ? fromFormats
        : milestonePlatforms.length > 0
          ? milestonePlatforms
          : (["facebook", "instagram"] as const);
    const captions = syncCaptionsToPlatforms(text, [...platforms]);
    updatePreviewContent(selectedPreview.milestoneId, { captions });
  }

  return (
    <section>
      <div className="panel-head">
        <div>
          <h2>
            {progress.complete} of {progress.total} posts ready
          </h2>
          <p>
            Phone shows the live post. Edit artwork &amp; caption together, then
            set how each post goes out.
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={() => goToStep("milestones")}>
            ← Posts
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSaveToReview}>
            Save → Review
          </button>
        </div>
      </div>

      {generateError ? <div className="alert alert-changes">{generateError}</div> : null}

      <div className="preview-layout">
        <aside className="rail-mini">
          <h4>Posts</h4>
          {milestones.map((milestone) => {
            const preview =
              session.previewContents.find((c) => c.milestoneId === milestone.id) ?? null;
            const meta = previewListMeta(preview, milestone.platformFormats);
            const { mo, dy } = monthDay(milestone.suggestedDate);
            return (
              <button
                key={milestone.id}
                type="button"
                className={`m-mini${milestone.id === selectedId ? " active" : ""}`}
                onClick={() => {
                  setSelectedMilestoneId(milestone.id);
                  setSettingsHighlight(null);
                }}
              >
                <strong>{milestone.name}</strong>
                <span>
                  {mo} {dy} · <span className={`pill ${meta.cls}`}>{meta.label}</span>
                </span>
                {meta.hint ? <span className="m-mini-hint">{meta.hint}</span> : null}
              </button>
            );
          })}
        </aside>

        <div className="box preview-phone-col" style={{ margin: 0 }}>
          {isChangesRequested ? (
            <div className="alert alert-changes">
              <strong>Changes requested</strong>
              <span>
                {selectedPreview?.changeRequestComment ||
                  "Approver requested changes on this post."}
              </span>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => openEdit("artwork")}
                >
                  Edit artwork &amp; caption
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-gold"
                  onClick={() => {
                    void resend().catch(() => {
                      // Message already shown via toast.
                    });
                  }}
                  disabled={isResending || !canResend}
                >
                  {isResending ? "Sending…" : "Send for re-approval"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mode-toggle">
            <button
              type="button"
              className={mode === "feed" ? "active" : ""}
              onClick={() => setMode("feed")}
            >
              Feed
            </button>
            <button
              type="button"
              className={mode === "story" ? "active" : ""}
              onClick={() => setMode("story")}
            >
              Story
            </button>
          </div>

          <div className="live-well" style={{ borderRadius: 16, padding: 20 }}>
            <div className="phone">
              <div className="phone-notch" />
              <div className="phone-screen">
                {mode === "feed" ? (
                  <div>
                    <div className="ig-bar">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="ig-avatar" />
                        {handle}
                      </div>
                      ···
                    </div>
                    <WarmBreathFrame
                      active={isGenerating}
                      label="Generating feed artwork"
                    >
                      <div
                        className="feed-art zoomable"
                        role="button"
                        tabIndex={0}
                        aria-label="Enlarge artwork"
                        onClick={() => openLightbox("feed")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openLightbox("feed");
                          }
                        }}
                        style={
                          feedUrl
                            ? {
                                backgroundImage: `url(${feedUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : {
                                background: `radial-gradient(circle at 30% 30%, rgba(255,252,247,.25), transparent 40%), ${gradient}`,
                              }
                        }
                      >
                        {!feedUrl ? (
                          <>
                            <span className="badge">Feed</span>
                            <div className="title">{selectedMilestone?.name ?? "Post"}</div>
                          </>
                        ) : null}
                      </div>
                    </WarmBreathFrame>
                    <div className="ig-meta">
                      <div className="likes">♡ Liked by your community</div>
                      <div className="cap">
                        <strong>{handle}</strong>{" "}
                        {sharedCaption.trim() || "Caption appears here after you edit."}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <WarmBreathFrame
                      active={isGenerating}
                      label="Generating story artwork"
                    >
                      <div
                        className="story-frame zoomable"
                        role="button"
                        tabIndex={0}
                        aria-label="Enlarge story artwork"
                        onClick={() => openLightbox("story")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openLightbox("story");
                          }
                        }}
                        style={
                          storyUrl
                            ? {
                                backgroundImage: `url(${storyUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : { background: `linear-gradient(160deg, ${gradient})` }
                        }
                      >
                        {!storyUrl ? (
                          <>
                            <div className="st">{selectedMilestone?.name ?? "Post"}</div>
                            <div className="sub">{formatLongDate(selectedMilestone?.suggestedDate)}</div>
                          </>
                        ) : null}
                      </div>
                    </WarmBreathFrame>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="phone-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => openEdit("artwork")}
              disabled={!selectedPreview}
            >
              Edit artwork &amp; caption
            </button>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => void handleGenerate()}
              disabled={isGenerating || !selectedId}
            >
              {isGenerating
                ? "Generating…"
                : hasGeneratedArt
                  ? "Regenerate"
                  : "Generate artwork"}
            </button>
          </div>
        </div>

        <div
          className={`box preview-settings-col${settingsHighlight ? " has-highlight" : ""}`}
          style={{ margin: 0 }}
        >
          <h3>How this post goes out</h3>
          <p className="desc">
            Choose platforms and when it publishes. Artwork and caption stay in
            the phone — edit them with the button under the preview.
          </p>

          <div
            className={`settings-block${settingsHighlight === "formats" ? " highlight" : ""}`}
          >
            <label className="field-label">Platforms &amp; formats</label>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--muted)" }}>
              Facebook and Instagram posts go out automatically after approval.
            </p>
            <div className={`fmt-drop${fmtOpen ? " open" : ""}`}>
              <button
                type="button"
                className="fmt-trigger"
                aria-expanded={fmtOpen}
                onClick={() => {
                  setFmtOpen((value) => !value);
                  setSettingsHighlight(null);
                }}
              >
                <div className="fmt-summary">
                  {fmtSummaryHeadline(enabledFormats)}
                  <span>
                    {enabledFormats.length} format{enabledFormats.length === 1 ? "" : "s"} selected
                    {hasManual ? " · includes Story Manual email kit" : ""} · click to change
                  </span>
                </div>
                <span className="chev">▼</span>
              </button>
              <div className="fmt-menu" role="listbox">
                {PLATFORM_FORMAT_OPTIONS.map((option) => {
                  const on = enabledFormats.includes(option.id);
                  const isManual = option.id === "instagram-story-manual";
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`fmt-opt${on ? " on" : ""}${isManual ? " manual-opt" : ""}`}
                      onClick={() => toggleFormat(option.id)}
                    >
                      <span className="fmt-check">✓</span>
                      <div>
                        <div className="w-title">{option.label}</div>
                        <div className="w-desc">
                          {FORMAT_OPTION_DESC[option.id] ?? option.aspect}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {hasManual && selectedPreview ? (
            <div
              className={`settings-block${settingsHighlight === "manual" ? " highlight" : ""}`}
            >
              <button
                type="button"
                className="advanced-toggle"
                aria-expanded={manualOpen}
                onClick={() => setManualOpen((value) => !value)}
              >
                <span>Story kit email (advanced)</span>
                <span className="chev">{manualOpen ? "▲" : "▼"}</span>
              </button>
              {manualOpen ? (
                <div className="manual-email-panel show">
                  <p className="desc" style={{ marginBottom: 12 }}>
                    After approval, the story kit arrives by email so you can
                    upload and add music, stickers, etc.
                  </p>
                  <div className="grid-2">
                    <div>
                      <label className="field-label">Email send date</label>
                      <input
                        className="field"
                        type="date"
                        value={selectedPreview.emailSendDate}
                        onChange={(event) =>
                          updatePreviewContent(selectedPreview.milestoneId, {
                            emailSendDate: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="field-label">Email send time</label>
                      <input
                        className="field"
                        type="time"
                        value={selectedPreview.emailSendTime}
                        onChange={(event) =>
                          updatePreviewContent(selectedPreview.milestoneId, {
                            emailSendTime: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label className="field-label">Send to</label>
                    <input
                      className="field"
                      type="email"
                      placeholder="you@yourorg.org"
                      value={selectedPreview.manualEmailTo}
                      onChange={(event) =>
                        updatePreviewContent(selectedPreview.milestoneId, {
                          manualEmailTo: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <label className="field-label">Link for Instagram</label>
                    <input
                      className="field"
                      type="url"
                      placeholder="https://…"
                      value={selectedPreview.manualUploadLink}
                      onChange={(event) =>
                        updatePreviewContent(selectedPreview.milestoneId, {
                          manualUploadLink: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            className={`settings-block${settingsHighlight === "schedule" || settingsHighlight === "caption" ? " highlight" : ""}`}
            style={{ marginTop: 4 }}
          >
            <label className="field-label">When to publish</label>
            <div
              className="mode-toggle"
              role="group"
              aria-label="When to publish"
            >
              <button
                type="button"
                className={publishNowSelected ? "active" : ""}
                disabled={!selectedPreview}
                onClick={() => {
                  if (!selectedPreview) return;
                  updatePreviewContent(selectedPreview.milestoneId, {
                    deliveryMethod: "publish-now",
                  });
                  setSettingsHighlight(null);
                }}
              >
                Publish now
              </button>
              <button
                type="button"
                className={!publishNowSelected ? "active" : ""}
                disabled={!selectedPreview}
                onClick={() => {
                  if (!selectedPreview) return;
                  updatePreviewContent(selectedPreview.milestoneId, {
                    deliveryMethod: "schedule",
                  });
                  setSettingsHighlight(null);
                }}
              >
                Schedule
              </button>
            </div>
            {publishNowSelected ? (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
                Goes out right after approval.
              </p>
            ) : selectedPreview ? (
              <div style={{ marginTop: 10 }}>
                <div className="grid-2">
                  <div>
                    <label className="field-label">Publish date</label>
                    <input
                      className="field"
                      type="date"
                      value={selectedPreview.scheduleDate}
                      onChange={(event) => {
                        updatePreviewContent(selectedPreview.milestoneId, {
                          scheduleDate: event.target.value,
                        });
                        setSettingsHighlight(null);
                      }}
                    />
                  </div>
                  <div>
                    <label className="field-label">Publish time</label>
                    <input
                      className="field"
                      type="time"
                      value={selectedPreview.scheduleTime}
                      onChange={(event) => {
                        updatePreviewContent(selectedPreview.milestoneId, {
                          scheduleTime: event.target.value,
                        });
                        setSettingsHighlight(null);
                      }}
                    />
                  </div>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  {formatScheduleLabel(
                    selectedPreview.scheduleDate,
                    selectedPreview.scheduleTime,
                  )}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {lightbox ? (
        <div
          className="lightbox open"
          aria-hidden="false"
          onClick={() => setLightbox(null)}
        >
          <div
            className={`lightbox-card${lightbox.view === "story" ? " is-story" : " is-feed"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="lightbox-x"
              aria-label="Close"
              onClick={() => setLightbox(null)}
            >
              ×
            </button>
            <div
              className={`lightbox-art${lightbox.view === "story" ? " is-story" : " is-feed"}`}
              style={
                lightbox.imageUrl
                  ? {
                      backgroundImage: `url(${lightbox.imageUrl})`,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                      backgroundColor: "#1c2430",
                    }
                  : {
                      background: `radial-gradient(circle at 30% 30%, rgba(255,252,247,.25), transparent 40%), ${lightbox.gradient}`,
                    }
              }
            >
              {!lightbox.imageUrl ? (
                <div className="title">{lightbox.title}</div>
              ) : null}
            </div>
            <div className="lightbox-bar">
              <p>
                Generated artwork · larger view
                {lightbox.view === "story" ? " (9:16)" : " (1:1)"}
              </p>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => handleDownload(lightbox.imageUrl, "artwork")}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editModalOpen && selectedPreview && selectedMilestone ? (
        <EditMilestoneModal
          key={`${selectedPreview.milestoneId}-${editInitialTab}`}
          eventId={session.eventId}
          milestoneId={selectedPreview.milestoneId}
          brandKitId={brandKitIdForAi(session.inspiration.brandKitId)}
          inspiration={session.inspiration}
          milestone={selectedMilestone}
          previewContent={selectedPreview}
          milestones={session.milestones}
          currentCaption={sharedCaption}
          artworkNotes={selectedMilestone.artworkNotes}
          captionNotes={selectedMilestone.captionNotes}
          voiceTone={session.inspiration.voiceTone}
          artworkImageUrl={feedUrl ?? storyUrl}
          generationStatus={status}
          initialTab={editInitialTab}
          onClose={() => setEditModalOpen(false)}
          onApplyArtwork={(artwork) => void handleApplyArtwork(artwork)}
          onApplyCaption={(text, options) => {
            handleCaptionChange(text);
            if (options?.close !== false) {
              setEditModalOpen(false);
            }
          }}
          onResendForApproval={(artwork) => resend(artwork)}
        />
      ) : null}
    </section>
  );
}

function ReviewPanel({ onToast }: { onToast: (message: string) => void }) {
  const { session, goToStep, updatePreviewContent, flushSave } = useCampaignBuilder();
  const [isSending, setIsSending] = useState(false);

  const milestones = useMemo(
    () => [...session.milestones].sort((a, b) => a.sortOrder - b.sortOrder),
    [session.milestones],
  );

  const progress = countCompleteMilestones(milestones, session.previewContents);
  const contentComplete = allMilestonesGenerated(milestones, session.previewContents);
  const anyChangesRequested = session.previewContents.some(
    (content) => resolveMilestoneGenerationStatus(content) === "changes_requested",
  );
  const selectedLogoLabel = session.inspiration.uploadedLogoLabel || session.inspiration.selectedLogoId;

  const approverStep =
    session.approvalWorkflow.find((step) => step.role !== "Creator" && step.assigneeName) ??
    session.approvalWorkflow.find((step) => step.role !== "Creator") ??
    null;

  const eligibleMilestones = milestones.filter((milestone) => {
    const preview = session.previewContents.find((c) => c.milestoneId === milestone.id);
    return preview ? isMilestoneEligibleForApprovalSubmit(preview) : false;
  });
  const eligiblePreviews = eligibleMilestones
    .map((milestone) => session.previewContents.find((c) => c.milestoneId === milestone.id))
    .filter((preview): preview is MilestonePreviewContent => Boolean(preview));

  const blockReason =
    eligibleMilestones.length === 0
      ? describeApprovalSubmitBlockers(milestones, session.previewContents)
      : null;

  /** Prefer the Preview selection, then first milestone with real artwork. */
  const peek = useMemo(() => {
    const preferredIds = [
      session.selectedMilestoneId,
      ...eligibleMilestones.map((m) => m.id),
      ...milestones.map((m) => m.id),
    ].filter((id): id is string => Boolean(id));

    for (const milestoneId of preferredIds) {
      const milestone = milestones.find((m) => m.id === milestoneId);
      const preview = session.previewContents.find((c) => c.milestoneId === milestoneId);
      if (!milestone || !preview) continue;
      const feedUrl =
        preview.artwork.feedUrl && !isPlaceholderArtworkUrl(preview.artwork.feedUrl)
          ? preview.artwork.feedUrl
          : null;
      const storyUrl =
        preview.artwork.storyUrl && !isPlaceholderArtworkUrl(preview.artwork.storyUrl)
          ? preview.artwork.storyUrl
          : null;
      if (!feedUrl && !storyUrl) continue;
      return {
        milestone,
        preview,
        feedUrl,
        storyUrl,
        caption: getSharedCaptionText(preview.captions).trim(),
        index: milestones.findIndex((m) => m.id === milestoneId),
      };
    }
    return null;
  }, [
    eligibleMilestones,
    milestones,
    session.previewContents,
    session.selectedMilestoneId,
  ]);

  const peekImageUrl = peek?.feedUrl ?? peek?.storyUrl ?? null;
  const peekHandle = handleize(session.inspiration.campaignName);
  const peekFormats = peek?.preview.enabledFormats ?? [];
  const peekFormatLabel = [
    peekFormats.some((f) => f.includes("feed") || f.includes("instagram-post"))
      ? "Feed"
      : null,
    peekFormats.some((f) => f.includes("story")) ? "Story" : null,
  ]
    .filter(Boolean)
    .join(" · ") || "Feed · Story";
  const peekCaption =
    peek?.caption ||
    (peek
      ? "Caption ready in Preview."
      : "Generate in Preview to see your post here.");
  const peekTitle =
    peek?.milestone.name || session.inspiration.campaignName || "Your campaign";
  const peekGradient = gradientForIndex(peek?.index ?? 0);

  async function handleSendForApproval() {
    if (eligibleMilestones.length === 0) {
      if (blockReason) {
        onToast(blockReason);
      } else {
        await flushSave();
        onToast("Saved. Nothing new to send for approval.");
      }
      return;
    }
    setIsSending(true);
    try {
      const result = await sendForApprovalAction({
        eventId: session.eventId,
        campaignName: session.inspiration.campaignName,
        milestones: eligibleMilestones,
        previewContents: eligiblePreviews,
      });
      onToast(result.message);
      if (result.success) {
        for (const preview of eligiblePreviews) {
          updatePreviewContent(preview.milestoneId, previewAfterResendForApproval(preview));
        }
        goToStep("published");
      }
    } finally {
      setIsSending(false);
    }
  }

  const checklist = [
    {
      done: Boolean(session.inspiration.selectedLogoId || session.inspiration.uploadedLogoUrl),
      title: "Logos from Setup",
      desc: selectedLogoLabel ? `${selectedLogoLabel} applied` : "No logo selected — artwork only",
    },
    {
      done: milestones.length > 0,
      title: "Communication Plan posts mapped",
      desc: `${milestones.length} post${milestones.length === 1 ? "" : "s"} in this campaign`,
    },
    {
      done: contentComplete,
      title: "Content generated + editable",
      desc: `${progress.complete} of ${progress.total} posts ready`,
    },
    {
      done: !anyChangesRequested,
      title: "Change-request loop",
      desc: anyChangesRequested
        ? "Preview → edit → Send for re-approval"
        : "No open change requests",
    },
  ];

  return (
    <section>
      <div className="panel-head">
        <div>
          <h2>Review &amp; Approve</h2>
          <p>One last pass — change requests bounce back to Preview edits, then re-approval.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={() => goToStep("preview")}>
            ← Preview
          </button>
          <button
            type="button"
            className="btn btn-gold"
            onClick={() => void handleSendForApproval()}
            disabled={isSending}
          >
            {isSending ? "Sending…" : "Send for approval"}
          </button>
        </div>
      </div>

      <div className="split">
        <div>
          <div className="box">
            <h3>Checklist</h3>
            <p className="desc">Same soft-card language as Newsletter Must-dos.</p>
            {checklist.map((item) => (
              <div key={item.title} className="check-row">
                <div className={`check${item.done ? "" : " empty"}`}>{item.done ? "✓" : " "}</div>
                <div>
                  <strong style={{ fontSize: 14 }}>{item.title}</strong>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="box">
            <h3>Approver</h3>
            <p className="desc">From Team Access.</p>
            <input className="field" value={approverStep?.assigneeName || "Unassigned"} readOnly />
          </div>
        </div>
        <aside className="live-pane">
          <div className="live-label">Ready to ship peek</div>
          <div className="live-well">
            <div className="phone">
              <div className="phone-notch" />
              <div className="phone-screen">
                <div className="ig-bar">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="ig-avatar" />
                    {peekHandle}
                  </div>
                  ···
                </div>
                <div
                  className="feed-art"
                  style={
                    peekImageUrl
                      ? {
                          backgroundImage: `url(${peekImageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {
                          background: `radial-gradient(circle at 30% 30%, rgba(255,252,247,.25), transparent 40%), ${peekGradient}`,
                        }
                  }
                >
                  <span className="badge">{peek ? "Queue" : "Draft"}</span>
                  <div className="title">{peekTitle}</div>
                </div>
                <div className="ig-meta">
                  <div className="likes">Post ways: {peekFormatLabel}</div>
                  <div className="cap">
                    <strong>{peekHandle}</strong>{" "}
                    {peekCaption.split("\n")[0]}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PublishedPanel() {
  const { goToStep, session } = useCampaignBuilder();
  return (
    <section>
      <div className="panel-head">
        <div>
          <h2>Sent for approval</h2>
          <p>{session.inspiration.campaignName || "Your campaign"} is on its way to your approver.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-secondary" onClick={() => goToStep("review")}>
            ← Back to Review
          </button>
        </div>
      </div>
      <div className="box">
        <h3>What happens next</h3>
        <p className="desc">
          Your approver will review the submitted posts. Any changes
          requested route back to Preview for edits, then a quick re-send.
        </p>
      </div>
    </section>
  );
}
