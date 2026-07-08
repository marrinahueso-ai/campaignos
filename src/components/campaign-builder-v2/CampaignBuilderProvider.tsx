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
  loadCampaignBuilderSessionAction,
  saveCampaignBuilderSessionAction,
} from "@/lib/campaign-builder-v2/session";
import {
  generateAllContentAction,
  suggestMilestonesAction,
  uploadInspirationImageAction,
} from "@/lib/campaign-builder-v2/actions";
import { prepareInspirationImagesForServer } from "@/lib/campaign-builder-v2/inspiration-client";
import { defaultEnabledFormats, emptyMilestoneArtwork } from "@/lib/campaign-builder-v2/platform-utils";
import { brandKitIdForAi, NO_BRAND_KIT_ID } from "@/lib/campaign-builder-v2/brand-kit";
import {
  DEFAULT_BRAND_KIT_OPTIONS,
  DEFAULT_PLAYBOOK_OPTIONS,
  DEFAULT_VOICE_TONE_OPTIONS,
  buildDefaultSession,
  localSessionKey,
} from "@/lib/campaign-builder-v2/seed-data";
import { normalizeCampaignBuilderSession } from "@/lib/campaign-builder-v2/normalize-session";
import { stepFromHash } from "@/lib/campaign-builder-v2/navigation";
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

interface CampaignBuilderProviderProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  playbooks: PlaybookOption[];
  brandKits: BrandKitOption[];
  campaignOptions: CampaignOption[];
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
  isSaving: boolean;
  isGeneratingContent: boolean;
  goToStep: (step: CampaignBuilderStepId) => void;
  updateInspiration: (patch: Partial<CampaignBuilderInspiration>) => void;
  selectCampaign: (campaignId: string) => void;
  addInspirationImage: (file: File) => void;
  removeInspirationImage: (imageId: string) => void;
  setMilestones: (milestones: CampaignBuilderMilestone[]) => void;
  reorderMilestones: (fromIndex: number, toIndex: number) => void;
  moveMilestone: (id: string, direction: "up" | "down") => void;
  addMilestone: () => void;
  updateMilestone: (id: string, patch: Partial<CampaignBuilderMilestone>) => void;
  removeMilestone: (id: string) => void;
  duplicateMilestone: (id: string) => void;
  suggestMilestones: () => Promise<void>;
  flushSave: () => Promise<void>;
  generateAllContent: (
    milestonePatch?: Partial<CampaignBuilderMilestone> & { id: string },
  ) => Promise<{ success: boolean; message: string }>;
  setSelectedMilestoneId: (id: string | null) => void;
  setPreviewTab: (tab: PreviewTabId) => void;
  updatePreviewContent: (
    milestoneId: string,
    patch: Partial<MilestonePreviewContent>,
  ) => void;
  setReviewFilter: (filter: CampaignBuilderSession["reviewFilter"]) => void;
  toggleExpandedReview: (milestoneId: string) => void;
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

function persistLocalSession(session: CampaignBuilderSession): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(localSessionKey(session.eventId), JSON.stringify(session));
  } catch {
    // ignore quota errors
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
    return JSON.parse(raw) as CampaignBuilderSession;
  } catch {
    return null;
  }
}

