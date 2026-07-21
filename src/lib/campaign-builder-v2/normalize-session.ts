import { ensureSharedCaptionsForPlatforms } from "./caption-utils.ts";
import {
  defaultEnabledFormats,
  normalizeMilestoneArtwork,
} from "./platform-utils.ts";
import {
  captionPlatformsForFormats,
  generationStatusAfterContent,
  inferGenerationStatus,
  isStaleGeneration,
  milestoneHasArtwork,
} from "./milestone-status.ts";
import { sanitizeApprovalWorkflowDemoAssignees } from "./approval-workflow.ts";
import { buildDefaultSession } from "./seed-data.ts";
import {
  migrateLegacyCreativeFields,
  normalizeMilestoneCreativeOverrides,
} from "./creative-config.ts";
import {
  isStaleDemoCaption,
  sanitizeGlobalAiGuidance,
  sanitizeSeedNotes,
  sanitizeSeedPurpose,
} from "./stale-seed-migration.ts";
import { isFirstCampaignMilestone } from "./first-milestone.ts";
import { normalizeMilestoneName } from "./milestone-names.ts";
import type {
  CampaignBuilderMilestone,
  CampaignBuilderSession,
  MilestoneGenerationStatus,
  MilestonePreviewContent,
  PreviewTabId,
} from "./types.ts";

function buildEmptyPreviewContent(
  milestone: CampaignBuilderMilestone,
): MilestonePreviewContent {
  return {
    milestoneId: milestone.id,
    status: "draft",
    generationStatus: "ready_to_generate",
    generationStartedAt: null,
    artwork: normalizeMilestoneArtwork(null),
    captions: [
      { platform: "facebook", text: "" },
      { platform: "instagram", text: "" },
    ],
    enabledFormats: milestone.platformFormats,
    deliveryMethod: "auto-publish",
    scheduleDate: milestone.suggestedDate,
    scheduleTime: "09:00",
    emailSendDate: milestone.suggestedDate,
    emailSendTime: "09:00",
    manualEmailTo: "marrina@heyralli.com",
    manualUploadLink: "",
    approvalStatuses: [],
  };
}

function previewContentRichness(content: MilestonePreviewContent): number {
  let score = 0;
  if (milestoneHasArtwork(content)) {
    score += 10;
  }
  if (content.captions.some((caption) => caption.text.trim())) {
    score += 1;
  }
  // Do NOT score generationStatus alone. Stale "generated" flags on empty
  // server previews were outranking real local artwork and causing hydrate to
  // prefer the server milestone list, then persistLocalSession wiped local.
  return score;
}

function sessionArtworkCount(session: Partial<CampaignBuilderSession>): number {
  return (session.previewContents ?? []).filter((content) =>
    milestoneHasArtwork(content),
  ).length;
}

function sessionPreviewRichness(
  session: Partial<CampaignBuilderSession>,
): number {
  return (session.previewContents ?? []).reduce(
    (sum, content) => sum + previewContentRichness(content),
    0,
  );
}

function pickRicherPreview(
  left: MilestonePreviewContent | undefined,
  right: MilestonePreviewContent | undefined,
): MilestonePreviewContent | undefined {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return previewContentRichness(right) > previewContentRichness(left)
    ? right
    : left;
}

/**
 * Prefer preview rows that carry generated artwork when server and local diverge.
 * When one side has richer generated content, also prefer that side's milestone
 * list — otherwise a stale server milestone list (different IDs after a playbook
 * rebuild) silently orphans local artwork and the next hydrate writes it away.
 */
function milestoneIdentityKey(
  milestones: CampaignBuilderMilestone[] | undefined,
): string {
  return (milestones ?? [])
    .map((milestone) => milestone.id)
    .slice()
    .sort()
    .join("\0");
}

