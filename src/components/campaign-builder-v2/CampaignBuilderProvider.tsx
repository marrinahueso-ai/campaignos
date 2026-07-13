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
import {
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
  reconcileMilestonesWithPlaybookSteps,
} from "@/lib/campaign-builder-v2/playbook-milestones";
import { prepareInspirationImagesForServer } from "@/lib/campaign-builder-v2/inspiration-client";
import { defaultEnabledFormats, emptyMilestoneArtwork, normalizeMilestoneArtwork } from "@/lib/campaign-builder-v2/platform-utils";
import { brandKitIdForAi, NO_BRAND_KIT_ID } from "@/lib/campaign-builder-v2/brand-kit";
import { normalizeCreativeSelections } from "@/lib/campaign-builder-v2/creative-config";
import {
  DEFAULT_BRAND_KIT_OPTIONS,
  DEFAULT_PLAYBOOK_OPTIONS,
  DEFAULT_VOICE_TONE_OPTIONS,
  localSessionKey,
} from "@/lib/campaign-builder-v2/seed-data";
import { hydrateCampaignBuilderSession } from "@/lib/campaign-builder-v2/normalize-session";
import {
  applyArtworkBackup,
  loadArtworkBackup,
  persistArtworkBackup,
} from "@/lib/campaign-builder-v2/artwork-backup";
import {
  findNextMilestoneToGenerate,
  inferGenerationStatus,
  isStaleGeneration,
} from "@/lib/campaign-builder-v2/milestone-status";
import {
  isValidCampaignBuilderStep,
  stepFromHash,
} from "@/lib/campaign-builder-v2/navigation";
import type {
  BrandKitOption,
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
  CampaignBuilderSession,
  CampaignBuilderStepId,
  CampaignOption,
  MilestonePreviewContent,
  PlaybookOption,
  PreviewTabId,
  StepWarning,
} from "@/lib/campaign-builder-v2/types";
import type { SetupLogoOption } from "@/lib/artwork-v2/setup-logos";

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
  playbooks: PlaybookOption[];
  brandKits: BrandKitOption[];
  campaignOptions: CampaignOption[];
  logoOptions: SetupLogoOption[];
  schoolColors: CampaignBuilderSchoolColors;
  initialSession: CampaignBuilderSession;
  restoredFromServer: boolean;
  children: ReactNode;
}