export function CampaignBuilderProvider({
  eventId,
  eventTitle,
  eventDate,
  playbooks,
  brandKits,
  campaignOptions,
  children,
}: CampaignBuilderProviderProps) {
  const router = useRouter();
  const [session, setSession] = useState<CampaignBuilderSession>(() =>
    buildDefaultSession(eventId, eventTitle, eventDate),
  );
  const [currentStep, setCurrentStep] = useState<CampaignBuilderStepId>(() =>
    stepFromHash(typeof window !== "undefined" ? getLocationHash() : ""),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

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
    let cancelled = false;

    async function hydrate() {
      const remote = await loadCampaignBuilderSessionAction(eventId);
      if (cancelled) {
        return;
      }

      if (remote) {
        setSession(
          normalizeCampaignBuilderSession(remote, eventId, eventTitle, eventDate),
        );
        setIsHydrated(true);
        return;
      }

      const local = loadLocalSession(eventId);
      if (local) {
        setSession(
          normalizeCampaignBuilderSession(local, eventId, eventTitle, eventDate),
        );
      }
      setIsHydrated(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [eventId, eventTitle, eventDate]);

  useEffect(() => {
    const sync = () => setCurrentStep(stepFromHash(getLocationHash()));
    sync();
    return subscribeToLocationHash(sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const hash = getLocationHash().replace(/^#/, "");
    if (!hash) {
      setLocationHash("inspiration");
    }
  }, []);

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
        return {
          ...prev,
          inspiration: {
            ...prev.inspiration,
            inspirationImages: prev.inspiration.inspirationImages.filter(
              (image) => image.id !== imageId,
            ),
          },
        };
      });
    },
    [updateSession],
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
        return {
          ...prev,
          milestones: sortMilestones(milestones),
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

  const generateAllContent = useCallback(
    async (
      milestonePatch?: Partial<CampaignBuilderMilestone> & { id: string },
    ): Promise<{ success: boolean; message: string }> => {
      setIsGeneratingContent(true);
      try {
        let base = sessionRef.current;
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

        await flushSave();

        const brandKitId = brandKitIdForAi(base.inspiration.brandKitId);
        const inspirationImages = await prepareInspirationImagesForServer(
          base.inspiration.inspirationImages,
        );
        const result = await generateAllContentAction({
          eventId: base.eventId,
          inspiration: base.inspiration,
          inspirationImages,
          milestones: base.milestones,
          previewContents: base.previewContents,
          brandKitId,
          useBrandKit: brandKitId !== null,
        });

        if (!result.success) {
          if (result.updatedInspiration) {
            const withInspiration = {
              ...base,
              inspiration: result.updatedInspiration,
            };
            sessionRef.current = withInspiration;
            setSession(withInspiration);
            persistLocalSession(withInspiration);
          }
          return { success: false, message: result.message };
        }

        const next: CampaignBuilderSession = {
          ...base,
          inspiration: result.updatedInspiration ?? base.inspiration,
          previewContents: base.previewContents.map((content) => {
            const generated = result.results.find(
              (entry) => entry.milestoneId === content.milestoneId,
            );
            if (!generated) {
              return content;
            }
            return {
              ...content,
              artwork: generated.artwork,
              captions: generated.captions,
              status: generated.status,
            };
          }),
          selectedMilestoneId:
            base.selectedMilestoneId ?? base.milestones[0]?.id ?? null,
        };

        sessionRef.current = next;
        setSession(next);
        persistLocalSession(next);
        await persistSession(next);
        router.refresh();
        goToStep("preview");

        return { success: true, message: result.message };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not generate artwork and captions.";
        return { success: false, message };
      } finally {
        setIsGeneratingContent(false);
      }
    },
    [flushSave, goToStep, persistSession, router],
  );

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
          if (patch.scheduleDate || patch.scheduleTime) {
            const hasManual =
              next.enabledFormats.includes("instagram-story-manual") ||
              next.deliveryMethod === "manual-email";
            if (hasManual && !patch.emailSendDate && !patch.emailSendTime) {
              next.emailSendDate = next.scheduleDate;
              next.emailSendTime = next.scheduleTime;
            }
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

  const value: CampaignBuilderContextValue = {
    session,
    currentStep,
    healthPercent,
    stepperStates,
    stepWarnings,
    playbookOptions: playbooks.length > 0 ? playbooks : DEFAULT_PLAYBOOK_OPTIONS,
    brandKitOptions: [
      { id: NO_BRAND_KIT_ID, name: "No brand kit" },
      ...(brandKits.length > 0 ? brandKits : DEFAULT_BRAND_KIT_OPTIONS.slice(1)),
    ],
    voiceToneOptions: DEFAULT_VOICE_TONE_OPTIONS,
    campaignOptions,
    isSaving,
    isGeneratingContent,
    goToStep,
    updateInspiration,
    selectCampaign,
    addInspirationImage,
    removeInspirationImage,
    setMilestones,
    reorderMilestones,
    moveMilestone,
    addMilestone,
    updateMilestone,
    removeMilestone,
    duplicateMilestone,
    suggestMilestones,
    flushSave,
    generateAllContent,
    setSelectedMilestoneId,
    setPreviewTab,
    updatePreviewContent,
    setReviewFilter,
    toggleExpandedReview,
    navigateToWarning,
  };

  if (!isHydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-cos-muted">
        Loading campaign builder…
      </div>
    );
  }

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