/** Local milestone ids are a non-empty subset of server — typical intentional delete. */
export function milestonesAreSubsetOf(
  local: CampaignBuilderMilestone[] | undefined,
  server: CampaignBuilderMilestone[] | undefined,
): boolean {
  const localList = local ?? [];
  const serverList = server ?? [];
  if (localList.length === 0 || serverList.length === 0) {
    return false;
  }
  if (localList.length >= serverList.length) {
    return false;
  }
  const serverIds = new Set(serverList.map((milestone) => milestone.id));
  return localList.every((milestone) => serverIds.has(milestone.id));
}

/**
 * True when local and server disagree on which milestones exist (deletes,
 * adds, or playbook rebuild IDs). Intentional deletes (local is a subset of
 * server ids) win even when deleted rows held artwork — richness must not
 * resurrect removed milestones. Playbook rebuild / new ids still require
 * local to be at least as rich.
 */
export function localHasAuthoritativeMilestoneStructure(
  local: Partial<CampaignBuilderSession>,
  server: Partial<CampaignBuilderSession>,
): boolean {
  if (local.milestones === undefined) {
    return false;
  }
  if (
    milestoneIdentityKey(local.milestones) ===
    milestoneIdentityKey(server.milestones)
  ) {
    return false;
  }
  if (milestonesAreSubsetOf(local.milestones, server.milestones)) {
    // Truncated empty seeds must not beat a richer server session. Treat as an
    // intentional delete only when milestonesPlaybookId is set (removeMilestone
    // and playbook sync set this — inspiration.playbookId alone is not enough).
    return Boolean(local.milestonesPlaybookId);
  }
  return (
    sessionArtworkCount(local) >= sessionArtworkCount(server) &&
    sessionPreviewRichness(local) >= sessionPreviewRichness(server)
  );
}

/**
 * Prevent a poorer client snapshot (e.g. empty + "generating"/"failed") from
 * overwriting richer server artwork/captions during persist. Used by
 * saveCampaignBuilderSessionAction after Storage/table RLS hardening made
 * mid-generation failures more visible.
 */
export function protectSessionFromRichnessDowngrade(
  incoming: CampaignBuilderSession,
  existing: CampaignBuilderSession | null | undefined,
): CampaignBuilderSession {
  if (!existing) {
    return incoming;
  }

  const existingRichness = sessionPreviewRichness(existing);
  const incomingRichness = sessionPreviewRichness(incoming);
  const incomingOwnsStructure =
    existingRichness === 0 ||
    incomingRichness >= existingRichness ||
    (milestonesAreSubsetOf(incoming.milestones, existing.milestones) &&
      Boolean(incoming.milestonesPlaybookId));

  if (incomingOwnsStructure) {
    // Incoming owns milestone structure (deletes/adds). Merge previews against
    // that list so we still absorb richer artwork for milestones that remain,
    // without resurrecting rows the client intentionally removed — including
    // when deleted milestones had artwork (richness drops).
    const merged = mergeCampaignBuilderSessions(
      {
        ...existing,
        milestones: incoming.milestones,
        milestonesPlaybookId:
          incoming.milestonesPlaybookId ?? existing.milestonesPlaybookId,
      },
      incoming,
    );
    const keepIds = new Set(incoming.milestones.map((milestone) => milestone.id));
    const mergedPreviews =
      (merged.previewContents as MilestonePreviewContent[] | undefined) ??
      incoming.previewContents;
    return {
      ...incoming,
      inspiration: merged.inspiration ?? incoming.inspiration,
      milestones: incoming.milestones,
      milestonesPlaybookId:
        incoming.milestonesPlaybookId ??
        merged.milestonesPlaybookId ??
        existing.milestonesPlaybookId,
      previewContents: mergedPreviews.filter((preview) =>
        keepIds.has(preview.milestoneId),
      ),
    };
  }

  const merged = mergeCampaignBuilderSessions(incoming, existing);
  return {
    ...incoming,
    inspiration: merged.inspiration ?? existing.inspiration ?? incoming.inspiration,
    // Same milestone ids, poorer content — keep richer previews, not a longer list.
    milestones: incoming.milestones,
    milestonesPlaybookId:
      incoming.milestonesPlaybookId ??
      merged.milestonesPlaybookId ??
      existing.milestonesPlaybookId,
    previewContents:
      (merged.previewContents as MilestonePreviewContent[] | undefined) ??
      existing.previewContents,
  };
}

