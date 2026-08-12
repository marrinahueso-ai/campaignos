"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  getLocationHash,
  normalizeLocationHash,
  setLocationHash,
  subscribeToLocationHash,
} from "@/lib/navigation/location-hash";
import {
  computeCampaignHealthPercent,
  computeStepWarnings,
  computeStepperStates,
  type StepperStepState,
} from "@/lib/campaign-builder-v2/health";
import type { CampaignBuilderStepperStepId } from "@/lib/campaign-builder-v2/navigation";
import {
  loadCampaignBuilderSessionAction,
  saveCampaignBuilderSessionAction,
} from "@/lib/campaign-builder-v2/session";
import {
  generateAllContentAction,
  getPlaybookMilestoneStepsAction,
  suggestMilestonesAction,
  uploadInspirationImageAction,
} from "@/lib/campaign-builder-v2/actions";
import {
  milestonesLostOnPlaybookSwitch,
  playbookSwitchConfirmMessage,
  playbookTimelineNeedsSync,
  reconcileMilestonesWithPlaybookSteps,
} from "@/lib/campaign-builder-v2/playbook-milestones";
import { resyncSessionToEventDate } from "@/lib/campaign-builder-v2/resync-event-date";
import { prepareInspirationImagesForServer } from "@/lib/campaign-builder-v2/inspiration-client";
import {
  ensureSharedCaptionsForPlatforms,
} from "@/lib/campaign-builder-v2/caption-utils";
import { defaultEnabledFormats, emptyMilestoneArtwork, normalizeMilestoneArtwork } from "@/lib/campaign-builder-v2/platform-utils";
import {
  brandKitIdForAi,
  hasOrganizationBrandDirection,
  NO_BRAND_KIT_ID,
  resolveBrandKitIdForSession,
} from "@/lib/campaign-builder-v2/brand-kit";
import { normalizeCreativeSelections } from "@/lib/campaign-builder-v2/creative-config";
import {
  DEFAULT_BRAND_KIT_OPTIONS,
  DEFAULT_PLAYBOOK_OPTIONS,
  DEFAULT_VOICE_TONE_OPTIONS,
  localSessionKey,
} from "@/lib/campaign-builder-v2/seed-data";
import {
  applyResolvedApproverToWorkflow,
  type ResolvedWorkflowApprover,
} from "@/lib/campaign-builder-v2/approval-workflow";
import {
  hydrateCampaignBuilderSession,
  localHasAuthoritativeMilestoneStructure,
  protectSessionFromRichnessDowngrade,
} from "@/lib/campaign-builder-v2/normalize-session";
import {
  applyArtworkBackup,
  loadArtworkBackup,
  persistArtworkBackup,
} from "@/lib/campaign-builder-v2/artwork-backup";
import {
  mergeInspirationAfterGeneration,
  resolveInspirationImagesForStorage,
} from "@/lib/campaign-builder-v2/inspiration-preserve";
import {
  applyArtworkWithMainEventReuse,
  detachMainEventImage,
  healSharedFeedArtworkGaps,
  isReusableArtwork,
  reapplyMainEventImageAfterPlanChange,
  resolveDisplayMainEventImage,
  seedMainEventImageAcrossPlan,
} from "@/lib/campaign-builder-v2/main-event-image";
import {
  captionPlatformsForFormats,
  findNextMilestoneToGenerate,
  GENERATION_STALL_TIMEOUT_MS,
  GENERATION_STALL_WARNING_MS,
  inferGenerationStatus,
  isStaleGeneration,
  preserveApprovalWorkflowStatus,
} from "@/lib/campaign-builder-v2/milestone-status";
import {
  campaignBuilderHref,
  isValidCampaignBuilderStep,
  stepFromHash,
} from "@/lib/campaign-builder-v2/navigation";
import { shouldRetainInMemorySessionOnHydrate } from "@/lib/campaign-builder-v2/session-identity";
import { isServerActionTransportError } from "@/lib/next/server-action-transport";
import type {
  BrandKitOption,
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
  CampaignBuilderSession,
  CampaignBuilderStepId,
  CampaignOption,
  MilestoneArtwork,
  MilestonePreviewContent,
  PlaybookOption,
  PreviewTabId,
  StepWarning,
} from "@/lib/campaign-builder-v2/types";
import type { SetupLogoOption } from "@/lib/artwork-v2/setup-logos";
import { ARTWORK_V2_MAX_INSPIRATION_IMAGES } from "@/lib/artwork-v2/constants";

export interface CampaignBuilderSchoolColors {
  primary: string | null;
  secondary: string | null;
}

export interface ContentGenerationProgress {
  current: number;
  total: number;
  milestoneName: string;
}

interface CampaignBuilderProviderProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  organizationId: string;
  canUseDeveloperTools?: boolean;
  canUploadArtwork?: boolean;
  playbooks: PlaybookOption[];
  brandKits: BrandKitOption[];
  campaignOptions: CampaignOption[];
  logoOptions: SetupLogoOption[];
  schoolColors: CampaignBuilderSchoolColors;
  mascot?: string | null;
  initialSession: CampaignBuilderSession;
  restoredFromServer: boolean;
  /** Org-resolved default approver for Review sidebar (same path as send-for-approval). */
  resolvedWorkflowApprover?: ResolvedWorkflowApprover | null;
  /** Distinct Team Access approver → Review footer shows Send for approval. */
  hasExternalReviewer?: boolean;
  children: ReactNode;
}

interface CampaignBuilderContextValue {
  session: CampaignBuilderSession;
  currentStep: CampaignBuilderStepId;
  healthPercent: number;
  stepperStates: Record<CampaignBuilderStepperStepId, StepperStepState>;
  stepWarnings: StepWarning[];
  playbookOptions: PlaybookOption[];
  brandKitOptions: BrandKitOption[];
  voiceToneOptions: string[];
  campaignOptions: CampaignOption[];
  logoOptions: SetupLogoOption[];
  schoolColors: CampaignBuilderSchoolColors;
  mascot: string | null;
  isSaving: boolean;
  isGeneratingContent: boolean;
  generatingMilestoneId: string | null;
  generationProgress: ContentGenerationProgress | null;
  goToStep: (step: CampaignBuilderStepId) => void;
  updateInspiration: (patch: Partial<CampaignBuilderInspiration>) => void;
  setPlaybookId: (
    playbookId: string,
  ) => Promise<{ success: boolean; message?: string }>;
  selectCampaign: (campaignId: string) => void;
  addInspirationImage: (file: File) => void;
  /** Attach a published Background Library URL as inspiration (bumps usage). */
  addInspirationFromLibrary: (asset: {
    id: string;
    publicUrl: string;
    title: string;
  }) => { success: boolean; message?: string };
  removeInspirationImage: (imageId: string) => void;
  updateInspirationImage: (
    imageId: string,
    patch: Partial<CampaignBuilderInspiration["inspirationImages"][number]>,
  ) => void;
  uploadCampaignLogo: (file: File) => Promise<void>;
  setMilestones: (milestones: CampaignBuilderMilestone[]) => void;
  reorderMilestones: (fromIndex: number, toIndex: number) => void;
  moveMilestone: (id: string, direction: "up" | "down") => void;
  addMilestone: () => void;
  /**
   * Create a volunteer or thank-you post, select it, and return its id
   * (for deep links from Event Volunteers).
   */
  createDirectedPost: (kind: "volunteer" | "thank_you") => string;
  updateMilestone: (id: string, patch: Partial<CampaignBuilderMilestone>) => void;
  removeMilestone: (id: string) => void;
  duplicateMilestone: (id: string) => void;
  suggestMilestones: () => Promise<void>;
  flushSave: () => Promise<void>;
  /** Normalize creative None/empty, persist session, go to milestones — never generates. */
  saveCreativeSetupAndContinue: () => Promise<{ success: boolean; message?: string }>;
  generateMilestoneContent: (
    milestoneId: string,
    options?: {
      milestonePatch?: Partial<CampaignBuilderMilestone> & { id: string };
    },
  ) => Promise<{ success: boolean; message: string }>;
  generateNextMilestone: () => Promise<{ success: boolean; message: string }>;
  /** @deprecated Use generateMilestoneContent with a milestoneId instead. */
  generateAllContent: (options?: {
    milestoneId?: string;
    milestonePatch?: Partial<CampaignBuilderMilestone> & { id: string };
  }) => Promise<{ success: boolean; message: string }>;
  inspirationUploadError: string | null;
  clearInspirationUploadError: () => void;
  setSelectedMilestoneId: (id: string | null) => void;
  setPreviewTab: (tab: PreviewTabId) => void;
  updatePreviewContent: (
    milestoneId: string,
    patch: Partial<MilestonePreviewContent>,
  ) => void;
  /**
   * Apply artwork with main-event-image reuse (shared countdown posts).
   * Returns milestone ids whose artwork URLs changed (for hero sync).
   */
  applyMilestoneArtwork: (
    milestoneId: string,
    artwork: MilestoneArtwork,
    options?: { asCustom?: boolean },
  ) => string[];
  detachMilestoneFromMainImage: (milestoneId: string) => void;
  setReviewFilter: (filter: CampaignBuilderSession["reviewFilter"]) => void;
  toggleExpandedReview: (milestoneId: string) => void;
  reconcilePreviewStatuses: () => void;
  navigateToWarning: (warning: StepWarning) => void;
  organizationId: string;
  canUseDeveloperTools: boolean;
  canUploadArtwork: boolean;
  /** Distinct Team Access approver (not self / unassigned) for Review primary CTA. */
  hasExternalReviewer: boolean;
  clearMilestoneGeneratedContent: (
    milestoneId: string,
  ) => Promise<{
    success: boolean;
    message: string;
    artworkCleared: number;
    captionsCleared: number;
  }>;
}

