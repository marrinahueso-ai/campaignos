"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { DM_Sans, Fraunces } from "next/font/google";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { BackgroundLibraryPicker } from "@/components/background-library/BackgroundLibraryPicker";
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
  SETUP_BRAND_COLOR_MAX,
  addSetupBrandColor,
  commitSetupBrandColors,
  removeSetupBrandColor,
  replaceSetupBrandColor,
  resolveSetupBrandColors,
  toSetupColorInputValue,
} from "@/lib/campaign-builder-v2/creative-config";
import {
  getSharedCaptionText,
  syncCaptionsToPlatforms,
} from "@/lib/campaign-builder-v2/caption-utils";
import {
  canResendMilestoneForApproval,
  captionPlatformsForFormats,
  derivedPreviewStatus,
  describeApprovalSubmitBlockers,
  isMilestoneEligibleForApprovalSubmit,
  listMilestoneContentGaps,
  preserveApprovalWorkflowStatus,
  previewAfterResendForApproval,
  resolveMilestoneGenerationStatus,
} from "@/lib/campaign-builder-v2/milestone-status";
import { isPublishNowDelivery } from "@/lib/campaign-builder-v2/delivery-method";
import { resolveSelectedMilestoneId } from "@/lib/campaign-builder-v2/normalize-session";
import {
  PLATFORM_FORMAT_OPTIONS,
  displayArtworkUrlForView,
} from "@/lib/campaign-builder-v2/platform-utils";
import {
  buildArtworkDownloadFilename,
  downloadArtworkImage,
} from "@/lib/artwork-v2/download";
import type { SetupLogoOption } from "@/lib/artwork-v2/setup-logos";
import type {
  CampaignBuilderMilestone,
  CampaignBuilderStepId,
  MilestoneArtwork,
  MilestonePreviewContent,
  PlatformFormat,
} from "@/lib/campaign-builder-v2/types";
import "./social-composer.css";
import { filesFromDataTransfer } from "@/lib/campaign-builder-v2/inspiration-utils";
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

type ComposerNavId = "setup" | "preview" | "review";

function composerNavFromStep(step: CampaignBuilderStepId): ComposerNavId {
  if (step === "preview" || step === "milestones") return "preview";
  if (step === "review" || step === "published") return "review";
  return "setup";
}