export function mergeCampaignBuilderSessions(
  primary: Partial<CampaignBuilderSession>,
  secondary: Partial<CampaignBuilderSession>,
): Partial<CampaignBuilderSession> {
  const primaryPreviews = primary.previewContents ?? [];
  const secondaryPreviews = secondary.previewContents ?? [];
  const primaryRichness = sessionPreviewRichness(primary);
  const secondaryRichness = sessionPreviewRichness(secondary);
  const primaryArtwork = sessionArtworkCount(primary);
  const secondaryArtwork = sessionArtworkCount(secondary);

  // Artwork can win over a larger empty server milestone list — but never
  // resurrect milestones when primary is an intentional subset (user deletes).
  const primaryIsAuthoritativeDelete =
    milestonesAreSubsetOf(primary.milestones, secondary.milestones) &&
    Boolean(primary.milestonesPlaybookId);
  const preferSecondaryMilestones =
    Boolean(secondary.milestones?.length) &&
    !primaryIsAuthoritativeDelete &&
    (!primary.milestones?.length ||
      secondaryArtwork > primaryArtwork ||
      (secondaryArtwork === primaryArtwork &&
        secondaryRichness > primaryRichness));

  const resultMilestones = preferSecondaryMilestones
    ? secondary.milestones
    : (primary.milestones ?? secondary.milestones);

  const milestoneIds = new Set(
    (resultMilestones ?? []).map((milestone) => milestone.id),
  );
  const milestoneNameById = new Map(
    (resultMilestones ?? []).map((milestone) => [
      milestone.id,
      normalizeMilestoneName(milestone.name),
    ]),
  );
  const milestoneIdByName = new Map(
    (resultMilestones ?? []).map((milestone) => [
      normalizeMilestoneName(milestone.name),
      milestone.id,
    ]),
  );

  const previewByMilestoneId = new Map<string, MilestonePreviewContent>();

  const absorbPreview = (preview: MilestonePreviewContent) => {
    let targetId = preview.milestoneId;
    if (!milestoneIds.has(targetId)) {
      // Match by name when IDs churned (playbook rebuild / remount).
      const name =
        milestoneNameById.get(preview.milestoneId) ??
        normalizeMilestoneName(
          [...(primary.milestones ?? []), ...(secondary.milestones ?? [])].find(
            (milestone) => milestone.id === preview.milestoneId,
          )?.name ?? "",
        );
      const remappedId = name ? milestoneIdByName.get(name) : undefined;
      if (!remappedId) {
        return;
      }
      targetId = remappedId;
    }

    const nextPreview =
      targetId === preview.milestoneId
        ? preview
        : { ...preview, milestoneId: targetId };
    const existing = previewByMilestoneId.get(targetId);
    const richer = pickRicherPreview(existing, nextPreview);
    if (richer) {
      previewByMilestoneId.set(targetId, richer);
    }
  };

  for (const preview of primaryPreviews) {
    absorbPreview(preview);
  }
  for (const preview of secondaryPreviews) {
    absorbPreview(preview);
  }

  const previewContents = (resultMilestones ?? []).map((milestone) => {
    const existing = previewByMilestoneId.get(milestone.id);
    return existing ?? buildEmptyPreviewContent(milestone);
  });

  // Prefer the side that actually carries artwork / richer content for
  // playbook tracking so a remount does not revert milestonesPlaybookId.
  const milestonesPlaybookId =
    secondaryArtwork > primaryArtwork ||
    (secondaryArtwork === primaryArtwork && secondaryRichness > primaryRichness)
      ? (secondary.milestonesPlaybookId ?? primary.milestonesPlaybookId ?? null)
      : (primary.milestonesPlaybookId ?? secondary.milestonesPlaybookId ?? null);

  const primaryInspirationCount = (
    primary.inspiration?.inspirationImages ?? []
  ).filter(
    (image) =>
      Boolean(
        image.url?.startsWith("http://") ||
          image.url?.startsWith("https://") ||
          image.previewUrl?.startsWith("http://") ||
          image.previewUrl?.startsWith("https://") ||
          image.previewUrl?.startsWith("blob:"),
      ),
  ).length;
  const secondaryInspirationCount = (
    secondary.inspiration?.inspirationImages ?? []
  ).filter(
    (image) =>
      Boolean(
        image.url?.startsWith("http://") ||
          image.url?.startsWith("https://") ||
          image.previewUrl?.startsWith("http://") ||
          image.previewUrl?.startsWith("https://") ||
          image.previewUrl?.startsWith("blob:"),
      ),
  ).length;
  const inspiration =
    secondaryInspirationCount > primaryInspirationCount
      ? (secondary.inspiration ?? primary.inspiration)
      : (primary.inspiration ?? secondary.inspiration);

  return {
    ...primary,
    ...secondary,
    inspiration,
    milestones: resultMilestones,
    milestonesPlaybookId,
    previewContents,
    selectedMilestoneId:
      primary.selectedMilestoneId ?? secondary.selectedMilestoneId ?? null,
    currentStep: primary.currentStep ?? secondary.currentStep,
    previewTab: primary.previewTab ?? secondary.previewTab,
  };
}