interface CampaignBuilderContextValue {
  session: CampaignBuilderSession;
  currentStep: CampaignBuilderStepId;
  healthPercent: number;
  stepperStates: Record<CampaignBuilderStepId, StepperStepState>;
  stepWarnings: StepWarning[];
  playbookOptions: PlaybookOption[];
  brandKitOptions: BrandKitOption[];
  voiceToneOptions: string[];
  campaignOptions: CampaignOption[];
  logoOptions: SetupLogoOption[];
  schoolColors: CampaignBuilderSchoolColors;
  isSaving: boolean;
  isGeneratingContent: boolean;
  generatingMilestoneId: string | null;
  generationProgress: ContentGenerationProgress | null;
  goToStep: (step: CampaignBuilderStepId) => void;
  updateInspiration: (patch: Partial<CampaignBuilderInspiration>) => void;
  selectCampaign: (campaignId: string) => void;
  addInspirationImage: (file: File) => void;
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
  setReviewFilter: (filter: CampaignBuilderSession["reviewFilter"]) => void;
  toggleExpandedReview: (milestoneId: string) => void;
  reconcilePreviewStatuses: () => void;
  navigateToWarning: (warning: StepWarning) => void;
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
    name: "New Milestone",
    category: "reminder",
    purpose: "Describe the purpose of this milestone",
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
    deliveryMethod: "auto-publish",
    scheduleDate: inspiration.eventDate,
    scheduleTime: "09:00",
    emailSendDate: inspiration.eventDate,
    emailSendTime: "09:00",
    manualEmailTo: "marrina@heyralli.com",
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

function slimSessionForLocalStorage(
  session: CampaignBuilderSession,
): CampaignBuilderSession {
  // data: URLs blow past localStorage quotas and cause silent save failures.
  // Keep http(s) inspiration URLs; drop inline payloads (already uploaded or
  // re-selectable from Creative Setup).
  const inspirationImages = session.inspiration.inspirationImages.map((image) => {
    const url = image.url?.trim() ?? "";
    const keepUrl = url.startsWith("http://") || url.startsWith("https://") ? url : "";
    return {
      ...image,
      url: keepUrl,
      previewUrl:
        image.previewUrl?.startsWith("http://") ||
        image.previewUrl?.startsWith("https://")
          ? image.previewUrl
          : keepUrl || undefined,
    };
  });

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

function persistLocalSession(session: CampaignBuilderSession): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  // Always try the compact artwork backup first — it must survive even when
  // the full session JSON is too large for localStorage.
  persistArtworkBackup(session);
  try {
    const slimmed = slimSessionForLocalStorage(session);
    localStorage.setItem(localSessionKey(session.eventId), JSON.stringify(slimmed));
    return true;
  } catch {
    // Quota or private mode — try a minimal artwork+milestones backup so
    // Preview generations survive navigation even when the full session won't.
    try {
      const slimmed = slimSessionForLocalStorage(session);
      const minimal: CampaignBuilderSession = {
        ...slimmed,
        inspiration: {
          ...slimmed.inspiration,
          inspirationImages: [],
        },
      };
      localStorage.setItem(localSessionKey(session.eventId), JSON.stringify(minimal));
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

function hydrateWithArtworkBackup(
  base: CampaignBuilderSession | Partial<CampaignBuilderSession>,
  local: CampaignBuilderSession | null,
  eventId: string,
  eventTitle: string,
  eventDate: string,
  restoredFromServer: boolean,
): CampaignBuilderSession {
  const hydrated = hydrateCampaignBuilderSession(
    base,
    local,
    eventId,
    eventTitle,
    eventDate,
    restoredFromServer,
  );
  return applyArtworkBackup(hydrated, loadArtworkBackup(eventId));
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

export function CampaignBuilderProvider({
  eventId,
  eventTitle,
  eventDate,
  playbooks,
  brandKits,
  campaignOptions,
  logoOptions,
  schoolColors,
  initialSession,
  restoredFromServer,
  children,
}: CampaignBuilderProviderProps) {
  const [session, setSession] = useState<CampaignBuilderSession>(() =>
    hydrateWithArtworkBackup(
      initialSession,
      loadLocalSession(eventId),
      eventId,
      eventTitle,
      eventDate,
      restoredFromServer,
    ),
  );
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

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    currentStepRef.current = currentStep;
    persistBuilderStep(eventId, currentStep);
  }, [currentStep, eventId]);

  const persistSession = useCallback(async (next: CampaignBuilderSession) => {
    persistLocalSession(next);
    setIsSaving(true);
    try {
      await saveCampaignBuilderSessionAction(next);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const scheduleSave = useCallback(
    (next: CampaignBuilderSession) => {
      persistLocalSession(next);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void persistSession(next);
      }, 800);
    },
    [persistSession],
  );

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await persistSession(sessionRef.current);
  }, [persistSession]);

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

    const selectedPlaybookId = normalizedInspiration.playbookId;
    let milestones = sessionRef.current.milestones;
    let previewContents = sessionRef.current.previewContents;
    let milestonesPlaybookId = sessionRef.current.milestonesPlaybookId ?? null;

    if (selectedPlaybookId && selectedPlaybookId !== milestonesPlaybookId) {
      const stepsResult = await getPlaybookMilestoneStepsAction(selectedPlaybookId);

      if (stepsResult.success && stepsResult.steps.length > 0) {
        const atRisk = milestonesLostOnPlaybookSwitch(
          stepsResult.steps,
          milestones,
          previewContents,
        );
        if (atRisk.length > 0) {
          const confirmed = window.confirm(
            `Switching playbooks will remove ${atRisk.length} milestone${atRisk.length === 1 ? "" : "s"} that ${atRisk.length === 1 ? "doesn't" : "don't"} belong to the new playbook, along with their existing notes/artwork/captions: ${atRisk.map((m) => m.name).join(", ")}.\n\nContinue?`,
          );
          if (!confirmed) {
            return {
              success: false,
              message: "Playbook change canceled — milestones unchanged.",
            };
          }
        }

        const rebuilt = reconcileMilestonesWithPlaybookSteps(
          stepsResult.steps,
          normalizedInspiration.eventDate,
          milestones,
          previewContents,
        );
        milestones = rebuilt.milestones;
        previewContents = rebuilt.previewContents;
        milestonesPlaybookId = selectedPlaybookId;
      }
      // If the playbook has no steps in the DB (e.g. a demo/legacy playbook
      // id that was never a real row), keep the existing milestones rather
      // than wiping them out.
    }

    const next = {
      ...sessionRef.current,
      inspiration: normalizedInspiration,
      milestones,
      previewContents,
      milestonesPlaybookId,
      currentStep: "milestones" as const,
    };
    sessionRef.current = next;
    setSession(next);
    setLocationHash("milestones");
    setCurrentStep("milestones");
    await persistSession(next);
    return { success: true };
  }, [persistSession]);