const CampaignBuilderContext = createContext<CampaignBuilderContextValue | null>(
  null,
);

function createMilestoneId(): string {
  return `ms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sortMilestones(milestones: CampaignBuilderMilestone[]): CampaignBuilderMilestone[] {
  return [...milestones]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((milestone, index) => ({ ...milestone, sortOrder: index }));
}

function renumberMilestones(
  milestones: CampaignBuilderMilestone[],
): CampaignBuilderMilestone[] {
  return milestones.map((milestone, index) => ({
    ...milestone,
    sortOrder: index,
  }));
}

function sortedMilestones(
  milestones: CampaignBuilderMilestone[],
): CampaignBuilderMilestone[] {
  return [...milestones].sort((a, b) => a.sortOrder - b.sortOrder);
}

function buildNewMilestone(
  inspiration: CampaignBuilderInspiration,
  sortOrder: number,
): { milestone: CampaignBuilderMilestone; preview: MilestonePreviewContent } {
  const id = createMilestoneId();
  const milestone: CampaignBuilderMilestone = {
    id,
    name: "New post",
    category: "reminder",
    purpose: "Describe the purpose of this post",
    suggestedDate: inspiration.eventDate,
    platforms: ["facebook", "instagram"],
    platformFormats: defaultEnabledFormats(),
    artworkNotes: "",
    captionNotes: "",
    statusTag: "not-started",
    sortOrder,
  };
  const preview: MilestonePreviewContent = {
    milestoneId: id,
    status: "draft",
    generationStatus: "ready_to_generate",
    generationStartedAt: null,
    artwork: emptyMilestoneArtwork(),
    captions: [
      { platform: "facebook", text: "" },
      { platform: "instagram", text: "" },
    ],
    enabledFormats: defaultEnabledFormats(),
    deliveryMethod: "publish-now",
    scheduleDate: inspiration.eventDate,
    scheduleTime: "09:00",
    emailSendDate: inspiration.eventDate,
    emailSendTime: "09:00",
    manualEmailTo: "marrina@heyralli.com",
    manualUploadLink: "",
    approvalStatuses: [
      {
        role: "creator",
        label: "Creator",
        status: "not-started",
        timestamp: null,
      },
      {
        role: "committee-chair",
        label: "Committee Chair",
        status: "not-started",
        timestamp: null,
      },
      {
        role: "vp-comms",
        label: "VP Communications",
        status: "not-started",
        timestamp: null,
      },
    ],
  };
  return { milestone, preview };
}

function readStoredLocalSession(eventId: string): CampaignBuilderSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(localSessionKey(eventId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as CampaignBuilderSession;
  } catch {
    return null;
  }
}

function slimSessionForLocalStorage(
  session: CampaignBuilderSession,
  previouslyStored?: CampaignBuilderSession | null,
): CampaignBuilderSession {
  // Persist http(s) inspiration URLs only. While a blob upload is in flight,
  // keep previously stored http inspiration so skip-unchanged cannot treat a
  // blob-only slim as "unchanged empty" and leave localStorage wiped.
  const inspirationImages = resolveInspirationImagesForStorage(
    session.inspiration.inspirationImages,
    previouslyStored?.inspiration?.inspirationImages,
  );

  return {
    ...session,
    inspiration: {
      ...session.inspiration,
      inspirationImages,
      uploadedLogoUrl:
        session.inspiration.uploadedLogoUrl?.startsWith("data:")
          ? null
          : session.inspiration.uploadedLogoUrl,
    },
  };
}

const lastLocalSessionJsonByEventId = new Map<string, string>();

function persistLocalSession(session: CampaignBuilderSession): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const previouslyStored = readStoredLocalSession(session.eventId);
  const slimmed = slimSessionForLocalStorage(session, previouslyStored);
  const slimmedJson = JSON.stringify(slimmed);
  if (lastLocalSessionJsonByEventId.get(session.eventId) === slimmedJson) {
    return true;
  }

  // Always try the compact artwork backup first — it must survive even when
  // the full session JSON is too large for localStorage.
  persistArtworkBackup(session);
  try {
    localStorage.setItem(localSessionKey(session.eventId), slimmedJson);
    lastLocalSessionJsonByEventId.set(session.eventId, slimmedJson);
    return true;
  } catch {
    // Quota or private mode — shrink captions/notes, but NEVER clear inspiration
    // http URLs. Wiping inspiration mid-campaign made later milestones diverge.
    try {
      const minimal: CampaignBuilderSession = {
        ...slimmed,
        previewContents: slimmed.previewContents.map((content) => ({
          ...content,
          captions: content.captions.map((caption) => ({
            ...caption,
            text: caption.text.slice(0, 500),
          })),
        })),
      };
      const minimalJson = JSON.stringify(minimal);
      localStorage.setItem(localSessionKey(session.eventId), minimalJson);
      lastLocalSessionJsonByEventId.set(session.eventId, minimalJson);
      return true;
    } catch {
      console.error(
        "Campaign builder: could not persist session to localStorage. Artwork backup may still be available.",
      );
      return false;
    }
  }
}

function loadLocalSession(eventId: string): CampaignBuilderSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(localSessionKey(eventId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CampaignBuilderSession;
    return applyArtworkBackup(parsed, loadArtworkBackup(eventId));
  } catch {
    return null;
  }
}

function applyResolvedApproverToSession(
  session: CampaignBuilderSession,
  resolved: ResolvedWorkflowApprover | null | undefined,
): CampaignBuilderSession {
  if (!resolved) {
    return session;
  }
  return {
    ...session,
    approvalWorkflow: applyResolvedApproverToWorkflow(
      session.approvalWorkflow,
      resolved,
    ),
  };
}

function hydrateWithArtworkBackup(
  base: CampaignBuilderSession | Partial<CampaignBuilderSession>,
  local: CampaignBuilderSession | null,
  eventId: string,
  eventTitle: string,
  eventDate: string,
  restoredFromServer: boolean,
  resolvedWorkflowApprover?: ResolvedWorkflowApprover | null,
): CampaignBuilderSession {
  const hydrated = hydrateCampaignBuilderSession(
    base,
    local,
    eventId,
    eventTitle,
    eventDate,
    restoredFromServer,
  );
  const withArtwork = applyArtworkBackup(hydrated, loadArtworkBackup(eventId));
  const healed = healSharedFeedArtworkGaps(withArtwork).session;
  // Always re-apply org approvers after local merge so persisted "Sarah M."
  // (or other stale demo names) cannot win over Team Access resolution.
  return applyResolvedApproverToSession(healed, resolvedWorkflowApprover);
}

function stepSessionKey(eventId: string): string {
  return `campaign-builder-v2-step:${eventId}`;
}

function persistBuilderStep(eventId: string, step: CampaignBuilderStepId): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(stepSessionKey(eventId), step);
  } catch {
    // ignore quota / private mode errors
  }
}

function previewSessionRichness(session: CampaignBuilderSession): number {
  return session.previewContents.reduce((sum, content) => {
    let score = 0;
    if (content.artwork.feedUrl || content.artwork.storyUrl) {
      score += 10;
    }
    if (content.captions.some((caption) => caption.text.trim())) {
      score += 1;
    }
    return sum + score;
  }, 0);
}

async function recoverSessionFromServerIfRicher(
  local: CampaignBuilderSession,
  eventTitle: string,
  eventDate: string,
): Promise<CampaignBuilderSession | null> {
  try {
    const server = await loadCampaignBuilderSessionAction(local.eventId);
    if (!server) {
      return null;
    }
    // Never "recover" a longer server post list over intentional deletes
    // just because deleted rows still have richer artwork on the server.
    if (localHasAuthoritativeMilestoneStructure(local, server)) {
      return null;
    }
    if (previewSessionRichness(server) <= previewSessionRichness(local)) {
      return null;
    }
    return hydrateCampaignBuilderSession(
      protectSessionFromRichnessDowngrade(local, server),
      local,
      local.eventId,
      eventTitle,
      eventDate,
      true,
    );
  } catch {
    return null;
  }
}

export function CampaignBuilderProvider({
  eventId,
  eventTitle,
  eventDate,
  organizationId,
  canUseDeveloperTools = false,
  canUploadArtwork = true,
  playbooks,
  brandKits,
  campaignOptions,
  logoOptions,
  schoolColors,
  mascot = null,
  initialSession,
  restoredFromServer,
  resolvedWorkflowApprover = null,
  hasExternalReviewer = false,
  children,
}: CampaignBuilderProviderProps) {
  const router = useRouter();
  const hasBrandDirection = hasOrganizationBrandDirection({
    primaryColor: schoolColors.primary,
    secondaryColor: schoolColors.secondary,
    ptoLogo: logoOptions.some((logo) => logo.id === "pto")
      ? "pto"
      : null,
    schoolLogo: logoOptions.some((logo) => logo.id === "school")
      ? "school"
      : null,
    mascot,
    brandKitItemCount: logoOptions.length,
  });
  const [session, setSession] = useState<CampaignBuilderSession>(() => {
    const hydrated = hydrateWithArtworkBackup(
      initialSession,
      loadLocalSession(eventId),
      eventId,
      eventTitle,
      eventDate,
      restoredFromServer,
      resolvedWorkflowApprover,
    );
    // Never auto-apply org brand kit from localStorage / seed — Creative Setup
    // art direction is opt-in via logo, colors, and tone controls only.
    return {
      ...hydrated,
      inspiration: {
        ...hydrated.inspiration,
        brandKitId: resolveBrandKitIdForSession(
          hydrated.inspiration.brandKitId,
          hasBrandDirection,
        ),
        primarySchoolColor:
          schoolColors.primary ?? hydrated.inspiration.primarySchoolColor,
        secondarySchoolColor:
          schoolColors.secondary ?? hydrated.inspiration.secondarySchoolColor,
      },
    };
  });
  const [currentStep, setCurrentStep] = useState<CampaignBuilderStepId>(() => {
    const fromHash = stepFromHash(
      typeof window !== "undefined" ? getLocationHash() : "",
    );
    if (typeof window === "undefined") {
      return fromHash;
    }
    const hash = normalizeLocationHash(getLocationHash());
    if (isValidCampaignBuilderStep(hash)) {
      return hash;
    }
    // Soft remounts (revalidatePath / router.refresh) often strip the hash.
    // Restore the last step for this event so we don't bounce to Inspiration.
    const saved = window.sessionStorage.getItem(stepSessionKey(eventId));
    if (saved && isValidCampaignBuilderStep(saved)) {
      return saved;
    }
    return fromHash;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatingMilestoneId, setGeneratingMilestoneId] = useState<string | null>(
    null,
  );
  const [generationProgress, setGenerationProgress] =
    useState<ContentGenerationProgress | null>(null);
  const generationInFlightRef = useRef<Set<string>>(new Set());
  const [inspirationUploadError, setInspirationUploadError] = useState<string | null>(
    null,
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(session);
  const currentStepRef = useRef(currentStep);
  const lastServerSavedJsonRef = useRef<string | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    currentStepRef.current = currentStep;
    persistBuilderStep(eventId, currentStep);
  }, [currentStep, eventId]);

  const saveSessionToServer = useCallback(async (next: CampaignBuilderSession) => {
    const serialized = JSON.stringify(next);
    if (
      lastServerSavedJsonRef.current != null &&
      lastServerSavedJsonRef.current === serialized
    ) {
      return;
    }
    setIsSaving(true);
    try {
      await saveCampaignBuilderSessionAction(next);
      lastServerSavedJsonRef.current = serialized;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const persistSession = useCallback(
    async (next: CampaignBuilderSession) => {
      persistLocalSession(next);
      await saveSessionToServer(next);
    },
    [saveSessionToServer],
  );

  const scheduleSave = useCallback(
    (next: CampaignBuilderSession) => {
      // Write localStorage immediately; debounce only the server round-trip so
      // we do not re-stringify the same session on every timer fire.
      // Always flush the latest sessionRef on the timer — a stale closure from
      // an earlier keystroke must not overwrite a completed inspiration upload.
      persistLocalSession(next);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void saveSessionToServer(sessionRef.current);
      }, 1500);
    },
    [saveSessionToServer],
  );

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await persistSession(sessionRef.current);
  }, [persistSession]);

  const syncMilestonesToSelectedPlaybook = useCallback(
    async (options?: {
      playbookId?: string;
      eventDate?: string;
      confirm?: boolean;
    }): Promise<{ success: boolean; changed: boolean; message?: string }> => {
      const current = sessionRef.current;
      const playbookId =
        options?.playbookId ?? current.inspiration.playbookId;
      const resolvedEventDate =
        options?.eventDate ?? current.inspiration.eventDate ?? eventDate;
      const milestonesPlaybookId = current.milestonesPlaybookId ?? null;

      if (!playbookId) {
        return { success: true, changed: false };
      }

      const stepsResult = await getPlaybookMilestoneStepsAction(playbookId);
      if (!stepsResult.success) {
        return {
          success: false,
          changed: false,
          message: "Could not load communication plan posts.",
        };
      }

      // Keep existing milestones when the communication plan has no steps in the DB
      // (e.g. a demo/legacy communication plan id that was never a real row).
      // Still mark the communication plan as applied — otherwise inspiration.playbookId
      // drifts from milestonesPlaybookId and a later navigation rebuilds and
      // can wipe generated artwork.
      if (stepsResult.steps.length === 0) {
        if (playbookId !== milestonesPlaybookId) {
          const aligned: CampaignBuilderSession = {
            ...current,
            inspiration: {
              ...current.inspiration,
              playbookId,
            },
            milestonesPlaybookId: playbookId,
          };
          sessionRef.current = aligned;
          setSession(aligned);
          return { success: true, changed: true };
        }
        return { success: true, changed: false };
      }

      // Same plan id is not enough — Settings may have changed step count or
      // relative days, and stale sessions can keep wrong dates (e.g. April
      // posts for an August event). Rebuild when the timeline drifts.
      if (
        playbookId === milestonesPlaybookId &&
        !playbookTimelineNeedsSync(
          stepsResult.steps,
          resolvedEventDate,
          current.milestones,
        )
      ) {
        return { success: true, changed: false };
      }

      const atRisk = milestonesLostOnPlaybookSwitch(
        stepsResult.steps,
        current.milestones,
        current.previewContents,
      );
      if (atRisk.length > 0 && options?.confirm !== false) {
        const confirmed = window.confirm(
          playbookSwitchConfirmMessage(atRisk),
        );
        if (!confirmed) {
          return {
            success: false,
            changed: false,
            message: "Communication plan change canceled — posts unchanged.",
          };
        }
      }

      const rebuilt = reconcileMilestonesWithPlaybookSteps(
        stepsResult.steps,
        resolvedEventDate,
        current.milestones,
        current.previewContents,
      );

      const selectedStillPresent = rebuilt.milestones.some(
        (milestone) => milestone.id === current.selectedMilestoneId,
      );

      const rebuiltSession: CampaignBuilderSession = {
        ...current,
        inspiration: {
          ...current.inspiration,
          playbookId,
        },
        milestones: rebuilt.milestones,
        previewContents: rebuilt.previewContents,
        milestonesPlaybookId: playbookId,
        selectedMilestoneId: selectedStillPresent
          ? current.selectedMilestoneId
          : (rebuilt.milestones[0]?.id ?? null),
      };
      // Keep Event Image across plan switches and fill empty posts on the new timeline.
      const next = reapplyMainEventImageAfterPlanChange(
        rebuiltSession,
        current,
      ).session;
      sessionRef.current = next;
      setSession(next);
      return { success: true, changed: true };
    },
    [eventDate],
  );

  /**
   * Creative Setup primary CTA: normalize None/empty, save session, navigate
   * to milestones. Never generates artwork/captions or marks milestones complete.
   */
  const saveCreativeSetupAndContinue = useCallback(async () => {
    const pendingUpload = sessionRef.current.inspiration.inspirationImages.some(
      (image) => !image.url && image.previewUrl?.startsWith("blob:"),
    );
    if (pendingUpload) {
      return {
        success: false,
        message:
          "Wait for inspiration image uploads to finish before continuing.",
      };
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const normalizedInspiration = normalizeCreativeSelections(
      sessionRef.current.inspiration,
    );

    const withNormalized: CampaignBuilderSession = {
      ...sessionRef.current,
      inspiration: normalizedInspiration,
    };
    sessionRef.current = withNormalized;
    setSession(withNormalized);

    const syncResult = await syncMilestonesToSelectedPlaybook({
      playbookId: normalizedInspiration.playbookId,
      eventDate: normalizedInspiration.eventDate,
    });
    if (!syncResult.success) {
      return {
        success: false,
        message: syncResult.message,
      };
    }

    const next: CampaignBuilderSession = {
      ...sessionRef.current,
      currentStep: "preview",
    };
    sessionRef.current = next;
    setSession(next);
    setLocationHash("preview");
    setCurrentStep("preview");
    await persistSession(next);
    return { success: true };
  }, [persistSession, syncMilestonesToSelectedPlaybook]);

  const updateSession = useCallback(
    (updater: (prev: CampaignBuilderSession) => CampaignBuilderSession) => {
      setSession((prev) => {
        const next = updater(prev);
        // Keep sessionRef in lockstep — goToStep / sync read sessionRef and
        // must not race a pending React effect after removeMilestone.
        sessionRef.current = next;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  useEffect(() => {
    const localForHydrate = loadLocalSession(eventId);
    const hydrated = hydrateWithArtworkBackup(
      initialSession,
      localForHydrate,
      eventId,
      eventTitle,
      eventDate,
      restoredFromServer,
      resolvedWorkflowApprover,
    );

    setSession((prev) => {
      const prevRichness = previewSessionRichness(prev);
      const hydratedRichness = previewSessionRichness(hydrated);
      const localRichness = localForHydrate
        ? previewSessionRichness(localForHydrate)
        : 0;

      // Never let a remount hydrate overwrite richer in-memory artwork with a
      // stale server/default snapshot — but only for the SAME campaign.
      // Switching eventId must drop the previous campaign's previews.
      if (
        shouldRetainInMemorySessionOnHydrate({
          previousEventId: prev.eventId,
          routeEventId: eventId,
          previousRichness: prevRichness,
          hydratedRichness,
        })
      ) {
        const retained = applyResolvedApproverToSession(
          prev,
          resolvedWorkflowApprover,
        );
        // Richness retention must not keep a stale Campaign Date from an
        // older session snapshot (e.g. October after switching to August).
        const dateBound = resyncSessionToEventDate(
          {
            ...retained,
            eventId,
            inspiration: {
              ...retained.inspiration,
              campaignId: eventId,
              campaignName: eventTitle || retained.inspiration.campaignName,
            },
          },
          eventDate,
        );
        sessionRef.current = dateBound;
        persistLocalSession(dateBound);
        return dateBound;
      }

      if (
        localRichness > hydratedRichness &&
        localForHydrate &&
        localForHydrate.eventId === eventId
      ) {
        const keepLocal = hydrateWithArtworkBackup(
          localForHydrate,
          null,
          eventId,
          eventTitle,
          eventDate,
          false,
          resolvedWorkflowApprover,
        );
        sessionRef.current = keepLocal;
        persistLocalSession(keepLocal);
        return keepLocal;
      }

      const changed = hydrated.previewContents.some((content) => {
        const previous = prev.previewContents.find(
          (entry) => entry.milestoneId === content.milestoneId,
        );
        if (!previous) {
          return true;
        }
        return (
          previous.generationStatus !== content.generationStatus ||
          previous.artwork.feedUrl !== content.artwork.feedUrl ||
          previous.artwork.storyUrl !== content.artwork.storyUrl
        );
      });

      const workflowChanged =
        JSON.stringify(prev.approvalWorkflow) !==
        JSON.stringify(hydrated.approvalWorkflow);

      if (
        !changed &&
        !workflowChanged &&
        hydrated.previewContents.length === prev.previewContents.length
      ) {
        const dateBound = resyncSessionToEventDate(
          {
            ...prev,
            eventId,
            inspiration: {
              ...prev.inspiration,
              campaignId: eventId,
              campaignName: eventTitle || prev.inspiration.campaignName,
            },
          },
          eventDate,
        );
        if (dateBound !== prev) {
          sessionRef.current = dateBound;
          persistLocalSession(dateBound);
          return dateBound;
        }
        return prev;
      }

      sessionRef.current = hydrated;
      // Only write back when hydrated is at least as rich as what we already
      // have locally — never clobber a good local cache with an empty merge.
      if (hydratedRichness >= localRichness || workflowChanged) {
        persistLocalSession(hydrated);
      }
      return hydrated;
    });
    // Reconcile persisted milestone statuses once per mount after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, eventTitle, eventDate, resolvedWorkflowApprover]);

  // If the client is stuck on an empty/failed Preview while the server has
  // richer artwork (common after Storage RLS errors), pull it back once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const local = sessionRef.current;
      if (previewSessionRichness(local) > 0) {
        return;
      }
      const recovered = await recoverSessionFromServerIfRicher(
        local,
        eventTitle,
        eventDate,
      );
      if (cancelled || !recovered) {
        return;
      }
      const withApprover = applyResolvedApproverToSession(
        recovered,
        resolvedWorkflowApprover,
      );
      sessionRef.current = withApprover;
      setSession(withApprover);
      persistLocalSession(withApprover);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, eventTitle, eventDate, resolvedWorkflowApprover]);

  // After hydrate: Creative Setup must mirror the selected communication plan.
  // Stale sessions often keep an older 6-post timeline (with artwork) after
  // Settings drops to 4 steps — force-reconcile so Maps to / dates catch up.
  useEffect(() => {
    if (currentStep !== "inspiration") {
      return;
    }
    let cancelled = false;
    void (async () => {
      const current = sessionRef.current;
      const playbookId = current.inspiration.playbookId;
      if (!playbookId) {
        return;
      }
      const resolvedEventDate = current.inspiration.eventDate || eventDate;
      const stepsResult = await getPlaybookMilestoneStepsAction(playbookId);
      if (
        cancelled ||
        !stepsResult.success ||
        stepsResult.steps.length === 0 ||
        !playbookTimelineNeedsSync(
          stepsResult.steps,
          resolvedEventDate,
          current.milestones,
        )
      ) {
        return;
      }
      const syncResult = await syncMilestonesToSelectedPlaybook({
        playbookId,
        eventDate: resolvedEventDate,
        confirm: false,
      });
      if (!cancelled && syncResult.changed) {
        await persistSession(sessionRef.current);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    currentStep,
    eventDate,
    eventId,
    persistSession,
    session.inspiration.eventDate,
    session.inspiration.playbookId,
    session.milestones.length,
    syncMilestonesToSelectedPlaybook,
  ]);

  const reconcilePreviewStatuses = useCallback(() => {
    setSession((prev) => {
      const next = hydrateWithArtworkBackup(
        prev,
        loadLocalSession(eventId),
        eventId,
        eventTitle,
        eventDate,
        true,
        resolvedWorkflowApprover,
      );

      if (previewSessionRichness(prev) > previewSessionRichness(next)) {
        return prev;
      }

      const changed = next.previewContents.some((content) => {
        const previous = prev.previewContents.find(
          (entry) => entry.milestoneId === content.milestoneId,
        );
        if (!previous) {
          return true;
        }
        return previous.generationStatus !== content.generationStatus;
      });

      if (!changed) {
        return prev;
      }

      sessionRef.current = next;
      scheduleSave(next);
      return next;
    });
  }, [
    eventId,
    eventTitle,
    eventDate,
    resolvedWorkflowApprover,
    scheduleSave,
  ]);

  const syncStepFromLocationHash = useCallback(() => {
    const normalized = normalizeLocationHash(getLocationHash());

    // App Router soft navigations (e.g. after revalidatePath) can call
    // history.replaceState without the hash fragment, which would otherwise
    // reset the builder to the default inspiration step.
    if (!isValidCampaignBuilderStep(normalized)) {
      const lastStep = currentStepRef.current;
      if (isValidCampaignBuilderStep(lastStep) && lastStep !== "inspiration") {
        setLocationHash(lastStep);
        return;
      }
      const saved =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem(stepSessionKey(eventId))
          : null;
      if (saved && isValidCampaignBuilderStep(saved)) {
        setLocationHash(saved);
        setCurrentStep(saved);
        return;
      }
    }

    setCurrentStep(stepFromHash(getLocationHash()));
  }, [eventId]);

  useEffect(() => {
    syncStepFromLocationHash();
    return subscribeToLocationHash(syncStepFromLocationHash);
  }, [syncStepFromLocationHash]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const hash = normalizeLocationHash(getLocationHash());
    if (isValidCampaignBuilderStep(hash)) {
      persistBuilderStep(eventId, hash);
      return;
    }
    const saved = window.sessionStorage.getItem(stepSessionKey(eventId));
    if (saved && isValidCampaignBuilderStep(saved)) {
      setLocationHash(saved);
      return;
    }
    setLocationHash("inspiration");
  }, [eventId]);

  const goToStep = useCallback(
    (step: CampaignBuilderStepId) => {
      void (async () => {
        // Legacy Posts step (#milestones) lives inside Preview now.
        const targetStep = step === "milestones" ? "preview" : step;
        const leavingInspiration = currentStepRef.current === "inspiration";

        // Navigate immediately so soft remounts (revalidatePath after send /
        // approve) land on the target step — especially #published confirmation.
        // Persist step before any await; flush runs after.
        if (targetStep !== "preview" && targetStep !== "review") {
          setGenerationProgress(null);
        }
        setLocationHash(targetStep);
        setCurrentStep(targetStep);
        currentStepRef.current = targetStep;
        persistBuilderStep(eventId, targetStep);
        updateSession((prev) => ({ ...prev, currentStep: targetStep }));

        // Only reconcile when leaving Creative Setup. Auto-syncing on every
        // Preview hop when communication plan ids drift rebuilt milestones
        // mid-generation and erased artwork the user just created.
        let syncChanged = false;
        if (leavingInspiration) {
          const syncResult = await syncMilestonesToSelectedPlaybook();
          if (!syncResult.success) {
            return;
          }
          syncChanged = syncResult.changed;
        } else {
          // Heal drift without rebuilding: keep the milestones the user already
          // generated against, and treat that playbook as the applied one.
          const current = sessionRef.current;
          const appliedId = current.milestonesPlaybookId;
          const selectedId = current.inspiration.playbookId;
          if (appliedId && selectedId && appliedId !== selectedId) {
            const healed: CampaignBuilderSession = {
              ...current,
              inspiration: {
                ...current.inspiration,
                playbookId: appliedId,
              },
            };
            sessionRef.current = healed;
            setSession(healed);
            syncChanged = true;
          }
        }
        if (leavingInspiration) {
          setInspirationUploadError(null);
        }
        // Flush after navigate so deletions still persist before Preview work,
        // without losing #published to a remount mid-await.
        if (syncChanged) {
          await persistSession(sessionRef.current);
        } else {
          await flushSave();
        }
      })();
    },
    [
      eventId,
      flushSave,
      persistSession,
      syncMilestonesToSelectedPlaybook,
      updateSession,
    ],
  );

  // Clear finished generation progress so non-active step UI state is not kept hot.
  useEffect(() => {
    if (!isGeneratingContent && generationProgress) {
      setGenerationProgress(null);
    }
  }, [isGeneratingContent, generationProgress]);

  const updateInspiration = useCallback(
    (patch: Partial<CampaignBuilderInspiration>) => {
      updateSession((prev) => ({
        ...prev,
        inspiration: { ...prev.inspiration, ...patch },
      }));
    },
    [updateSession],
  );

  const setPlaybookId = useCallback(
    async (
      playbookId: string,
    ): Promise<{ success: boolean; message?: string }> => {
      const previous = sessionRef.current;
      const optimistic: CampaignBuilderSession = {
        ...previous,
        inspiration: {
          ...previous.inspiration,
          playbookId,
        },
      };
      sessionRef.current = optimistic;
      setSession(optimistic);

      const syncResult = await syncMilestonesToSelectedPlaybook({
        playbookId,
      });
      if (!syncResult.success) {
        const reverted: CampaignBuilderSession = {
          ...sessionRef.current,
          inspiration: {
            ...sessionRef.current.inspiration,
            playbookId: previous.inspiration.playbookId,
          },
          milestones: previous.milestones,
          previewContents: previous.previewContents,
          milestonesPlaybookId: previous.milestonesPlaybookId,
          selectedMilestoneId: previous.selectedMilestoneId,
        };
        sessionRef.current = reverted;
        setSession(reverted);
        return {
          success: false,
          message:
            syncResult.message ??
            "Communication plan change canceled — posts unchanged.",
        };
      }

      await persistSession(sessionRef.current);
      return { success: true };
    },
    [persistSession, syncMilestonesToSelectedPlaybook],
  );

  const selectCampaign = useCallback(
    (campaignId: string) => {
      const campaign = campaignOptions.find((option) => option.id === campaignId);
      if (!campaign) {
        return;
      }

      // The campaign dropdown lists other events. Switching must open that
      // event's Create with AI workspace — never rename the current session
      // while keeping another campaign's artwork/captions.
      if (campaign.id !== eventId) {
        void flushSave().finally(() => {
          router.push(campaignBuilderHref(campaign.id, currentStepRef.current));
        });
        return;
      }

      updateSession((prev) =>
        resyncSessionToEventDate(
          {
            ...prev,
            eventId: campaign.id,
            inspiration: {
              ...prev.inspiration,
              campaignId: campaign.id,
              campaignName: campaign.title,
            },
          },
          campaign.date,
        ),
      );
    },
    [campaignOptions, eventId, flushSave, router, updateSession],
  );

  const addInspirationImage = useCallback(
    (file: File) => {
      if (!canUploadArtwork) {
        setInspirationUploadError(
          "You do not have permission to upload artwork.",
        );
        return;
      }

      const imageId = `inspiration-${Date.now()}`;
      const previewUrl = URL.createObjectURL(file);
      setInspirationUploadError(null);
      updateSession((prev) => ({
        ...prev,
        inspiration: {
          ...prev.inspiration,
          inspirationImages: [
            ...prev.inspiration.inspirationImages,
            {
              id: imageId,
              label: file.name,
              url: null,
              previewUrl,
            },
          ],
        },
      }));

      void (async () => {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("label", file.name);
        formData.set("id", imageId);
        const result = await uploadInspirationImageAction(eventId, formData);
        if (!result.success || !result.image?.url) {
          setInspirationUploadError(
            result.message || "Could not upload inspiration image.",
          );
          updateSession((prev) => ({
            ...prev,
            inspiration: {
              ...prev.inspiration,
              inspirationImages: prev.inspiration.inspirationImages.filter(
                (image) => image.id !== imageId,
              ),
            },
          }));
          if (previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(previewUrl);
          }
          return;
        }

        updateSession((prev) => ({
          ...prev,
          inspiration: {
            ...prev.inspiration,
            inspirationImages: prev.inspiration.inspirationImages.map((image) =>
              image.id === imageId
                ? {
                    ...image,
                    url: result.image!.url,
                    previewUrl: result.image!.url,
                  }
                : image,
            ),
          },
        }));
      })();
    },
    [canUploadArtwork, eventId, updateSession],
  );

  const addInspirationFromLibrary = useCallback(
    (asset: { id: string; publicUrl: string; title: string }) => {
      if (!canUploadArtwork) {
        setInspirationUploadError(
          "You do not have permission to upload artwork.",
        );
        return { success: false, message: "You do not have permission to upload artwork." };
      }
      const url = asset.publicUrl?.trim();
      if (!url) {
        return { success: false, message: "That background has no image URL." };
      }

      const existing = sessionRef.current.inspiration.inspirationImages ?? [];
      if (existing.length >= ARTWORK_V2_MAX_INSPIRATION_IMAGES) {
        const message = `You can attach up to ${ARTWORK_V2_MAX_INSPIRATION_IMAGES} inspiration images.`;
        setInspirationUploadError(message);
        return { success: false, message };
      }
      if (existing.some((image) => image.url === url || image.previewUrl === url)) {
        return { success: true };
      }

      const imageId = `inspiration-library-${asset.id}-${Date.now()}`;
      const label = asset.title?.trim() || "Library background";
      setInspirationUploadError(null);
      updateSession((prev) => ({
        ...prev,
        inspiration: {
          ...prev.inspiration,
          inspirationImages: [
            ...prev.inspiration.inspirationImages,
            {
              id: imageId,
              label,
              url,
              previewUrl: url,
            },
          ],
        },
      }));
      return { success: true };
    },
    [canUploadArtwork, updateSession],
  );

  const removeInspirationImage = useCallback(
    (imageId: string) => {
      updateSession((prev) => {
        const removed = prev.inspiration.inspirationImages.find(
          (image) => image.id === imageId,
        );
        if (removed?.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(removed.previewUrl);
        }
        const inspirationImages = prev.inspiration.inspirationImages.filter(
          (image) => image.id !== imageId,
        );
        const dropInspirationPalette =
          inspirationImages.length === 0 &&
          prev.inspiration.colorMode === "inspiration_palette";
        return {
          ...prev,
          inspiration: {
            ...prev.inspiration,
            inspirationImages,
            ...(dropInspirationPalette
              ? {
                  colorMode: "none" as const,
                  useSchoolColors: false,
                }
              : {}),
          },
        };
      });
    },
    [updateSession],
  );

  const updateInspirationImage = useCallback(
    (
      imageId: string,
      patch: Partial<CampaignBuilderInspiration["inspirationImages"][number]>,
    ) => {
      updateSession((prev) => ({
        ...prev,
        inspiration: {
          ...prev.inspiration,
          inspirationImages: prev.inspiration.inspirationImages.map((image) =>
            image.id === imageId ? { ...image, ...patch } : image,
          ),
        },
      }));
    },
    [updateSession],
  );

  const uploadCampaignLogo = useCallback(
    async (file: File) => {
      if (!canUploadArtwork) {
        setInspirationUploadError(
          "You do not have permission to upload artwork.",
        );
        return;
      }

      const imageId = `logo-upload-${Date.now()}`;
      setInspirationUploadError(null);
      const formData = new FormData();
      formData.set("file", file);
      formData.set("label", file.name);
      formData.set("id", imageId);
      const result = await uploadInspirationImageAction(eventId, formData);
      if (!result.success || !result.image?.url) {
        setInspirationUploadError(
          result.message || "Could not upload logo.",
        );
        return;
      }
      updateSession((prev) => ({
        ...prev,
        inspiration: {
          ...prev.inspiration,
          selectedLogoId: imageId,
          includeLogoInArtwork: true,
          includeLogoInArtworkUserSet: true,
          uploadedLogoUrl: result.image!.url,
          uploadedLogoLabel: file.name,
        },
      }));
    },
    [canUploadArtwork, eventId, updateSession],
  );

  const setMilestones = useCallback(
    (milestones: CampaignBuilderMilestone[]) => {
      updateSession((prev) => ({
        ...prev,
        milestones: sortMilestones(milestones),
      }));
    },
    [updateSession],
  );

  const reorderMilestones = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) {
        return;
      }
      updateSession((prev) => {
        const sorted = sortedMilestones(prev.milestones);
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= sorted.length ||
          toIndex >= sorted.length
        ) {
          return prev;
        }
        const next = [...sorted];
        const [moved] = next.splice(fromIndex, 1);
        if (!moved) {
          return prev;
        }
        next.splice(toIndex, 0, moved);
        return { ...prev, milestones: renumberMilestones(next) };
      });
    },
    [updateSession],
  );

  const moveMilestone = useCallback(
    (id: string, direction: "up" | "down") => {
      updateSession((prev) => {
        const sorted = sortedMilestones(prev.milestones);
        const index = sorted.findIndex((m) => m.id === id);
        if (index < 0) {
          return prev;
        }
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sorted.length) {
          return prev;
        }
        const next = [...sorted];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        return { ...prev, milestones: renumberMilestones(next) };
      });
    },
    [updateSession],
  );

  const addMilestone = useCallback(() => {
    updateSession((prev) => {
      const { milestone, preview } = buildNewMilestone(
        prev.inspiration,
        prev.milestones.length,
      );
      const withNew: CampaignBuilderSession = {
        ...prev,
        milestones: [...prev.milestones, milestone],
        previewContents: [...prev.previewContents, preview],
        selectedMilestoneId: milestone.id,
      };
      // New empty posts inherit the Event Image (same as first-fill waterfall).
      const sharedArt = resolveDisplayMainEventImage(prev);
      if (!sharedArt) {
        return withNew;
      }
      return seedMainEventImageAcrossPlan(withNew, sharedArt).session;
    });
  }, [updateSession]);

  const createDirectedPost = useCallback(
    (kind: "volunteer" | "thank_you") => {
      let createdId = "";
      updateSession((prev) => {
        const { milestone, preview } = buildNewMilestone(
          prev.inspiration,
          prev.milestones.length,
        );
        createdId = milestone.id;
        const directed =
          kind === "thank_you"
            ? {
                ...milestone,
                name: "Thank you",
                purpose: "Thank volunteers who helped staff this event",
                captionNotes:
                  "Warm thank-you to volunteers who signed up and showed up.",
                artworkNotes:
                  "Grateful, celebratory thank-you graphic for volunteers.",
              }
            : {
                ...milestone,
                name: "Volunteer post",
                purpose: "Recruit volunteers for open roles at this event",
                captionNotes:
                  "Ask families to fill open volunteer spots and include the signup link.",
                artworkNotes:
                  "Friendly volunteer recruitment graphic highlighting open roles.",
              };
        const withNew: CampaignBuilderSession = {
          ...prev,
          milestones: [...prev.milestones, directed],
          previewContents: [...prev.previewContents, preview],
          selectedMilestoneId: createdId,
        };
        const sharedArt = resolveDisplayMainEventImage(prev);
        if (!sharedArt) {
          return withNew;
        }
        return seedMainEventImageAcrossPlan(withNew, sharedArt).session;
      });
      return createdId;
    },
    [updateSession],
  );

  const updateMilestone = useCallback(
    (id: string, patch: Partial<CampaignBuilderMilestone>) => {
      updateSession((prev) => {
        const milestones = prev.milestones.map((m) =>
          m.id === id ? { ...m, ...patch } : m,
        );
        const previewContents = prev.previewContents.map((content) => {
          if (content.milestoneId !== id) {
            return content;
          }
          const nextContent = { ...content };
          if (patch.platformFormats) {
            nextContent.enabledFormats = patch.platformFormats;
          }
          if (patch.suggestedDate) {
            nextContent.scheduleDate = patch.suggestedDate;
            nextContent.emailSendDate = patch.suggestedDate;
          }
          return nextContent;
        });
        return { ...prev, milestones, previewContents };
      });
    },
    [updateSession],
  );

  const removeMilestone = useCallback(
    (id: string) => {
      updateSession((prev) => {
        const milestones = prev.milestones.filter((m) => m.id !== id);
        const previewContents = prev.previewContents.filter(
          (c) => c.milestoneId !== id,
        );
        const selectedMilestoneId =
          prev.selectedMilestoneId === id
            ? (milestones[0]?.id ?? null)
            : prev.selectedMilestoneId;
        const sorted = sortMilestones(milestones);
        return {
          ...prev,
          milestones: sorted,
          previewContents,
          selectedMilestoneId,
          // Mark the current playbook as applied so goToStep sync does not
          // rebuild from communication plan posts and resurrect this deletion.
          milestonesPlaybookId:
            prev.inspiration.playbookId ?? prev.milestonesPlaybookId,
          expandedReviewMilestoneIds: prev.expandedReviewMilestoneIds.filter(
            (expandedId) => expandedId !== id,
          ),
        };
      });
    },
    [updateSession],
  );

  const duplicateMilestone = useCallback(
    (id: string) => {
      updateSession((prev) => {
        const source = prev.milestones.find((m) => m.id === id);
        const sourcePreview = prev.previewContents.find((c) => c.milestoneId === id);
        if (!source || !sourcePreview) {
          return prev;
        }
        const newId = createMilestoneId();
        const copy: CampaignBuilderMilestone = {
          ...source,
          id: newId,
          name: `${source.name} (copy)`,
          sortOrder: prev.milestones.length,
        };
        const previewCopy: MilestonePreviewContent = {
          ...sourcePreview,
          milestoneId: newId,
          status: "draft",
          generationStatus: "ready_to_generate",
          generationStartedAt: null,
        };
        return {
          ...prev,
          milestones: [...prev.milestones, copy],
          previewContents: [...prev.previewContents, previewCopy],
          selectedMilestoneId: newId,
        };
      });
    },
    [updateSession],
  );

  const suggestMilestones = useCallback(async () => {
    const brandKitId = brandKitIdForAi(session.inspiration.brandKitId);
    const result = await suggestMilestonesAction({
      eventDate: session.inspiration.eventDate,
      playbookId: session.inspiration.playbookId,
      globalAiGuidance: session.inspiration.globalAiGuidance,
      brandKitId,
      useBrandKit: brandKitId !== null,
    });
    if (!result.success) {
      return;
    }
    updateSession((prev) => ({
      ...prev,
      milestones: result.milestones,
      previewContents: result.previewContents,
      selectedMilestoneId: result.milestones[0]?.id ?? null,
    }));
  }, [session.inspiration, updateSession]);

  const clearInspirationUploadError = useCallback(() => {
    setInspirationUploadError(null);
  }, []);

  const runMilestoneGeneration = useCallback(
    async (
      milestoneId: string,
      options?: {
        milestonePatch?: Partial<CampaignBuilderMilestone> & { id: string };
      },
    ): Promise<{ success: boolean; message: string }> => {
      if (generationInFlightRef.current.has(milestoneId)) {
        return {
          success: false,
          message: "Generation is already in progress for this post.",
        };
      }

      generationInFlightRef.current.add(milestoneId);
      setGeneratingMilestoneId(milestoneId);
      setIsGeneratingContent(true);

      try {
        // Flush any pending debounced save before generating so the server
        // action reads the latest edits. This runs after the in-flight guard
        // above (not before) so a rapid double-click can't slip through
        // during the network round trip and start a second generation job
        // for the same milestone.
        await flushSave();
        let base = sessionRef.current;
        const milestonePatch = options?.milestonePatch;

        if (milestonePatch) {
          const { id, ...patch } = milestonePatch;
          const milestones = base.milestones.map((milestone) =>
            milestone.id === id ? { ...milestone, ...patch } : milestone,
          );
          const previewContents = base.previewContents.map((content) => {
            if (content.milestoneId !== id) {
              return content;
            }
            const nextContent = { ...content };
            if (patch.platformFormats) {
              nextContent.enabledFormats = patch.platformFormats;
            }
            if (patch.suggestedDate) {
              nextContent.scheduleDate = patch.suggestedDate;
              nextContent.emailSendDate = patch.suggestedDate;
            }
            return nextContent;
          });
          base = { ...base, milestones, previewContents };
          sessionRef.current = base;
          setSession(base);
        }

        const startedAt = new Date().toISOString();
        const generatingBase: CampaignBuilderSession = {
          ...base,
          selectedMilestoneId: milestoneId,
          previewContents: base.previewContents.map((content) =>
            content.milestoneId === milestoneId
              ? {
                  ...content,
                  generationStatus: "generating",
                  generationStartedAt: startedAt,
                }
              : content,
          ),
        };
        sessionRef.current = generatingBase;
        setSession(generatingBase);
        persistLocalSession(generatingBase);
        await persistSession(generatingBase);

        const brandKitId = brandKitIdForAi(generatingBase.inspiration.brandKitId);
        const resolvedPlaybooks =
          playbooks.length > 0 ? playbooks : DEFAULT_PLAYBOOK_OPTIONS;
        const playbookName =
          resolvedPlaybooks.find(
            (option) => option.id === generatingBase.inspiration.playbookId,
          )?.name ?? null;
        const inspirationImages = await prepareInspirationImagesForServer(
          generatingBase.inspiration.inspirationImages,
        );

        const milestone = generatingBase.milestones.find(
          (entry) => entry.id === milestoneId,
        );

        setGenerationProgress({
          current: 1,
          total: 1,
          milestoneName: milestone?.name ?? "Post",
        });

        const result = await (async () => {
          const { withStallWatchdog } = await import(
            "@/lib/monitoring/report-error"
          );
          return withStallWatchdog(
            "ai",
            generateAllContentAction({
              eventId: generatingBase.eventId,
              inspiration: generatingBase.inspiration,
              inspirationImages,
              milestones: generatingBase.milestones,
              previewContents: generatingBase.previewContents,
              brandKitId,
              useBrandKit: brandKitId !== null,
              milestoneIds: [milestoneId],
              playbookName,
            }),
            {
              action: "generateMilestoneContent",
              eventId: generatingBase.eventId,
              milestoneId,
              timeoutMs: GENERATION_STALL_TIMEOUT_MS,
              warningMs: GENERATION_STALL_WARNING_MS,
              stallMessage:
                "Artwork generation is taking longer than expected. Feed and story images are created one after another and can take a few minutes.",
            },
          );
        })();

        let workingBase = generatingBase;
        if (result.updatedInspiration) {
          workingBase = {
            ...workingBase,
            inspiration: mergeInspirationAfterGeneration(
              workingBase.inspiration,
              result.updatedInspiration,
            ),
          };
        }

        if (!result.success) {
          // Storage/table RLS or mid-flight errors can leave the client empty
          // while the server already persisted richer artwork — recover first.
          const recovered = await recoverSessionFromServerIfRicher(
            workingBase,
            eventTitle,
            eventDate,
          );
          if (recovered && previewSessionRichness(recovered) > 0) {
            const withApprover = applyResolvedApproverToSession(
              recovered,
              resolvedWorkflowApprover,
            );
            sessionRef.current = withApprover;
            setSession(withApprover);
            persistLocalSession(withApprover);
            return {
              success: true,
              message:
                "Restored saved artwork. Generation looked like it failed, but completed content was already saved.",
            };
          }

          const failedBase: CampaignBuilderSession = {
            ...workingBase,
            previewContents: workingBase.previewContents.map((content) =>
              content.milestoneId === milestoneId
                ? {
                    ...content,
                    generationStatus: "failed",
                    generationStartedAt: null,
                  }
                : content,
            ),
          };
          sessionRef.current = failedBase;
          setSession(failedBase);
          // Local only — do not upsert a failed empty snapshot over server art.
          persistLocalSession(failedBase);
          const { reportFailedAction } = await import(
            "@/lib/monitoring/report-error"
          );
          reportFailedAction("ai", {
            action: "generateMilestoneContent",
            eventId: workingBase.eventId,
            milestoneId,
            message: result.message || "Artwork generation failed.",
          });
          return { success: false, message: result.message };
        }

        const alignedPlaybookId =
          workingBase.milestonesPlaybookId ??
          workingBase.inspiration.playbookId ??
          null;
        let updatedBase: CampaignBuilderSession = {
          ...workingBase,
          // Keep communication plan ids aligned so a later step change cannot treat the
          // session as "needs sync" and rebuild over this artwork.
          milestonesPlaybookId: alignedPlaybookId,
          inspiration: {
            ...workingBase.inspiration,
            playbookId:
              alignedPlaybookId ?? workingBase.inspiration.playbookId,
          },
          currentStep: "preview",
          previewContents: workingBase.previewContents.map((content) => {
            const generated = result.results.find(
              (entry) => entry.milestoneId === content.milestoneId,
            );
            if (!generated) {
              return content;
            }
            const merged = {
              ...content,
              artwork: generated.artwork,
              captions: generated.captions,
              status: generated.status,
              generationStatus: generated.generationStatus,
              generationStartedAt: null,
            };
            return {
              ...merged,
              generationStatus: inferGenerationStatus(
                merged,
                merged.enabledFormats,
              ),
            };
          }),
        };

        const generatedArtwork =
          result.results.find((entry) => entry.milestoneId === milestoneId)
            ?.artwork ?? null;
        let reusedMilestoneIds: string[] = [];
        if (generatedArtwork && isReusableArtwork(generatedArtwork)) {
          const reuse = applyArtworkWithMainEventReuse(
            updatedBase,
            milestoneId,
            generatedArtwork,
          );
          updatedBase = {
            ...reuse.session,
            previewContents: reuse.session.previewContents.map((content) => {
              if (!reuse.changedMilestoneIds.includes(content.milestoneId)) {
                return content;
              }
              return {
                ...content,
                generationStatus: inferGenerationStatus(
                  content,
                  content.enabledFormats,
                ),
              };
            }),
          };
          reusedMilestoneIds = reuse.changedMilestoneIds;
        }

        sessionRef.current = updatedBase;
        setSession(updatedBase);
        await persistSession(updatedBase);

        if (generatedArtwork && isReusableArtwork(generatedArtwork)) {
          try {
            // Generation already synced assets server-side. Do not revalidate
            // while the builder is open — soft remounts strip hash / bounce
            // step and can race a stale session save over fresh artwork.
            const { syncAppliedMilestoneArtworkAction } = await import(
              "@/lib/campaign-builder-v2/actions"
            );
            const syncIds =
              reusedMilestoneIds.length > 0
                ? reusedMilestoneIds
                : [milestoneId];
            for (const syncId of syncIds) {
              const row = updatedBase.previewContents.find(
                (content) => content.milestoneId === syncId,
              );
              if (!row || !isReusableArtwork(row.artwork)) continue;
              await syncAppliedMilestoneArtworkAction({
                eventId: updatedBase.eventId,
                milestones: updatedBase.milestones,
                milestoneId: syncId,
                artwork: row.artwork,
                revalidate: false,
              });
            }
          } catch (syncError) {
            console.error(
              "Failed to sync artwork after generation:",
              syncError,
            );
          }
        }

        return {
          success: true,
          message: `Artwork and captions generated for ${milestone?.name ?? "this post"}.`,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not generate artwork and captions.";

        // Navigation, Safari "Load failed", or gateway 502/504 HTML (Next:
        // "unexpected response was received from the server") abort the client
        // fetch while the server action often still finishes. Do not clobber
        // session as failed — server persists artwork into campaign_builder_sessions.
        const interrupted = isServerActionTransportError(error);

        const recovered = await recoverSessionFromServerIfRicher(
          sessionRef.current,
          eventTitle,
          eventDate,
        );
        if (recovered && previewSessionRichness(recovered) > 0) {
          const withApprover = applyResolvedApproverToSession(
            recovered,
            resolvedWorkflowApprover,
          );
          sessionRef.current = withApprover;
          setSession(withApprover);
          persistLocalSession(withApprover);
          return {
            success: true,
            message: interrupted
              ? "Generation was interrupted, but saved artwork was restored."
              : "Restored saved artwork after a generation error.",
          };
        }

        if (interrupted) {
          return {
            success: false,
            message:
              "Generation was interrupted (page left or connection dropped). Refresh Create with AI — completed artwork may already be saved.",
          };
        }

        const failedBase: CampaignBuilderSession = {
          ...sessionRef.current,
          previewContents: sessionRef.current.previewContents.map((content) =>
            content.milestoneId === milestoneId
              ? {
                  ...content,
                  generationStatus: "failed",
                  generationStartedAt: null,
                }
              : content,
          ),
        };
        sessionRef.current = failedBase;
        setSession(failedBase);
        persistLocalSession(failedBase);

        const { reportIntegrationError } = await import(
          "@/lib/monitoring/report-error"
        );
        reportIntegrationError("ai", error, {
          action: "generateMilestoneContent",
          eventId: sessionRef.current.eventId,
          milestoneId,
          message,
        });

        return { success: false, message };
      } finally {
        generationInFlightRef.current.delete(milestoneId);
        setGeneratingMilestoneId((current) =>
          current === milestoneId ? null : current,
        );
        setIsGeneratingContent(generationInFlightRef.current.size > 0);
        setGenerationProgress(null);
      }
    },
    [eventDate, eventTitle, flushSave, persistSession, playbooks],
  );

  const generateMilestoneContent = useCallback(
    (
      milestoneId: string,
      options?: {
        milestonePatch?: Partial<CampaignBuilderMilestone> & { id: string };
      },
    ): Promise<{ success: boolean; message: string }> =>
      runMilestoneGeneration(milestoneId, options),
    [runMilestoneGeneration],
  );

  const generateNextMilestone = useCallback(async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    const next = findNextMilestoneToGenerate(
      sessionRef.current.milestones,
      sessionRef.current.previewContents,
    );
    if (!next) {
      return {
        success: false,
        message: "All posts already have generated content.",
      };
    }
    updateSession((prev) => ({ ...prev, selectedMilestoneId: next.id }));
    return generateMilestoneContent(next.id);
  }, [generateMilestoneContent, updateSession]);

  const generateAllContent = useCallback(
    async (options?: {
      milestoneId?: string;
      milestonePatch?: Partial<CampaignBuilderMilestone> & { id: string };
    }): Promise<{ success: boolean; message: string }> => {
      const targetMilestoneId = options?.milestoneId ?? options?.milestonePatch?.id;
      if (!targetMilestoneId) {
        return {
          success: false,
          message: "Select a post to generate content.",
        };
      }
      return generateMilestoneContent(targetMilestoneId, {
        milestonePatch: options?.milestonePatch,
      });
    },
    [generateMilestoneContent],
  );

  useEffect(() => {
    const staleIds = session.previewContents
      .filter(
        (content) =>
          content.generationStatus === "generating" &&
          isStaleGeneration(content.generationStartedAt),
      )
      .map((content) => content.milestoneId);

    if (staleIds.length === 0) {
      return;
    }

    void import("@/lib/monitoring/report-error").then(({ reportStalledOperation }) => {
      for (const milestoneId of staleIds) {
        const preview = session.previewContents.find(
          (content) => content.milestoneId === milestoneId,
        );
        const startedAt = preview?.generationStartedAt
          ? Date.parse(preview.generationStartedAt)
          : NaN;
        reportStalledOperation("ai", {
          action: "generateMilestoneContent.staleRecovery",
          eventId,
          milestoneId,
          message:
            "Recovered a stalled artwork generation that never finished.",
          durationMs: Number.isNaN(startedAt)
            ? null
            : Date.now() - startedAt,
          level: "error",
        });
      }
    });

    updateSession((prev) => ({
      ...prev,
      previewContents: prev.previewContents.map((content) =>
        staleIds.includes(content.milestoneId)
          ? {
              ...content,
              generationStatus: inferGenerationStatus(
                { ...content, generationStartedAt: null },
                content.enabledFormats,
              ),
              generationStartedAt: null,
            }
          : content,
      ),
    }));
    // Recover stale persisted generation flags once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const setSelectedMilestoneId = useCallback(
    (id: string | null) => {
      updateSession((prev) => ({ ...prev, selectedMilestoneId: id }));
    },
    [updateSession],
  );

  const setPreviewTab = useCallback(
    (tab: PreviewTabId) => {
      updateSession((prev) => ({ ...prev, previewTab: tab }));
    },
    [updateSession],
  );

  const updatePreviewContent = useCallback(
    (milestoneId: string, patch: Partial<MilestonePreviewContent>) => {
      updateSession((prev) => ({
        ...prev,
        previewContents: prev.previewContents.map((content) => {
          if (content.milestoneId !== milestoneId) {
            return content;
          }
          const next = { ...content, ...patch };
          if (patch.artwork) {
            next.artwork = normalizeMilestoneArtwork(patch.artwork);
          }
          if (patch.scheduleDate || patch.scheduleTime) {
            const hasManual =
              next.enabledFormats.includes("instagram-story-manual") ||
              next.deliveryMethod === "manual-email";
            if (hasManual && !patch.emailSendDate && !patch.emailSendTime) {
              next.emailSendDate = next.scheduleDate;
              next.emailSendTime = next.scheduleTime;
            }
          }
          // Shared caption model: keep Facebook & Instagram rows in sync whenever
          // captions or enabled formats change.
          if (patch.captions || patch.enabledFormats) {
            const captionPlatforms = captionPlatformsForFormats(next.enabledFormats);
            if (captionPlatforms.length > 0) {
              next.captions = ensureSharedCaptionsForPlatforms(
                next.captions,
                captionPlatforms,
              );
            }
          }
          // Honor an explicit generationStatus (e.g. awaiting_approval after
          // Send for approval). Only re-infer when status wasn't provided.
          if (
            patch.generationStatus == null &&
            (patch.artwork ||
              patch.captions ||
              patch.status ||
              patch.enabledFormats)
          ) {
            next.generationStatus = inferGenerationStatus(
              next,
              next.enabledFormats,
            );
          } else if (patch.generationStatus != null) {
            // Caption/artwork edits must not wipe changes_requested / awaiting_approval.
            next.generationStatus = preserveApprovalWorkflowStatus(
              content.generationStatus,
              patch.generationStatus,
            );
          }
          return next;
        }),
      }));
    },
    [updateSession],
  );

  const applyMilestoneArtwork = useCallback(
    (
      milestoneId: string,
      artwork: MilestoneArtwork,
      options?: { asCustom?: boolean },
    ): string[] => {
      let changed: string[] = [];
      updateSession((prev) => {
        const result = applyArtworkWithMainEventReuse(
          prev,
          milestoneId,
          artwork,
          options,
        );
        changed = result.changedMilestoneIds;
        const withStatus: CampaignBuilderSession = {
          ...result.session,
          previewContents: result.session.previewContents.map((content) => {
            if (!changed.includes(content.milestoneId)) {
              return content;
            }
            return {
              ...content,
              status: "needs-review" as const,
              generationStatus: inferGenerationStatus(
                content,
                content.enabledFormats,
              ),
            };
          }),
        };
        return withStatus;
      });
      return changed;
    },
    [updateSession],
  );

  const detachMilestoneFromMainImage = useCallback(
    (milestoneId: string) => {
      updateSession((prev) => detachMainEventImage(prev, milestoneId));
    },
    [updateSession],
  );

  const setReviewFilter = useCallback(
    (filter: CampaignBuilderSession["reviewFilter"]) => {
      updateSession((prev) => ({ ...prev, reviewFilter: filter }));
    },
    [updateSession],
  );

  const toggleExpandedReview = useCallback(
    (milestoneId: string) => {
      updateSession((prev) => {
        const isExpanded = prev.expandedReviewMilestoneIds.includes(milestoneId);
        return {
          ...prev,
          expandedReviewMilestoneIds: isExpanded
            ? prev.expandedReviewMilestoneIds.filter((id) => id !== milestoneId)
            : [...prev.expandedReviewMilestoneIds, milestoneId],
        };
      });
    },
    [updateSession],
  );

  const navigateToWarning = useCallback(
    (warning: StepWarning) => {
      goToStep(warning.step);
      if (warning.milestoneId) {
        updateSession((prev) => ({
          ...prev,
          selectedMilestoneId: warning.milestoneId ?? prev.selectedMilestoneId,
          expandedReviewMilestoneIds:
            warning.step === "review" && warning.milestoneId
              ? Array.from(
                  new Set([...prev.expandedReviewMilestoneIds, warning.milestoneId]),
                )
              : prev.expandedReviewMilestoneIds,
        }));
      }
    },
    [goToStep, updateSession],
  );

  const clearMilestoneGeneratedContent = useCallback(
    async (
      milestoneId: string,
    ): Promise<{
      success: boolean;
      message: string;
      artworkCleared: number;
      captionsCleared: number;
    }> => {
      const { clearMilestoneGeneratedContentAction } = await import(
        "@/lib/dev-tools/actions"
      );
      const { clearLocalGeneratedContent } = await import(
        "@/lib/dev-tools/clear-local-generated-content"
      );
      const { clearSessionGeneratedContent } = await import(
        "@/lib/dev-tools/clear-generated-content"
      );

      const result = await clearMilestoneGeneratedContentAction({
        organizationId,
        eventId,
        milestoneId,
      });

      if (!result.success) {
        return {
          success: false,
          message: result.message,
          artworkCleared: 0,
          captionsCleared: 0,
        };
      }

      clearLocalGeneratedContent(eventId, [milestoneId]);
      updateSession((prev) => {
        const cleared = clearSessionGeneratedContent(prev, [milestoneId]);
        return cleared.next;
      });

      return {
        success: true,
        message: result.message,
        artworkCleared: result.artworkCleared,
        captionsCleared: result.captionsCleared,
      };
    },
    [eventId, organizationId, updateSession],
  );

  const healthPercent = useMemo(
    () => computeCampaignHealthPercent(session.milestones, session.previewContents),
    [session.milestones, session.previewContents],
  );

  const stepperStates = useMemo(
    () =>
      computeStepperStates(
        session.inspiration,
        session.milestones,
        session.previewContents,
        currentStep,
      ),
    [session.inspiration, session.milestones, session.previewContents, currentStep],
  );

  const stepWarnings = useMemo(
    () => computeStepWarnings(session.milestones, session.previewContents),
    [session.milestones, session.previewContents],
  );

  const playbookOptionsResolved = useMemo(
    () => (playbooks.length > 0 ? playbooks : DEFAULT_PLAYBOOK_OPTIONS),
    [playbooks],
  );

  const brandKitOptionsResolved = useMemo(
    () => [
      { id: NO_BRAND_KIT_ID, name: "No brand kit" },
      ...(brandKits.length > 0 ? brandKits : DEFAULT_BRAND_KIT_OPTIONS.slice(1)),
    ],
    [brandKits],
  );

  const value = useMemo<CampaignBuilderContextValue>(
    () => ({
      session,
      currentStep,
      healthPercent,
      stepperStates,
      stepWarnings,
      playbookOptions: playbookOptionsResolved,
      brandKitOptions: brandKitOptionsResolved,
      voiceToneOptions: DEFAULT_VOICE_TONE_OPTIONS,
      campaignOptions,
      logoOptions,
      schoolColors,
      mascot,
      isSaving,
      isGeneratingContent,
      generatingMilestoneId,
      generationProgress,
      goToStep,
      updateInspiration,
      setPlaybookId,
      selectCampaign,
      addInspirationImage,
      addInspirationFromLibrary,
      removeInspirationImage,
      updateInspirationImage,
      uploadCampaignLogo,
      setMilestones,
      reorderMilestones,
      moveMilestone,
      addMilestone,
      createDirectedPost,
      updateMilestone,
      removeMilestone,
      duplicateMilestone,
      suggestMilestones,
      flushSave,
      saveCreativeSetupAndContinue,
      generateMilestoneContent,
      generateNextMilestone,
      generateAllContent,
      inspirationUploadError,
      clearInspirationUploadError,
      setSelectedMilestoneId,
      setPreviewTab,
      updatePreviewContent,
      applyMilestoneArtwork,
      detachMilestoneFromMainImage,
      setReviewFilter,
      toggleExpandedReview,
      reconcilePreviewStatuses,
      navigateToWarning,
      organizationId,
      canUseDeveloperTools,
      canUploadArtwork,
      hasExternalReviewer,
      clearMilestoneGeneratedContent,
    }),
    [
      session,
      currentStep,
      healthPercent,
      stepperStates,
      stepWarnings,
      playbookOptionsResolved,
      brandKitOptionsResolved,
      campaignOptions,
      logoOptions,
      schoolColors,
      mascot,
      isSaving,
      isGeneratingContent,
      generatingMilestoneId,
      generationProgress,
      goToStep,
      updateInspiration,
      setPlaybookId,
      selectCampaign,
      addInspirationImage,
      addInspirationFromLibrary,
      removeInspirationImage,
      updateInspirationImage,
      uploadCampaignLogo,
      setMilestones,
      reorderMilestones,
      moveMilestone,
      addMilestone,
      createDirectedPost,
      updateMilestone,
      removeMilestone,
      duplicateMilestone,
      suggestMilestones,
      flushSave,
      saveCreativeSetupAndContinue,
      generateMilestoneContent,
      generateNextMilestone,
      generateAllContent,
      inspirationUploadError,
      clearInspirationUploadError,
      setSelectedMilestoneId,
      setPreviewTab,
      updatePreviewContent,
      applyMilestoneArtwork,
      detachMilestoneFromMainImage,
      setReviewFilter,
      toggleExpandedReview,
      reconcilePreviewStatuses,
      navigateToWarning,
      organizationId,
      canUseDeveloperTools,
      canUploadArtwork,
      hasExternalReviewer,
      clearMilestoneGeneratedContent,
    ],
  );

  return (
    <CampaignBuilderContext.Provider value={value}>
      {children}
    </CampaignBuilderContext.Provider>
  );
}

export function useCampaignBuilder(): CampaignBuilderContextValue {
  const context = useContext(CampaignBuilderContext);
  if (!context) {
    throw new Error("useCampaignBuilder must be used within CampaignBuilderProvider");
  }
  return context;
}