export function reconcilePreviewContent(
  content: MilestonePreviewContent,
  milestone?: CampaignBuilderMilestone,
  defaultApprovalStatuses: MilestonePreviewContent["approvalStatuses"] = [],
): MilestonePreviewContent {
  const enabledFormats =
    content.enabledFormats && content.enabledFormats.length > 0
      ? content.enabledFormats
      : milestone?.platformFormats && milestone.platformFormats.length > 0
        ? milestone.platformFormats
        : defaultEnabledFormats();

  const rawCaptions = content.captions ?? [
    { platform: "facebook", text: "" },
    { platform: "instagram", text: "" },
  ];
  const captionPlatforms = captionPlatformsForFormats(enabledFormats);
  const captions =
    captionPlatforms.length > 0
      ? ensureSharedCaptionsForPlatforms(rawCaptions, captionPlatforms)
      : rawCaptions;

  const normalized: MilestonePreviewContent = {
    ...content,
    artwork: normalizeMilestoneArtwork(content.artwork),
    enabledFormats,
    captions,
    emailSendDate: content.emailSendDate ?? content.scheduleDate,
    emailSendTime: content.emailSendTime ?? content.scheduleTime,
    manualEmailTo: content.manualEmailTo ?? "marrina@heyralli.com",
    manualUploadLink: content.manualUploadLink ?? "",
    approvalStatuses: content.approvalStatuses ?? defaultApprovalStatuses,
    generationStartedAt: content.generationStartedAt ?? null,
  };

  let generationStatus: MilestoneGenerationStatus =
    content.generationStatus ??
    generationStatusAfterContent(normalized, enabledFormats);

  if (
    generationStatus === "generating" &&
    isStaleGeneration(normalized.generationStartedAt)
  ) {
    generationStatus = generationStatusAfterContent(normalized, enabledFormats);
    if (generationStatus === "ready_to_generate") {
      generationStatus = "failed";
    }
  }

  return {
    ...normalized,
    generationStatus: inferGenerationStatus(
      { ...normalized, generationStatus },
      enabledFormats,
    ),
  };
}