  const updateSession = useCallback(
    (updater: (prev: CampaignBuilderSession) => CampaignBuilderSession) => {
      setSession((prev) => {
        const next = updater(prev);
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
    );

    setSession((prev) => {
      const prevRichness = previewSessionRichness(prev);
      const hydratedRichness = previewSessionRichness(hydrated);
      const localRichness = localForHydrate
        ? previewSessionRichness(localForHydrate)
        : 0;

      // Never let a remount hydrate overwrite richer in-memory OR localStorage
      // artwork with a stale server/default snapshot.
      if (prevRichness > hydratedRichness) {
        persistLocalSession(prev);
        return prev;
      }

      if (localRichness > hydratedRichness && localForHydrate) {
        const keepLocal = hydrateWithArtworkBackup(
          localForHydrate,
          null,
          eventId,
          eventTitle,
          eventDate,
          false,
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

      if (!changed && hydrated.previewContents.length === prev.previewContents.length) {
        return prev;
      }

      sessionRef.current = hydrated;
      // Only write back when hydrated is at least as rich as what we already
      // have locally — never clobber a good local cache with an empty merge.
      if (hydratedRichness >= localRichness) {
        persistLocalSession(hydrated);
      }
      return hydrated;
    });
    // Reconcile persisted milestone statuses once per mount after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const reconcilePreviewStatuses = useCallback(() => {
    setSession((prev) => {
      const next = hydrateWithArtworkBackup(
        prev,
        loadLocalSession(eventId),
        eventId,
        eventTitle,
        eventDate,
        true,
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
  }, [eventId, eventTitle, eventDate, scheduleSave]);

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
      setLocationHash(step);
      updateSession((prev) => ({ ...prev, currentStep: step }));
    },
    [updateSession],
  );

  const updateInspiration = useCallback(
    (patch: Partial<CampaignBuilderInspiration>) => {
      updateSession((prev) => ({
        ...prev,
        inspiration: { ...prev.inspiration, ...patch },
      }));
    },
    [updateSession],
  );

  const selectCampaign = useCallback(
    (campaignId: string) => {
      const campaign = campaignOptions.find((option) => option.id === campaignId);
      if (!campaign) {
        return;
      }
      updateSession((prev) => ({
        ...prev,
        inspiration: {
          ...prev.inspiration,
          campaignId: campaign.id,
          campaignName: campaign.title,
          eventDate: campaign.date,
        },
      }));
    },
    [campaignOptions, updateSession],
  );

  const addInspirationImage = useCallback(
    (file: File) => {
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
    [eventId, updateSession],
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
    [eventId, updateSession],
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
      return {
        ...prev,
        milestones: [...prev.milestones, milestone],
        previewContents: [...prev.previewContents, preview],
        selectedMilestoneId: milestone.id,
      };
    });
  }, [updateSession]);

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
          message: "Generation is already in progress for this milestone.",
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
          milestoneName: milestone?.name ?? "Milestone",
        });

        const result = await generateAllContentAction({
          eventId: generatingBase.eventId,
          inspiration: generatingBase.inspiration,
          inspirationImages,
          milestones: generatingBase.milestones,
          previewContents: generatingBase.previewContents,
          brandKitId,
          useBrandKit: brandKitId !== null,
          milestoneIds: [milestoneId],
          playbookName,
        });

        let workingBase = generatingBase;
        if (result.updatedInspiration) {
          workingBase = {
            ...workingBase,
            inspiration: result.updatedInspiration,
          };
        }

        if (!result.success) {
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
          await persistSession(failedBase);
          return { success: false, message: result.message };
        }

        const updatedBase: CampaignBuilderSession = {
          ...workingBase,
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

        sessionRef.current = updatedBase;
        setSession(updatedBase);
        await persistSession(updatedBase);

        return {
          success: true,
          message: `Artwork and captions generated for ${milestone?.name ?? "this milestone"}.`,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not generate artwork and captions.";

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
        await persistSession(failedBase);

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
    [flushSave, persistSession, playbooks],
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
        message: "All milestones already have generated content.",
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
          message: "Select a milestone to generate content.",
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
          if (
            patch.artwork ||
            patch.captions ||
            patch.status ||
            patch.enabledFormats
          ) {
            next.generationStatus = inferGenerationStatus(
              next,
              next.enabledFormats,
            );
          }
          return next;
        }),
      }));
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
      isSaving,
      isGeneratingContent,
      generatingMilestoneId,
      generationProgress,
      goToStep,
      updateInspiration,
      selectCampaign,
      addInspirationImage,
      removeInspirationImage,
      updateInspirationImage,
      uploadCampaignLogo,
      setMilestones,
      reorderMilestones,
      moveMilestone,
      addMilestone,
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
      setReviewFilter,
      toggleExpandedReview,
      reconcilePreviewStatuses,
      navigateToWarning,
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
      isSaving,
      isGeneratingContent,
      generatingMilestoneId,
      generationProgress,
      goToStep,
      updateInspiration,
      selectCampaign,
      addInspirationImage,
      removeInspirationImage,
      updateInspirationImage,
      uploadCampaignLogo,
      setMilestones,
      reorderMilestones,
      moveMilestone,
      addMilestone,
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
      setReviewFilter,
      toggleExpandedReview,
      reconcilePreviewStatuses,
      navigateToWarning,
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