function ComposerTopChrome({
  currentStep,
  goToStep,
  progress,
  cta,
  ctaHint,
  variant = "default",
}: {
  currentStep: CampaignBuilderStepId;
  goToStep: (step: CampaignBuilderStepId) => void;
  progress?: { complete: number; total: number } | null;
  cta: ReactNode;
  ctaHint?: string | null;
  /** Confirmation screen: steps + CTAs only (no posts-ready progress). */
  variant?: "default" | "handoff";
}) {
  const progressPct =
    !progress || progress.total === 0
      ? 0
      : Math.round((progress.complete / progress.total) * 100);
  const isHandoff = variant === "handoff";

  return (
    <header
      className={`composer-topbar${isHandoff ? " composer-topbar-handoff" : ""}`}
    >
      <nav className="preview-steps" aria-label="Composer steps">
        {(
          [
            { id: "setup" as const, label: "Setup", step: "inspiration" as const },
            { id: "preview" as const, label: "Preview", step: "preview" as const },
            { id: "review" as const, label: "Review", step: "review" as const },
          ] as const
        ).map((item, index) => {
          const active = composerNavFromStep(currentStep) === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`preview-step${active ? " active" : ""}`}
              onClick={() => goToStep(item.step)}
            >
              <span className="preview-step-num">{index + 1}</span>
              <span className="preview-step-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {!isHandoff && progress ? (
        <div className="preview-progress">
          <div className="preview-progress-label">
            {progress.complete} of {progress.total} posts ready
          </div>
          <div className="preview-progress-track" aria-hidden="true">
            <div className="preview-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      ) : null}
      {!isHandoff && !progress ? (
        <div className="preview-progress preview-progress-spacer" aria-hidden="true" />
      ) : null}

      <div className="preview-top-cta">
        {cta}
        {ctaHint ? <span className="preview-top-cta-hint">{ctaHint}</span> : null}
      </div>
    </header>
  );
}

type ReviewHandoffOutcome = "sent" | "approved";

type ReviewHandoffDetails = {
  outcome: ReviewHandoffOutcome;
  postCount: number;
  reviewerName: string | null;
  notifiedEmail: string | null;
  emailSkippedReason: string | null;
};

const EMPTY_HANDOFF: ReviewHandoffDetails = {
  outcome: "sent",
  postCount: 0,
  reviewerName: null,
  notifiedEmail: null,
  emailSkippedReason: null,
};

function handoffSessionKey(eventId: string): string {
  return `cb2:handoff:${eventId}`;
}

function readStoredHandoff(eventId: string): ReviewHandoffDetails {
  if (typeof window === "undefined") {
    return EMPTY_HANDOFF;
  }
  try {
    const raw = window.sessionStorage.getItem(handoffSessionKey(eventId));
    if (!raw) {
      return EMPTY_HANDOFF;
    }
    const parsed = JSON.parse(raw) as Partial<ReviewHandoffDetails>;
    if (parsed.outcome !== "sent" && parsed.outcome !== "approved") {
      return EMPTY_HANDOFF;
    }
    return {
      outcome: parsed.outcome,
      postCount: typeof parsed.postCount === "number" ? parsed.postCount : 0,
      reviewerName: parsed.reviewerName ?? null,
      notifiedEmail: parsed.notifiedEmail ?? null,
      emailSkippedReason: parsed.emailSkippedReason ?? null,
    };
  } catch {
    return EMPTY_HANDOFF;
  }
}

function persistHandoff(eventId: string, details: ReviewHandoffDetails): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(
      handoffSessionKey(eventId),
      JSON.stringify(details),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function SocialMediaComposer({
  eventId,
  eventTitle: _eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const { currentStep } = useCampaignBuilder();
  const [toast, setToast] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<ReviewHandoffDetails>(() =>
    readStoredHandoff(eventId),
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  function rememberHandoff(details: ReviewHandoffDetails) {
    persistHandoff(eventId, details);
    setHandoff(details);
  }

  const activeNav = composerNavFromStep(currentStep);
  // Confirmation is not a stepper step — check it before nav buckets.
  const showPublished = currentStep === "published";
  const showPreview = !showPublished && activeNav === "preview";
  const showReview = !showPublished && currentStep === "review";

  return (
    <div
      className={`smc ${smcSans.variable} ${smcSerif.variable} ${smcSans.className} composer-flow`}
      style={
        {
          ["--sans" as string]: "var(--smc-sans), system-ui, sans-serif",
          ["--serif" as string]: "var(--smc-serif), Georgia, serif",
        } as React.CSSProperties
      }
    >
      <div className="app">
        <div className="main-col">
          <div className="content content-focus">
            <Link href="/create-with-ai" className="back">
              ← Create with AI
            </Link>

            <div className="layout layout-focus">
              <div className="panel">
                {showPublished ? (
                  <PublishedPanel handoff={handoff} />
                ) : showPreview ? (
                  <PreviewPanel onToast={showToast} />
                ) : showReview ? (
                  <ReviewPanel onToast={showToast} onHandoff={rememberHandoff} />
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
    currentStep,
    goToStep,
    updateInspiration,
    setPlaybookId,
    selectCampaign,
    addInspirationImages,
    addInspirationFromLibrary,
    removeInspirationImage,
    saveCreativeSetupAndContinue,
    flushSave,
    playbookOptions,
    campaignOptions,
    logoOptions,
    isSaving,
  } = useCampaignBuilder();

  const { inspiration } = session;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbookError, setPlaybookError] = useState<string | null>(null);
  const [inspDragOver, setInspDragOver] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  function addInspirationFiles(fileList: FileList | File[] | null | undefined) {
    addInspirationImages(Array.from(fileList ?? []));
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
  const colors = resolveSetupBrandColors(inspiration);
  const canAddBrandColor = colors.length < SETUP_BRAND_COLOR_MAX;

  function commitBrandColors(next: string[]) {
    updateInspiration(commitSetupBrandColors(next));
  }

  function chooseShownBrandColors() {
    if (inspiration.colorMode === "custom_palette") return;
    if (colors.length === 0) return;
    commitBrandColors(colors);
  }

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

  async function handleSaveDraft() {
    setIsSavingDraft(true);
    try {
      await flushSave();
      onToast("Draft saved");
    } finally {
      setIsSavingDraft(false);
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

  function openReportProblem() {
    const hostBtn = document.querySelector<HTMLButtonElement>(
      '[data-report-problem="true"]',
    );
    if (hostBtn) {
      hostBtn.click();
      return;
    }
    window.location.href = "mailto:hello@heyralli.com?subject=Report%20a%20Problem";
  }

  const busy = isContinuing || isSaving;

  return (
    <section className="setup-panel">
      <ComposerTopChrome
        currentStep={currentStep}
        goToStep={goToStep}
        cta={
          <button
            type="button"
            className="btn btn-forest"
            onClick={() => void handleSave()}
            disabled={busy}
          >
            {isContinuing ? "Saving…" : "Save → Preview"}
          </button>
        }
        ctaHint="Maps your plan, then opens Preview"
      />

      <div className="panel-head panel-head-quiet setup-hero">
        <div>
          <h2>Creative Setup</h2>
          <p>Logos, inspiration, and a communication plan that maps your posts.</p>
        </div>
      </div>

      {error ? <div className="alert alert-changes">{error}</div> : null}

      <div className="split setup-split">
        <div className="setup-form-col">
          {/* 1 · Campaign & Plan */}
          <div className="setup-card">
            <div className="setup-card-head">
              <div className="setup-card-title">
                <span className="setup-step-num" aria-hidden="true">
                  1
                </span>
                <h3>Campaign &amp; Plan</h3>
              </div>
              <button
                type="button"
                className="setup-last-year-btn"
                onClick={() =>
                  onToast("Last year’s plan reuse is coming soon — pick a plan below for now.")
                }
              >
                Use Last Year&apos;s Plan
              </button>
            </div>

            <div className="grid-2 setup-campaign-grid">
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
                <label className="field-label">Campaign Date</label>
                <input
                  className="field"
                  value={formatLongDate(inspiration.eventDate)}
                  readOnly
                />
              </div>
            </div>

            <div className="setup-plan-block">
              <div className="setup-plan-label-row">
                <label className="field-label" htmlFor="setup-playbook-select">
                  Communication Plan
                </label>
                {sortedMilestones.length > 0 ? (
                  <span className="setup-maps-count">
                    Maps to {sortedMilestones.length} posts
                  </span>
                ) : null}
              </div>
              <select
                id="setup-playbook-select"
                className="field setup-playbook-select"
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
                <div className="setup-milestone-list" role="list">
                  {sortedMilestones.map((milestone) => {
                    const { mo, dy } = monthDay(milestone.suggestedDate);
                    return (
                      <div
                        key={milestone.id}
                        className="setup-milestone-row"
                        role="listitem"
                      >
                        <div className="setup-milestone-date" aria-hidden="true">
                          <span>{mo}</span>
                          {dy}
                        </div>
                        <div className="setup-milestone-copy">
                          <p className="setup-milestone-name">{milestone.name}</p>
                          <p className="setup-milestone-meta">
                            {formatsSummaryFromPlatforms(milestone.platformFormats)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          {/* 2 · Look & Feel */}
          <div className="setup-card">
            <div className="setup-card-head">
              <div className="setup-card-title">
                <span className="setup-step-num" aria-hidden="true">
                  2
                </span>
                <h3>Look &amp; Feel</h3>
              </div>
            </div>

            <div className="setup-logos-block">
              <label className="field-label">
                Brand Logos{" "}
                <span className="setup-label-hint">Pulled from Setup</span>
              </label>
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
                  </button>
                ))}
                <button
                  type="button"
                  className={`logo-card${!inspiration.selectedLogoId ? " selected" : ""}`}
                  onClick={() => selectLogo(null)}
                >
                  <div className="preview none" aria-hidden="true">
                    ⌀
                  </div>
                  <div className="name">No Logo</div>
                </button>
              </div>
              {logoOptions.length === 0 ? (
                <p className="desc" style={{ marginTop: 10, marginBottom: 0 }}>
                  No organization logos yet — add them in your brand kit.
                </p>
              ) : null}
            </div>

              <div className="setup-insp-block">
              <div className="setup-plan-label-row">
                <label className="field-label">Inspiration Images</label>
                <button
                  type="button"
                  className="setup-add-images"
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Add Images
                </button>
              </div>
              <div
                className={`insp-drop setup-insp-drop${inspDragOver ? " drag-over" : ""}`}
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
                  addInspirationFiles(filesFromDataTransfer(event.dataTransfer));
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
                      className="insp-tile-remove"
                      onClick={() => removeInspirationImage(image.id)}
                      aria-label={`Remove ${image.label}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <label
                  htmlFor="social-composer-inspiration-input"
                  className="insp-tile insp-tile-upload"
                  aria-label="Add inspiration image"
                >
                  <span aria-hidden="true">+</span>
                  <span className="insp-tile-upload-label">Upload</span>
                </label>
              </div>
              <button
                type="button"
                className="setup-browse-gallery"
                title="Browse the Hey Ralli background library"
                onClick={() => setLibraryOpen(true)}
              >
                Browse Gallery
              </button>
              <p className="setup-insp-peer-note">
                Upload a photo to use as inspiration or to set the color palette.
              </p>
              <input
                id="social-composer-inspiration-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  addInspirationFiles(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </div>
          </div>

          {/* 3 · Voice & Colors */}
          <div className="setup-card">
            <div className="setup-card-head">
              <div className="setup-card-title">
                <span className="setup-step-num" aria-hidden="true">
                  3
                </span>
                <h3>Voice &amp; Colors</h3>
              </div>
            </div>

            <div className="setup-voice-row">
              <div className="setup-colors-block">
                <label className="field-label" id="setup-brand-colors-label">
                  Brand Colors
                </label>
                <div
                  className="color-row"
                  role="group"
                  aria-labelledby="setup-brand-colors-label"
                >
                  {colors.map((color, index) => {
                    const inputValue = toSetupColorInputValue(color);
                    return (
                      <div
                        key={`${color}-${index}`}
                        className="swatch-item"
                      >
                        <label
                          className="swatch swatch-pick"
                          style={{ background: inputValue }}
                          title={`${inputValue} — click to change`}
                        >
                          <input
                            type="color"
                            value={inputValue}
                            aria-label={`Brand color ${index + 1}`}
                            onFocus={chooseShownBrandColors}
                            onChange={(event) =>
                              commitBrandColors(
                                replaceSetupBrandColor(
                                  colors,
                                  index,
                                  event.target.value,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="swatch-remove"
                          aria-label={`Remove brand color ${index + 1}`}
                          onClick={() =>
                            commitBrandColors(
                              removeSetupBrandColor(colors, index),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  {canAddBrandColor ? (
                    <button
                      type="button"
                      className="swatch-add"
                      aria-label="Add brand color"
                      title="Add a color"
                      onClick={() =>
                        commitBrandColors(addSetupBrandColor(colors))
                      }
                    >
                      +
                    </button>
                  ) : null}
                </div>
                <p className="setup-colors-hint">
                  {colors.length > 0
                    ? "Click a color to change it, or add another. These guide the artwork."
                    : "Add the colors you want in the artwork."}
                </p>
              </div>
              <div className="setup-voice-block">
                <label className="field-label" htmlFor="setup-caption-voice">
                  Caption Voice
                </label>
                <textarea
                  id="setup-caption-voice"
                  className="field"
                  rows={3}
                  value={inspiration.voiceTone}
                  onChange={(event) =>
                    updateInspiration({ voiceTone: event.target.value })
                  }
                  placeholder="e.g. Warm, clear, short. Celebrate people and the event..."
                />
              </div>
            </div>
          </div>

          <div className="setup-footer-actions">
            <button
              type="button"
              className="btn btn-forest setup-create-btn"
              onClick={() => void handleSave()}
              disabled={busy}
            >
              {isContinuing ? "Saving…" : "Create with AI"}
            </button>
            <button
              type="button"
              className="setup-save-draft"
              onClick={() => void handleSaveDraft()}
              disabled={isSavingDraft || busy}
            >
              {isSavingDraft ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="button"
              className="setup-report-link"
              onClick={openReportProblem}
            >
              Report a Problem
            </button>
          </div>
        </div>

        <aside className="live-pane">
          <div className="live-label">Live Vibe Preview</div>
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
                  <div className="likes">♡ ♡ ♡</div>
                  <div className="cap">
                    <strong>{handle}</strong> Save the date — details coming soon.
                  </div>
                </div>
              </div>
            </div>
            <p className="live-footnote">
              This preview updates as you tweak your setup. It helps the AI understand
              the visual balance before you generate real posts.
            </p>
          </div>
        </aside>
      </div>
      <BackgroundLibraryPicker
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(asset) => {
          const result = addInspirationFromLibrary(asset);
          if (!result.success && result.message) {
            setError(result.message);
          }
        }}
      />
    </section>
  );
}

function PreviewPanel({ onToast }: { onToast: (message: string) => void }) {
  const {
    session,
    currentStep,
    goToStep,
    setSelectedMilestoneId,
    updatePreviewContent,
    applyMilestoneArtwork,
    updateMilestone,
    addMilestone,
    removeMilestone,
    reorderMilestones,
    generatingMilestoneId,
  } = useCampaignBuilder();
  const router = useRouter();

  const [mode, setMode] = useState<"feed" | "story">("feed");
  const [fmtOpen, setFmtOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [settingsHighlight, setSettingsHighlight] =
    useState<PreviewSettingsHighlight>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const dragIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
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

  const milestones = useMemo(
    () => [...session.milestones].sort((a, b) => a.sortOrder - b.sortOrder),
    [session.milestones],
  );
  const selectedId = resolveSelectedMilestoneId(
    session.selectedMilestoneId,
    milestones,
  );
  const selectedIndex = milestones.findIndex((m) => m.id === selectedId);
  const selectedMilestone = milestones.find((m) => m.id === selectedId) ?? null;
  const selectedPreview =
    session.previewContents.find((c) => c.milestoneId === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && selectedId !== session.selectedMilestoneId) {
      setSelectedMilestoneId(selectedId);
    }
  }, [selectedId, session.selectedMilestoneId, setSelectedMilestoneId]);

  const status = resolveMilestoneGenerationStatus(
    selectedPreview,
    selectedMilestone?.platformFormats,
  );
  const isChangesRequested = status === "changes_requested";
  const canResend = selectedPreview ? canResendMilestoneForApproval(selectedPreview) : false;
  const isGenerating = generatingMilestoneId === selectedId || status === "generating";

  const gradient = gradientForIndex(selectedIndex);
  const feedUrl = displayArtworkUrlForView(selectedPreview?.artwork, "feed");
  const storyUrl = displayArtworkUrlForView(selectedPreview?.artwork, "story");

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

  function commitRename(milestoneId: string) {
    const nextName = renameDraft.trim();
    if (nextName) {
      updateMilestone(milestoneId, { name: nextName });
    }
    setRenamingId(null);
  }

  function handlePostDrop(targetId: string) {
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
    // First fill of an empty plan waterfalls onto every empty post. Applying
    // again after other posts already have art (or on a custom override) stays
    // on this post only — no forced asCustom on first Apply.
    const changedIds = applyMilestoneArtwork(
      selectedPreview.milestoneId,
      artwork,
    );
    setEditModalOpen(false);
    try {
      const syncIds =
        changedIds.length > 0 ? changedIds : [selectedPreview.milestoneId];
      for (const milestoneId of syncIds) {
        await syncAppliedMilestoneArtworkAction({
          eventId: session.eventId,
          milestones: session.milestones,
          milestoneId,
          artwork,
        });
      }
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

  async function handleDownload(imageUrl: string | null, label: string) {
    if (!imageUrl) {
      onToast("No artwork to download yet");
      return;
    }
    try {
      const filename = buildArtworkDownloadFilename(
        `${selectedMilestone?.name ?? "artwork"} ${label}`,
      );
      await downloadArtworkImage(imageUrl, filename);
      onToast(`Downloaded ${label} artwork`);
    } catch {
      onToast("Download failed — try again");
    }
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

  const instagramOn = enabledFormats.some((format) => format.startsWith("instagram"));
  const facebookOn = enabledFormats.some((format) => format.startsWith("facebook"));
  const timingNeedsAction =
    settingsHighlight === "schedule" ||
    Boolean(
      selectedPreview &&
        listPreviewDeliveryGaps(selectedPreview).some(
          (gap) => gap.includes("publish") || gap.includes("schedule"),
        ),
    );

  function toggleNetwork(network: "instagram" | "facebook") {
    if (!selectedPreview) {
      return;
    }
    const isOn = network === "instagram" ? instagramOn : facebookOn;
    let next: PlatformFormat[];
    if (isOn) {
      next = enabledFormats.filter((format) => !format.startsWith(network));
    } else {
      const defaults: PlatformFormat[] =
        network === "instagram"
          ? ["instagram-feed", "instagram-story"]
          : ["facebook-feed", "facebook-story"];
      next = [...enabledFormats, ...defaults.filter((f) => !enabledFormats.includes(f))];
    }
    updatePreviewContent(selectedPreview.milestoneId, { enabledFormats: next });
    setSettingsHighlight(null);
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
    <section className="preview-studio">
      <ComposerTopChrome
        currentStep={currentStep}
        goToStep={goToStep}
        progress={progress}
        cta={
          <button type="button" className="btn btn-forest" onClick={handleSaveToReview}>
            Save → Review
          </button>
        }
        ctaHint={`Moves all ${progress.total} posts to review`}
      />

      <div className="preview-layout preview-layout-v2">
        <aside className="campaign-posts">
          <div className="campaign-posts-head">
            <h4>Campaign posts</h4>
            <button
              type="button"
              className="post-add"
              aria-label="Add post"
              title="Add post"
              onClick={() => {
                addMilestone();
                setSettingsHighlight(null);
              }}
            >
              +
            </button>
          </div>
          {milestones.map((milestone, index) => {
            const preview =
              session.previewContents.find((c) => c.milestoneId === milestone.id) ?? null;
            const meta = previewListMeta(preview, milestone.platformFormats);
            const thumb = displayArtworkUrlForView(preview?.artwork, "feed");
            const isRenaming = renamingId === milestone.id;
            return (
              <div
                key={milestone.id}
                className={`post-card${milestone.id === selectedId ? " active" : ""}${dragOverId === milestone.id ? " drag-over" : ""}`}
                draggable={!isRenaming}
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
                  handlePostDrop(milestone.id);
                }}
                onDragEnd={() => {
                  dragIdRef.current = null;
                  setDragOverId(null);
                }}
                onClick={() => {
                  if (isRenaming) return;
                  setSelectedMilestoneId(milestone.id);
                  setSettingsHighlight(null);
                }}
                onKeyDown={(event) => {
                  if (isRenaming) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedMilestoneId(milestone.id);
                    setSettingsHighlight(null);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div
                  className="post-thumb"
                  style={
                    thumb
                      ? {
                          backgroundImage: `url(${thumb})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : { background: gradientForIndex(index) }
                  }
                />
                <div className="post-card-body">
                  {isRenaming ? (
                    <input
                      className="post-rename"
                      value={renameDraft}
                      autoFocus
                      aria-label="Post title"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onBlur={() => commitRename(milestone.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRename(milestone.id);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          setRenamingId(null);
                        }
                      }}
                    />
                  ) : (
                    <strong
                      className="post-title-edit"
                      title="Click to rename"
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        setRenamingId(milestone.id);
                        setRenameDraft(milestone.name);
                      }}
                      onClick={(event) => {
                        // Single click selects; second path for rename is double-click.
                        // Also allow rename when already selected via a quiet click on title.
                        if (milestone.id === selectedId) {
                          event.stopPropagation();
                          setRenamingId(milestone.id);
                          setRenameDraft(milestone.name);
                        }
                      }}
                    >
                      {milestone.name}
                    </strong>
                  )}
                  <span className={`status-chip ${meta.cls}`}>
                    {meta.label === "Ready" ? "✓ Ready" : meta.label}
                  </span>
                  {meta.hint ? <span className="post-card-hint">{meta.hint}</span> : null}
                </div>
                <button
                  type="button"
                  className="post-delete"
                  aria-label={`Delete ${milestone.name}`}
                  title="Delete post"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (milestones.length <= 1) {
                      onToast("Keep at least one post");
                      return;
                    }
                    removeMilestone(milestone.id);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </aside>

        <div className="preview-phone-col">
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
                  Edit
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

          <div className="mode-toggle mode-toggle-center">
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

          <div className="live-well live-well-v2">
            <div className="phone">
              <div className="phone-notch" />
              <div className={`phone-screen${mode === "story" ? " is-story" : ""}`}>
                {mode === "feed" ? (
                  <div className="feed-post">
                    <div className="ig-bar">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="ig-avatar" />
                        <div>
                          <div>{handle}</div>
                        </div>
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
                        <button
                          type="button"
                          className="art-edit"
                          title="Edit Post"
                          aria-label="Edit Post"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit("artwork");
                          }}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                          <span className="art-edit-label">Edit Post</span>
                        </button>
                      </div>
                    </WarmBreathFrame>
                    <div className="ig-meta">
                      <div className="ig-actions" aria-hidden="true">
                        <span>♡</span>
                        <span>○</span>
                        <span>➤</span>
                      </div>
                      <div className="cap">
                        <strong>{handle}</strong>{" "}
                        {sharedCaption.trim() || "Add a caption on the right."}
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
                        <button
                          type="button"
                          className="art-edit"
                          title="Edit Post"
                          aria-label="Edit Post"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit("artwork");
                          }}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                          <span className="art-edit-label">Edit Post</span>
                        </button>
                      </div>
                    </WarmBreathFrame>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        <div className="preview-settings-col">
          <div
            className={`caption-panel${settingsHighlight === "caption" ? " highlight" : ""}`}
          >
            <div className="caption-panel-head">
              <label className="field-label" htmlFor="preview-caption">
                Caption
              </label>
              <span className="caption-count">{sharedCaption.length} characters</span>
            </div>
            <textarea
              id="preview-caption"
              className="field caption-field"
              value={sharedCaption}
              onChange={(event) => {
                handleCaptionChange(event.target.value);
                setSettingsHighlight(null);
              }}
              disabled={!selectedPreview}
              rows={4}
            />
          </div>

          <div className="delivery-panel">
            <div className="delivery-panel-head">
              <h3>How this post goes out</h3>
              <button
                type="button"
                className="advanced-chip"
                aria-expanded={fmtOpen || manualOpen}
                onClick={() => {
                  setFmtOpen((value) => !value);
                  setManualOpen(hasManual);
                }}
              >
                Advanced post options
              </button>
            </div>

            <div
              className={`settings-block${settingsHighlight === "formats" ? " highlight" : ""}`}
            >
              <label className="field-label">Platforms</label>
              <div className="platform-pills" role="group" aria-label="Platforms">
                <button
                  type="button"
                  className={`platform-pill${instagramOn ? " on" : ""}`}
                  disabled={!selectedPreview}
                  onClick={() => toggleNetwork("instagram")}
                >
                  Instagram
                </button>
                <button
                  type="button"
                  className={`platform-pill${facebookOn ? " on" : ""}`}
                  disabled={!selectedPreview}
                  onClick={() => toggleNetwork("facebook")}
                >
                  Facebook
                </button>
              </div>
            </div>

            {(fmtOpen || manualOpen) && selectedPreview ? (
              <div className="advanced-drawer">
                <div className={`fmt-drop${fmtOpen ? " open" : ""}`}>
                  <div className="fmt-menu" role="listbox" style={{ display: "block" }}>
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
                {hasManual ? (
                  <div
                    className={`manual-email-panel show${settingsHighlight === "manual" ? " highlight" : ""}`}
                  >
                    <p className="desc" style={{ marginBottom: 12 }}>
                      Story kit email — after approval, send image + caption for
                      manual upload with music &amp; stickers.
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
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={`timing-panel${timingNeedsAction ? " action-required" : ""}`}>
              {timingNeedsAction ? (
                <span className="action-badge">Action required</span>
              ) : null}
              <label className="field-label">Timing</label>
              <div className="timing-cards" role="group" aria-label="When to publish">
                <button
                  type="button"
                  className={`timing-card${publishNowSelected ? " on" : ""}`}
                  disabled={!selectedPreview}
                  onClick={() => {
                    if (!selectedPreview) return;
                    updatePreviewContent(selectedPreview.milestoneId, {
                      deliveryMethod: "publish-now",
                    });
                    setSettingsHighlight(null);
                  }}
                >
                  <strong>Publish now</strong>
                  <span>Right after approval</span>
                </button>
                <button
                  type="button"
                  className={`timing-card${!publishNowSelected ? " on" : ""}`}
                  disabled={!selectedPreview}
                  onClick={() => {
                    if (!selectedPreview) return;
                    updatePreviewContent(selectedPreview.milestoneId, {
                      deliveryMethod: "schedule",
                    });
                    setSettingsHighlight(null);
                  }}
                >
                  <strong>Schedule for later</strong>
                  <span>Pick a date &amp; time</span>
                </button>
              </div>
              {!publishNowSelected && selectedPreview ? (
                <div className="timing-fields">
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
                  <p className="timing-hint">
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
      </div>

      {lightbox
        ? createPortal(
            <div
              className={`smc smc-lightbox-host ${smcSans.variable} ${smcSerif.variable}`}
            >
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
                      onClick={() =>
                        void handleDownload(
                          lightbox.imageUrl,
                          lightbox.view === "story" ? "story" : "feed",
                        )
                      }
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

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

function reviewPostDateLabel(
  milestone: CampaignBuilderMilestone,
  preview: MilestonePreviewContent | null,
): string {
  if (!preview) {
    return milestone.suggestedDate
      ? formatShortDate(milestone.suggestedDate)
      : "Timing needed";
  }
  if (isPublishNowDelivery(preview.deliveryMethod)) {
    return "Publish now";
  }
  if (preview.scheduleDate.trim()) {
    return formatScheduleLabel(preview.scheduleDate, preview.scheduleTime);
  }
  if (milestone.suggestedDate) {
    return formatShortDate(milestone.suggestedDate);
  }
  return "Timing needed";
}

function ReviewPanel({
  onToast,
  onHandoff,
}: {
  onToast: (message: string) => void;
  onHandoff: (details: ReviewHandoffDetails) => void;
}) {
  const {
    session,
    currentStep,
    goToStep,
    setSelectedMilestoneId,
    updatePreviewContent,
    flushSave,
    hasExternalReviewer,
  } = useCampaignBuilder();
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [peekMode, setPeekMode] = useState<"feed" | "story">("feed");

  const milestones = useMemo(
    () => [...session.milestones].sort((a, b) => a.sortOrder - b.sortOrder),
    [session.milestones],
  );

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

  const approverStep =
    session.approvalWorkflow.find((step) => step.role !== "Creator" && step.assigneeName) ??
    session.approvalWorkflow.find((step) => step.role !== "Creator") ??
    null;
  const reviewerName = approverStep?.assigneeName?.trim() || null;

  const selectedId = resolveSelectedMilestoneId(
    session.selectedMilestoneId,
    milestones,
  );
  const selectedMilestone = milestones.find((m) => m.id === selectedId) ?? null;
  const selectedPreview =
    session.previewContents.find((c) => c.milestoneId === selectedId) ?? null;
  const selectedIndex = milestones.findIndex((m) => m.id === selectedId);

  useEffect(() => {
    if (selectedId && selectedId !== session.selectedMilestoneId) {
      setSelectedMilestoneId(selectedId);
    }
  }, [selectedId, session.selectedMilestoneId, setSelectedMilestoneId]);

  const blockers = useMemo(() => {
    const items: Array<{ milestoneId: string; name: string; gap: string }> = [];
    for (const milestone of milestones) {
      const preview =
        session.previewContents.find((c) => c.milestoneId === milestone.id) ?? null;
      const gaps = listPreviewHandoffGaps(preview);
      if (gaps.length > 0) {
        items.push({
          milestoneId: milestone.id,
          name: milestone.name,
          gap: gaps[0],
        });
      }
    }
    return items;
  }, [milestones, session.previewContents]);

  const canHandoff =
    progress.total > 0 &&
    progress.complete === progress.total &&
    blockers.length === 0;

  const eligibleMilestones = milestones.filter((milestone) => {
    const preview = session.previewContents.find((c) => c.milestoneId === milestone.id);
    return preview ? isMilestoneEligibleForApprovalSubmit(preview) : false;
  });
  const eligiblePreviews = eligibleMilestones
    .map((milestone) => session.previewContents.find((c) => c.milestoneId === milestone.id))
    .filter((preview): preview is MilestonePreviewContent => Boolean(preview));
  const bulkIsReapprovalOnly =
    eligiblePreviews.length > 0 &&
    eligiblePreviews.every(
      (preview) =>
        resolveMilestoneGenerationStatus(preview) === "changes_requested",
    );

  const primaryCtaLabel = bulkIsReapprovalOnly
    ? "Send for re-approval"
    : "Send for approval";

  const feedUrl = displayArtworkUrlForView(selectedPreview?.artwork, "feed");
  const storyUrl = displayArtworkUrlForView(selectedPreview?.artwork, "story");
  const sharedCaption = selectedPreview
    ? getSharedCaptionText(selectedPreview.captions)
    : "";
  const handle = handleize(session.inspiration.campaignName);
  const gradient = gradientForIndex(selectedIndex);

  function openInPreview(milestoneId: string) {
    setSelectedMilestoneId(milestoneId);
    goToStep("preview");
  }

  function toastHandoffBlockers() {
    const first = blockers[0];
    if (first) {
      onToast(`${first.name}: missing ${first.gap}`);
      openInPreview(first.milestoneId);
      return true;
    }
    return false;
  }

  async function handleSendForApproval() {
    if (!canHandoff || eligibleMilestones.length === 0) {
      if (toastHandoffBlockers()) {
        return;
      }
      const contentBlock = describeApprovalSubmitBlockers(
        milestones,
        session.previewContents,
      );
      if (contentBlock) {
        onToast(contentBlock);
      } else {
        await flushSave();
        onToast("Saved. Nothing new to send for approval.");
      }
      return;
    }
    setIsSending(true);
    try {
      await flushSave();
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
        onHandoff({
          outcome: "sent",
          postCount: result.createdCount ?? eligibleMilestones.length,
          reviewerName: result.reviewerName ?? reviewerName,
          notifiedEmail: result.notifiedEmail ?? null,
          emailSkippedReason: result.emailSkippedReason ?? null,
        });
        // Land on Approvals filtered to this campaign so demos don't stall on
        // the in-composer confirmation screen.
        router.push(
          `/approvals?event=${encodeURIComponent(session.eventId)}`,
        );
        return;
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="review-studio">
      <ComposerTopChrome
        currentStep={currentStep}
        goToStep={goToStep}
        progress={progress}
        cta={
          <div className="composer-cta-stack">
            <button
              type="button"
              className="btn btn-forest"
              onClick={() => void handleSendForApproval()}
              disabled={isSending || !canHandoff}
            >
              {isSending ? "Sending…" : primaryCtaLabel}
            </button>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => goToStep("preview")}
            >
              ← Preview
            </button>
          </div>
        }
      />

      <div className="preview-layout preview-layout-v2 review-layout">
        <aside className="campaign-posts">
          <h4>Review &amp; approve</h4>
          {milestones.map((milestone, index) => {
            const preview =
              session.previewContents.find((c) => c.milestoneId === milestone.id) ?? null;
            const meta = previewListMeta(preview, milestone.platformFormats);
            const dateLabel = reviewPostDateLabel(milestone, preview);
            const thumb = displayArtworkUrlForView(preview?.artwork, "feed");
            return (
              <button
                key={milestone.id}
                type="button"
                className={`post-card${milestone.id === selectedId ? " active" : ""}`}
                onClick={() => setSelectedMilestoneId(milestone.id)}
                onDoubleClick={() => openInPreview(milestone.id)}
                title="Double-click to fix in Preview"
              >
                <div
                  className="post-thumb"
                  style={
                    thumb
                      ? {
                          backgroundImage: `url(${thumb})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : { background: gradientForIndex(index) }
                  }
                />
                <div className="post-card-body">
                  <strong>{milestone.name}</strong>
                  <span
                    className={`post-date-line${dateLabel === "Timing needed" ? " is-missing" : ""}`}
                  >
                    {dateLabel}
                  </span>
                  <span className={`status-chip ${meta.cls}`}>
                    {meta.label === "Ready" ? "✓ Ready" : meta.label}
                  </span>
                  {meta.hint ? <span className="post-card-hint">{meta.hint}</span> : null}
                </div>
              </button>
            );
          })}
        </aside>

        <div className="preview-phone-col">
          <div className="mode-toggle mode-toggle-center">
            <button
              type="button"
              className={peekMode === "feed" ? "active" : ""}
              onClick={() => setPeekMode("feed")}
            >
              Feed
            </button>
            <button
              type="button"
              className={peekMode === "story" ? "active" : ""}
              onClick={() => setPeekMode("story")}
            >
              Story
            </button>
          </div>

          <div className="live-well live-well-v2">
            <div className="phone">
              <div className="phone-notch" />
              <div className={`phone-screen${peekMode === "story" ? " is-story" : ""}`}>
                {peekMode === "feed" ? (
                  <div className="feed-post">
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
                    <div className="ig-meta">
                      <div className="ig-actions" aria-hidden="true">
                        <span>♡</span>
                      </div>
                      <div className="cap">
                        <strong>{handle}</strong>{" "}
                        {sharedCaption.trim() || "Add a caption in Preview."}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="story-frame"
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
                        <div className="sub">
                          {selectedMilestone
                            ? reviewPostDateLabel(selectedMilestone, selectedPreview)
                            : "—"}
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="review-summary">
          <h3>Campaign summary</h3>
          <p className="review-ready-line">
            {progress.complete} of {progress.total} posts fully ready
          </p>

          {blockers.length > 0 ? (
            <button
              type="button"
              className="review-blocker"
              onClick={() => openInPreview(blockers[0].milestoneId)}
            >
              <strong>
                {blockers.length} blocker{blockers.length === 1 ? "" : "s"} remain
                {blockers.length === 1 ? "s" : ""}
              </strong>
              <span>
                {blockers[0].name} is missing {blockers[0].gap}. Click to fix in
                Preview.
              </span>
            </button>
          ) : (
            <div className="review-clear">
              <strong>Ready to send</strong>
              <span>All posts have artwork, caption, and timing.</span>
            </div>
          )}

          <div className="review-reviewer">
            <label className="field-label">Reviewer</label>
            <p className="review-reviewer-name">
              {hasExternalReviewer
                ? reviewerName || "Unassigned"
                : reviewerName
                  ? `${reviewerName} (you)`
                  : "You"}
            </p>
            <p className="review-reviewer-meta">
              {hasExternalReviewer
                ? `${approverStep?.role ? `${approverStep.role} · ` : ""}From Team Access · gets an approval email`
                : "You’ll review these on Approvals after you send"}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function campaignIdLabel(campaignName: string, eventId: string): string {
  const slug = campaignName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  if (slug) {
    return slug;
  }
  return eventId.replace(/-/g, "").slice(0, 10).toUpperCase() || "CAMPAIGN";
}

function PublishedPanel({ handoff }: { handoff: ReviewHandoffDetails }) {
  const { goToStep, session } = useCampaignBuilder();
  const campaign = session.inspiration.campaignName || "Your campaign";
  const sent = handoff.outcome === "sent";
  const postCount = handoff.postCount > 0 ? handoff.postCount : null;
  const postPhrase =
    postCount == null
      ? "your posts"
      : `${postCount} post${postCount === 1 ? "" : "s"}`;
  const reviewerLabel = handoff.reviewerName?.trim() || "your approver";
  const approvalsHref = `/approvals?event=${encodeURIComponent(session.eventId)}`;
  const campaignId = campaignIdLabel(campaign, session.eventId);

  return (
    <section className="handoff-confirm">
      <ComposerTopChrome
        currentStep="published"
        goToStep={goToStep}
        variant="handoff"
        cta={
          <div className="composer-cta-row handoff-chrome-ctas">
            <button
              type="button"
              className="handoff-btn handoff-btn-secondary"
              onClick={() => goToStep("review")}
            >
              Back to Review
            </button>
            <Link href={approvalsHref} className="handoff-btn handoff-btn-primary">
              Open Approvals
            </Link>
          </div>
        }
      />

      <div className="handoff-card">
        <div className="handoff-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
            <path
              d="M5 12.5 10 17.5 19 7.5"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2>{sent ? "Sent for Approval" : "Approved & Scheduled"}</h2>
        <p className="handoff-lede">
          {sent ? (
            <>
              The <strong>{campaign}</strong> campaign
              {postCount != null ? (
                <>
                  {" "}
                  with <strong>{postPhrase}</strong>
                </>
              ) : null}{" "}
              has been sent to <strong>{reviewerLabel}</strong>.
            </>
          ) : (
            <>
              The <strong>{campaign}</strong> campaign
              {postCount != null ? (
                <>
                  {" "}
                  with <strong>{postPhrase}</strong>
                </>
              ) : null}{" "}
              is approved. Scheduling is underway.
            </>
          )}
        </p>

        <div className="handoff-facts">
          {sent ? (
            <>
              <div className="handoff-fact">
                <span className="handoff-fact-label">Reviewer</span>
                <strong>{reviewerLabel}</strong>
              </div>
              <div className="handoff-fact">
                <span className="handoff-fact-label">Email status</span>
                {handoff.notifiedEmail ? (
                  <strong className="handoff-email-ok">
                    <span aria-hidden="true">✓</span>
                    Notified at {handoff.notifiedEmail}
                  </strong>
                ) : (
                  <>
                    <strong>
                      {handoff.emailSkippedReason
                        ? "Email not sent"
                        : "Queued in Approvals"}
                    </strong>
                    {handoff.emailSkippedReason ? (
                      <span className="handoff-fact-note">
                        {handoff.emailSkippedReason}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
              <div className="handoff-fact">
                <span className="handoff-fact-label">Posts count</span>
                <strong>
                  {postCount != null
                    ? `${postCount} Post${postCount === 1 ? "" : "s"}`
                    : "—"}
                </strong>
              </div>
            </>
          ) : (
            <>
              <div className="handoff-fact">
                <span className="handoff-fact-label">Approved by</span>
                <strong>{reviewerLabel}</strong>
              </div>
              <div className="handoff-fact">
                <span className="handoff-fact-label">Status</span>
                <strong className="handoff-email-ok">
                  <span aria-hidden="true">✓</span>
                  Approved &amp; scheduling
                </strong>
              </div>
              <div className="handoff-fact">
                <span className="handoff-fact-label">Posts count</span>
                <strong>
                  {postCount != null
                    ? `${postCount} Post${postCount === 1 ? "" : "s"}`
                    : "—"}
                </strong>
              </div>
            </>
          )}
        </div>

        <div className="handoff-next">
          <strong>What happens next:</strong>{" "}
          <em>
            {sent
              ? "They’ll approve or request changes. Changes come back to Preview, then you re-send."
              : "Track Posted, Scheduled, or Failed status in Approvals."}
          </em>
        </div>

        <div className="handoff-actions">
          <Link href={approvalsHref} className="handoff-btn handoff-btn-primary">
            Open Approvals →
          </Link>
          <button
            type="button"
            className="handoff-btn handoff-btn-secondary"
            onClick={() => goToStep("review")}
          >
            Back to Review
          </button>
        </div>
      </div>

      <p className="handoff-campaign-id">Campaign ID: {campaignId}</p>
    </section>
  );
}