function alignPreviewContentsWithMilestones(
  milestones: CampaignBuilderMilestone[],
  rawPreviews: MilestonePreviewContent[],
  rawMilestones: CampaignBuilderMilestone[],
  defaults: CampaignBuilderSession,
): MilestonePreviewContent[] {
  const rawMilestoneById = new Map(rawMilestones.map((milestone) => [milestone.id, milestone]));
  const defaultMilestoneById = new Map(
    defaults.milestones.map((milestone) => [milestone.id, milestone]),
  );
  const defaultApprovalStatuses =
    defaults.previewContents[0]?.approvalStatuses ?? [];

  const normalizedPreviews = rawPreviews.map((content) =>
    reconcilePreviewContent(
      content,
      rawMilestoneById.get(content.milestoneId),
      defaultApprovalStatuses,
    ),
  );

  const previewByMilestoneId = new Map<string, MilestonePreviewContent>();
  const orphans: MilestonePreviewContent[] = [];

  for (const preview of normalizedPreviews) {
    if (milestones.some((milestone) => milestone.id === preview.milestoneId)) {
      previewByMilestoneId.set(preview.milestoneId, preview);
      continue;
    }
    orphans.push(preview);
  }

  for (const orphan of orphans) {
    const rawMilestone =
      rawMilestoneById.get(orphan.milestoneId) ??
      defaultMilestoneById.get(orphan.milestoneId);
    const orphanName = rawMilestone
      ? normalizeMilestoneName(rawMilestone.name)
      : null;
    if (!orphanName) {
      continue;
    }

    const targetMilestone = milestones.find(
      (milestone) =>
        milestone.name === orphanName && !previewByMilestoneId.has(milestone.id),
    );
    if (!targetMilestone) {
      continue;
    }

    previewByMilestoneId.set(targetMilestone.id, {
      ...orphan,
      milestoneId: targetMilestone.id,
    });
  }

  return milestones.map((milestone) => {
    const existing = previewByMilestoneId.get(milestone.id);
    if (existing) {
      return reconcilePreviewContent(existing, milestone, defaultApprovalStatuses);
    }

    return reconcilePreviewContent(
      buildEmptyPreviewContent(milestone),
      milestone,
      defaultApprovalStatuses,
    );
  });
}

export function hydrateCampaignBuilderSession(
  base: Partial<CampaignBuilderSession>,
  local: Partial<CampaignBuilderSession> | null,
  eventId: string,
  eventTitle: string,
  eventDate: string,
  // False when the server-side session read failed or found nothing (e.g. the
  // DB table is unreachable, or this is a brand-new campaign). In that case
  // `base` is just seed defaults, not a real record — the local copy (which
  // may reflect real, unsaved edits like deletions) must win instead, or a
  // failed read on any fresh page load would silently resurrect deleted
  // milestones and discard other local-only edits.
  //
  // Even when the server read succeeds, local wins the merge if it has more
  // generated artwork. Server upserts often lag or fail, and a stale server
  // snapshot must never wipe freshly generated Preview artwork on remount.
  serverLoadSucceeded: boolean = true,
): CampaignBuilderSession {
  if (!local) {
    return normalizeCampaignBuilderSession(base, eventId, eventTitle, eventDate);
  }

  const localHasMoreArtwork =
    sessionArtworkCount(local) > sessionArtworkCount(base);
  const localHasRicherContent =
    sessionArtworkCount(local) === sessionArtworkCount(base) &&
    sessionPreviewRichness(local) > sessionPreviewRichness(base);
  // Equal-richness deletes must win over a stale longer server list — otherwise
  // remount / Preview hydrate resurrects milestones the user already removed.
  const preferLocal =
    !serverLoadSucceeded ||
    localHasMoreArtwork ||
    localHasRicherContent ||
    localHasAuthoritativeMilestoneStructure(local, base);

  const merged = preferLocal
    ? mergeCampaignBuilderSessions(local, base)
    : mergeCampaignBuilderSessions(base, local);

  return normalizeCampaignBuilderSession(merged, eventId, eventTitle, eventDate);
}

function normalizePreviewTab(tab: PreviewTabId | string | undefined): PreviewTabId {
  if (tab === "fb-feed" || tab === "ig-feed") {
    return "feed";
  }
  if (tab === "fb-story" || tab === "ig-story") {
    return "story";
  }
  if (
    tab === "all" ||
    tab === "feed" ||
    tab === "story" ||
    tab === "captions" ||
    tab === "schedule"
  ) {
    return tab;
  }
  return "all";
}

/**
 * Backward-compatible hydration for sessions saved before V2 field expansions.
 */
export function normalizeCampaignBuilderSession(
  raw: Partial<CampaignBuilderSession>,
  eventId: string,
  eventTitle: string,
  eventDate: string,
): CampaignBuilderSession {
  const defaults = buildDefaultSession(eventId, eventTitle, eventDate);

  const inspiration = migrateLegacyCreativeFields(
    {
      ...raw.inspiration,
      // Bind identity to the route event — never keep another campaign's id/title
      // from a corrupted local/server snapshot (e.g. old Inspiration dropdown rename).
      campaignId: eventId,
      campaignName: eventTitle || defaults.inspiration.campaignName,
      primarySchoolColor:
        raw.inspiration?.primarySchoolColor ?? defaults.inspiration.primarySchoolColor,
      secondarySchoolColor:
        raw.inspiration?.secondarySchoolColor ?? defaults.inspiration.secondarySchoolColor,
      // Strip demo/example AI guidance so it never masquerades as a real,
      // user-authored campaign instruction fed into generation prompts.
      globalAiGuidance: sanitizeGlobalAiGuidance(
        raw.inspiration?.globalAiGuidance ?? defaults.inspiration.globalAiGuidance,
      ),
    },
    defaults.inspiration,
  );

  const milestones = [...(raw.milestones ?? defaults.milestones)]
    .map((milestone, index) => {
      const name = normalizeMilestoneName(milestone.name);
      return {
        ...milestone,
        name,
        platformFormats:
          milestone.platformFormats ?? defaultEnabledFormats(),
        artworkNotes: sanitizeSeedNotes(milestone.artworkNotes),
        captionNotes: sanitizeSeedNotes(milestone.captionNotes),
        statusTag: milestone.statusTag ?? "not-started",
        sortOrder: milestone.sortOrder ?? index,
        creativeOverrides: normalizeMilestoneCreativeOverrides(
          milestone.creativeOverrides,
        ),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((milestone, index) => {
      const isFirstMilestone = isFirstCampaignMilestone(index);
      const category = isFirstMilestone ? "awareness" : milestone.category;
      return {
        ...milestone,
        sortOrder: index,
        category,
        purpose: sanitizeSeedPurpose(milestone.purpose, milestone.name, {
          category,
          isFirstMilestone,
        }),
      };
    });

  const rawMilestones = raw.milestones ?? defaults.milestones;
  const rawPreviews = (raw.previewContents ?? defaults.previewContents).map(
    (content) => ({
      ...content,
      captions: (content.captions ?? []).map((caption) =>
        isStaleDemoCaption(caption.text)
          ? { ...caption, text: "" }
          : caption,
      ),
    }),
  );
  const previewContents = alignPreviewContentsWithMilestones(
    milestones,
    rawPreviews,
    rawMilestones,
    defaults,
  );

  const approvalWorkflow = sanitizeApprovalWorkflowDemoAssignees(
    raw.approvalWorkflow ?? defaults.approvalWorkflow,
  );

  return {
    ...defaults,
    ...raw,
    eventId,
    inspiration,
    milestones,
    milestonesPlaybookId: raw.milestonesPlaybookId ?? defaults.milestonesPlaybookId ?? null,
    previewContents,
    approvalWorkflow,
    expandedReviewMilestoneIds: raw.expandedReviewMilestoneIds ?? [],
    previewTab: normalizePreviewTab(raw.previewTab),
    currentStep: raw.currentStep ?? defaults.currentStep,
  };
}
