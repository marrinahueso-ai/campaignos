"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { BackgroundLibraryPicker } from "@/components/background-library/BackgroundLibraryPicker";
import { useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { CampaignBuilderFooter } from "@/components/campaign-builder-v2/CampaignBuilderFooter";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { filesFromDataTransfer } from "@/lib/campaign-builder-v2/inspiration-utils";
import {
  applyColorMode,
  clearAllCreativeSelections,
  creativeSummaryLabels,
  DEFAULT_VOICE_TONE_CHOICES,
  toCreativeConfiguration,
} from "@/lib/campaign-builder-v2/creative-config";
import type { CreativeColorMode } from "@/lib/campaign-builder-v2/types";
import { cn } from "@/lib/utils/cn";

function isOptimizableImageUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

function InspirationPreviewImage({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  if (isOptimizableImageUrl(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 45vw, 240px"
        quality={75}
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
        className="object-cover"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={480}
      height={360}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className="h-full w-full object-cover"
    />
  );
}

function SectionHeader({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cos-brand-sage/15 text-xs font-bold text-cos-brand-sage">
        {number}
      </span>
      <div>
        <h2 className="font-display text-xl text-cos-text">{title}</h2>
        <p className="mt-0.5 text-sm text-cos-muted">{description}</p>
      </div>
    </div>
  );
}

function SelectionCard({
  selected,
  disabled,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-[14px] border px-3 py-3 text-left transition",
        disabled && "cursor-not-allowed opacity-50",
        selected
          ? "border-[#d4a84b] bg-[#fffdf8] shadow-[0_0_0_3px_rgba(212,168,75,0.22)]"
          : "border-cos-border bg-cos-bg hover:border-cos-brand-sage",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function InspirationStep() {
  const {
    session,
    updateInspiration,
    setPlaybookId,
    selectCampaign,
    addInspirationImages,
    addInspirationFromLibrary,
    removeInspirationImage,
    updateInspirationImage,
    uploadCampaignLogo,
    saveCreativeSetupAndContinue,
    playbookOptions,
    campaignOptions,
    logoOptions,
    schoolColors,
    inspirationUploadError,
    clearInspirationUploadError,
    isSaving,
    canUploadArtwork,
  } = useCampaignBuilder();

  const inspirationInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [continueError, setContinueError] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [playbookError, setPlaybookError] = useState<string | null>(null);
  const [isUpdatingPlaybook, setIsUpdatingPlaybook] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const { inspiration } = session;
  const config = useMemo(
    () => toCreativeConfiguration(inspiration),
    [inspiration],
  );
  const summary = useMemo(() => creativeSummaryLabels(config), [config]);
  const hasSchoolColors = Boolean(
    schoolColors.primary || schoolColors.secondary,
  );
  const inspirationImages = inspiration.inspirationImages ?? [];
  const hasInspirationImages = inspirationImages.length > 0;

  const colorMode: CreativeColorMode = inspiration.colorMode ?? "none";
  const voiceValues = inspiration.voiceToneValues ?? [];
  const selectedLogo =
    logoOptions.find((logo) => logo.id === inspiration.selectedLogoId) ??
    (inspiration.uploadedLogoUrl && inspiration.selectedLogoId
      ? {
          id: inspiration.selectedLogoId,
          label: inspiration.uploadedLogoLabel || "Uploaded logo",
          url: inspiration.uploadedLogoUrl,
        }
      : null);

  function setColorMode(mode: CreativeColorMode) {
    if (mode === "inspiration_palette" && !hasInspirationImages) {
      return;
    }
    updateInspiration(applyColorMode(inspiration, mode, schoolColors));
  }

  function selectNoneLogo() {
    updateInspiration({
      selectedLogoId: null,
      includeLogoInArtwork: false,
      includeLogoInArtworkUserSet: true,
      uploadedLogoUrl: null,
      uploadedLogoLabel: null,
    });
  }

  function selectOrgLogo(logoId: string) {
    updateInspiration({
      selectedLogoId: logoId,
      includeLogoInArtwork: true,
      includeLogoInArtworkUserSet: true,
      uploadedLogoUrl: null,
      uploadedLogoLabel: null,
    });
  }

  function toggleVoiceTone(value: string) {
    const next = voiceValues.includes(value)
      ? voiceValues.filter((tone) => tone !== value)
      : [...voiceValues, value];
    updateInspiration({
      voiceToneValues: next,
      voiceTone: next.join(", "),
    });
  }

  function selectNoneVoice() {
    updateInspiration({
      voiceToneValues: [],
      voiceTone: "",
    });
  }

  function handleClearAll() {
    updateInspiration(clearAllCreativeSelections(inspiration));
    setShowClearConfirm(false);
  }

  async function handleSaveAndContinue() {
    setContinueError(null);
    setIsContinuing(true);
    try {
      // Persist + navigate only — never generates artwork/captions or spends credits.
      const result = await saveCreativeSetupAndContinue();
      if (!result.success) {
        setContinueError(result.message ?? "Could not save creative setup.");
      }
    } finally {
      setIsContinuing(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl text-cos-text sm:text-[1.75rem]">
                Creative Setup
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-cos-muted">
                Brand logos from Setup, inspiration, and a communication plan that maps
                your posts. You’re in control.
              </p>
            </div>
          </header>
        <div className="space-y-5">

          <div className="grid gap-6 lg:grid-cols-3">
            <Select
              label="Campaign name"
              value={inspiration.campaignId}
              onChange={(e) => selectCampaign(e.target.value)}
            >
              {campaignOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Input
              label="Event date"
              type="date"
              value={inspiration.eventDate}
              onChange={(e) => updateInspiration({ eventDate: e.target.value })}
            />
            <Select
              label="Communication Plan"
              value={inspiration.playbookId}
              disabled={isUpdatingPlaybook}
              onChange={(e) => {
                const nextId = e.target.value;
                setPlaybookError(null);
                setIsUpdatingPlaybook(true);
                void (async () => {
                  try {
                    const result = await setPlaybookId(nextId);
                    if (!result.success) {
                      setPlaybookError(
                        result.message ??
                          "Could not update communication plan posts.",
                      );
                    }
                  } finally {
                    setIsUpdatingPlaybook(false);
                  }
                })();
              }}
            >
              {playbookOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </div>

          {session.milestones.length > 0 ? (
            <div className="rounded-[14px] border border-[rgba(47,159,179,0.25)] bg-[#f3fbfc] p-3">
              <p className="mb-2 text-[11px] font-extrabold tracking-[0.05em] text-[#1a6574] uppercase">
                Communication plan maps to {session.milestones.length} posts
              </p>
              <ul className="space-y-1.5">
                {session.milestones.slice(0, 6).map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-2 border-t border-[rgba(47,159,179,0.15)] pt-1.5 text-xs first:border-t-0 first:pt-0"
                  >
                    <span className="rounded-full border border-[#c5e4ea] bg-white px-2 py-0.5 font-bold text-[#1a6574]">
                      {m.suggestedDate
                        ? new Date(`${m.suggestedDate}T12:00:00`).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )
                        : "—"}
                    </span>
                    <span className="font-semibold text-cos-text">{m.name}</span>
                    <span className="ml-auto text-cos-muted">
                      {m.category}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {playbookError && (
            <p
              className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {playbookError}
            </p>
          )}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-8">
              {/* 1. Inspiration */}
              <section className="space-y-4 rounded-[22px] border border-cos-border bg-cos-card p-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <SectionHeader
                  number={1}
                  title="Inspiration"
                  description={
                    canUploadArtwork
                      ? "Optional. Upload images or pick from the gallery — add notes per image if you like."
                      : "Optional visual references for this campaign. Uploading new images is not available for your access level."
                  }
                />

                {!canUploadArtwork && (
                  <p className="rounded border border-cos-border bg-cos-bg/40 px-3 py-2 text-xs text-cos-muted">
                    Inspiration and logo uploads are disabled for your role.
                  </p>
                )}

                <div
                  className={cn(
                    "grid gap-4",
                    canUploadArtwork && "sm:grid-cols-[12rem_minmax(0,1fr)]",
                  )}
                >
                  {canUploadArtwork && (
                    <>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Upload inspiration images"
                        onClick={() => inspirationInputRef.current?.click()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            inspirationInputRef.current?.click();
                          }
                        }}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = "copy";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          addInspirationImages(
                            filesFromDataTransfer(event.dataTransfer),
                          );
                        }}
                        className={cn(
                          "flex min-h-[9rem] cursor-pointer flex-col items-center justify-center border border-dashed border-cos-border bg-cos-bg/30 px-4 py-6 text-center transition-colors",
                          "hover:border-cos-accent hover:bg-cos-bg/50",
                        )}
                      >
                        <Upload
                          className="h-7 w-7 text-cos-muted"
                          strokeWidth={1.25}
                        />
                        <p className="mt-2 text-sm font-medium text-cos-text">
                          Drag & drop
                        </p>
                        <p className="mt-1 text-xs text-cos-muted">
                          PNG, JPG up to 10 MB
                        </p>
                      </div>
                      <input
                        ref={inspirationInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        aria-label="Choose inspiration images"
                        className="hidden"
                        onChange={(event) => {
                          addInspirationImages(
                            Array.from(event.target.files ?? []),
                          );
                          event.target.value = "";
                        }}
                      />
                    </>
                  )}

                  <div className="space-y-3">
                    {inspirationImages.length === 0 ? (
                      <div className="flex min-h-[9rem] items-center justify-center border border-dashed border-cos-border bg-cos-bg/20 px-4 text-center text-xs text-cos-muted">
                        None — no inspiration images yet
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {inspirationImages.map((image, index) => (
                          <div
                            key={image.id}
                            className="space-y-2 border border-cos-border bg-cos-bg/20 p-2"
                          >
                            <div className="relative aspect-[4/3] overflow-hidden bg-cos-card">
                              <button
                                type="button"
                                aria-label={`Remove ${image.label}`}
                                onClick={() => removeInspirationImage(image.id)}
                                className="absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-cos-card/90 text-cos-muted shadow-sm transition-colors hover:bg-cos-card hover:text-cos-text"
                              >
                                <X className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                              {image.previewUrl || image.url ? (
                                <InspirationPreviewImage
                                  src={image.previewUrl || image.url || ""}
                                  alt={image.label}
                                  priority={index < 2}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[10px] text-cos-muted">
                                  {image.label}
                                </div>
                              )}
                            </div>
                            <Input
                              label="Comment (optional)"
                              value={image.comment ?? ""}
                              onChange={(e) =>
                                updateInspirationImage(image.id, {
                                  comment: e.target.value,
                                })
                              }
                              placeholder="What should AI take from this?"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {canUploadArtwork && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <button
                          type="button"
                          onClick={() => inspirationInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-text underline hover:no-underline"
                        >
                          <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                          Add images
                        </button>
                        <button
                          type="button"
                          onClick={() => setLibraryOpen(true)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-text underline hover:no-underline"
                        >
                          Browse Library
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <Textarea
                  label="Overall inspiration comment (optional)"
                  value={inspiration.inspirationOverallComment ?? ""}
                  onChange={(e) =>
                    updateInspiration({
                      inspirationOverallComment: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Overall look, mood, or style notes…"
                />

                {inspirationUploadError && (
                  <p
                    className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    role="alert"
                  >
                    {inspirationUploadError}{" "}
                    <button
                      type="button"
                      onClick={clearInspirationUploadError}
                      className="font-medium underline hover:no-underline"
                    >
                      Dismiss
                    </button>
                  </p>
                )}
              </section>

              {/* 2. Logo */}
              <section className="space-y-4 rounded-[22px] border border-cos-border bg-cos-card p-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <SectionHeader
                  number={2}
                  title="Logo"
                  description={
                    canUploadArtwork
                      ? "Optional. Choose None, an organization logo, or upload one."
                      : "Optional. Choose None or an organization logo."
                  }
                />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <SelectionCard
                    selected={!config.logo.enabled}
                    onClick={selectNoneLogo}
                  >
                    <span className="text-sm font-medium text-cos-text">
                      None
                    </span>
                  </SelectionCard>

                  {logoOptions.map((logo) => {
                    const selected =
                      config.logo.enabled &&
                      inspiration.selectedLogoId === logo.id &&
                      !inspiration.uploadedLogoUrl;
                    return (
                      <SelectionCard
                        key={logo.id}
                        selected={selected}
                        onClick={() => selectOrgLogo(logo.id)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logo.url}
                          alt={logo.label}
                          className="h-10 w-10 object-contain"
                        />
                        <span className="text-sm font-medium text-cos-text">
                          {logo.label}
                        </span>
                      </SelectionCard>
                    );
                  })}

                  {inspiration.uploadedLogoUrl && selectedLogo && (
                    <SelectionCard
                      selected={
                        config.logo.enabled &&
                        inspiration.selectedLogoId === selectedLogo.id
                      }
                      onClick={() =>
                        updateInspiration({
                          selectedLogoId: selectedLogo.id,
                          includeLogoInArtwork: true,
                          includeLogoInArtworkUserSet: true,
                        })
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={inspiration.uploadedLogoUrl}
                        alt={selectedLogo.label}
                        className="h-10 w-10 object-contain"
                      />
                      <span className="text-sm font-medium text-cos-text">
                        {selectedLogo.label}
                      </span>
                    </SelectionCard>
                  )}

                  {canUploadArtwork && (
                    <>
                      <SelectionCard
                        selected={false}
                        onClick={() => logoInputRef.current?.click()}
                        className="border-dashed"
                      >
                        <Upload
                          className="h-5 w-5 text-cos-muted"
                          strokeWidth={1.5}
                        />
                        <span className="text-sm font-medium text-cos-text">
                          Upload logo
                        </span>
                      </SelectionCard>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        aria-label="Upload campaign logo"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void uploadCampaignLogo(file);
                          }
                          event.target.value = "";
                        }}
                      />
                    </>
                  )}
                </div>

                {logoOptions.length === 0 && !inspiration.uploadedLogoUrl && (
                  <p className="text-xs text-cos-muted">
                    No organization logos yet.{" "}
                    <Link
                      href="/onboarding/brand"
                      className="font-medium text-cos-text underline hover:no-underline"
                    >
                      Add logos in your brand kit
                    </Link>
                    {canUploadArtwork ? " or upload one here." : "."}
                  </p>
                )}
              </section>

              {/* 3. Colors */}
              <section className="space-y-4 rounded-[22px] border border-cos-border bg-cos-card p-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <SectionHeader
                  number={3}
                  title="Colors"
                  description="Optional. Pick one mode — switching clears the previous mode."
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        mode: "none" as const,
                        label: "None",
                        hint: "No color guidance",
                      },
                      {
                        mode: "organization_palette" as const,
                        label: "Organization palette",
                        hint: hasSchoolColors
                          ? "Use saved brand colors"
                          : "No brand colors saved",
                        disabled: !hasSchoolColors,
                      },
                      {
                        mode: "inspiration_palette" as const,
                        label: "Inspiration palette",
                        hint: hasInspirationImages
                          ? "Derive colors from uploads"
                          : "Add inspiration images first",
                        disabled: !hasInspirationImages,
                      },
                      {
                        mode: "custom_palette" as const,
                        label: "Custom palette",
                        hint: "Choose your own swatches",
                      },
                    ] as const
                  ).map((option) => (
                    <SelectionCard
                      key={option.mode}
                      selected={colorMode === option.mode}
                      disabled={"disabled" in option ? option.disabled : false}
                      onClick={() => setColorMode(option.mode)}
                    >
                      <div>
                        <p className="text-sm font-medium text-cos-text">
                          {option.label}
                        </p>
                        <p className="mt-0.5 text-xs text-cos-muted">
                          {option.hint}
                        </p>
                      </div>
                    </SelectionCard>
                  ))}
                </div>

                {colorMode === "organization_palette" && hasSchoolColors && (
                  <div className="flex flex-wrap items-center gap-3">
                    {schoolColors.primary && (
                      <span className="inline-flex items-center gap-2 text-xs text-cos-muted">
                        <span
                          className="h-5 w-5 rounded-full border border-cos-border"
                          style={{ backgroundColor: schoolColors.primary }}
                        />
                        Primary {schoolColors.primary}
                      </span>
                    )}
                    {schoolColors.secondary && (
                      <span className="inline-flex items-center gap-2 text-xs text-cos-muted">
                        <span
                          className="h-5 w-5 rounded-full border border-cos-border"
                          style={{ backgroundColor: schoolColors.secondary }}
                        />
                        Secondary {schoolColors.secondary}
                      </span>
                    )}
                  </div>
                )}

                {colorMode === "custom_palette" && (
                  <div className="flex flex-wrap gap-3">
                    {(inspiration.customPaletteColors?.length
                      ? inspiration.customPaletteColors
                      : ["#1e3a5f", "#c4a35a"]
                    ).map((color, index) => (
                      <label
                        key={`custom-color-${index}`}
                        className="flex items-center gap-2 text-xs text-cos-muted"
                      >
                        <input
                          type="color"
                          value={color}
                          onChange={(event) => {
                            const next = [
                              ...(inspiration.customPaletteColors?.length
                                ? inspiration.customPaletteColors
                                : ["#1e3a5f", "#c4a35a"]),
                            ];
                            next[index] = event.target.value;
                            updateInspiration({ customPaletteColors: next });
                          }}
                          className="h-9 w-12 cursor-pointer border border-cos-border bg-white p-1"
                        />
                        {color}
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateInspiration({
                          customPaletteColors: [
                            ...(inspiration.customPaletteColors ?? []),
                            "#ffffff",
                          ],
                        })
                      }
                      className="text-xs font-medium text-cos-text underline hover:no-underline"
                    >
                      Add color
                    </button>
                  </div>
                )}
              </section>

              {/* 4. Voice & Tone */}
              <section className="space-y-4 rounded-[22px] border border-cos-border bg-cos-card p-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <SectionHeader
                  number={4}
                  title="Voice & Tone"
                  description="Optional. Select None, or one or more tones."
                />

                <div className="flex flex-wrap gap-2">
                  <SelectionCard
                    selected={!config.voiceTone.enabled}
                    onClick={selectNoneVoice}
                    className="px-3 py-2"
                  >
                    <span className="text-sm font-medium text-cos-text">
                      None
                    </span>
                  </SelectionCard>
                  {DEFAULT_VOICE_TONE_CHOICES.map((tone) => {
                    const selected = voiceValues.includes(tone);
                    return (
                      <SelectionCard
                        key={tone}
                        selected={selected}
                        onClick={() => toggleVoiceTone(tone)}
                        className="px-3 py-2"
                      >
                        <span className="text-sm font-medium text-cos-text">
                          {tone}
                        </span>
                      </SelectionCard>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Live vibe preview — matches Newsletter LivePane / mock phone */}
            <aside className="lg:sticky lg:top-4 lg:self-start">
              <div className="overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
                <div className="border-b border-cos-border bg-[linear-gradient(90deg,rgba(107,129,113,0.08),rgba(212,168,75,0.1))] px-3.5 py-2.5 text-[11px] font-extrabold tracking-[0.06em] text-cos-brand-sage uppercase">
                  Live vibe preview
                </div>
                <div className="flex justify-center bg-[linear-gradient(160deg,#f3f0ea,#efe8d8_55%,#e8f2f4)] px-3.5 py-5">
                  <div className="w-[220px] rounded-[32px] bg-[#1c2430] p-2.5 shadow-[0_18px_40px_rgba(42,38,34,0.12)]">
                    <div className="mx-auto mb-2.5 h-2 w-[72px] rounded-full bg-[#2a3340]" />
                    <div className="overflow-hidden rounded-[22px] bg-[#0f1419]">
                      <div className="flex items-center justify-between bg-white px-3 py-2.5 text-xs font-bold text-[#111]">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-[22px] w-[22px] rounded-full bg-[linear-gradient(145deg,#c4922e,#f5e6c2)]" />
                          yourteam
                        </span>
                        ···
                      </div>
                      <div
                        className="relative aspect-square"
                        style={{
                          background:
                            inspirationImages[0]?.previewUrl ||
                            inspirationImages[0]?.url
                              ? undefined
                              : "radial-gradient(circle at 30% 30%, rgba(255,252,247,.25), transparent 40%), linear-gradient(145deg, #2f4a3c 0%, #6b8171 50%, #d4a84b 100%)",
                        }}
                      >
                        {inspirationImages[0]?.previewUrl ||
                        inspirationImages[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              inspirationImages[0].previewUrl ||
                              inspirationImages[0].url ||
                              ""
                            }
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : null}
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-white/92 px-2 py-1 text-[9px] font-extrabold tracking-wide text-[#2f4a3c] uppercase">
                          Feed
                        </span>
                        {selectedLogo?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selectedLogo.url}
                            alt=""
                            className="absolute top-2.5 right-2.5 h-8 w-8 rounded-[10px] border-2 border-white/80 bg-white object-contain p-0.5 shadow"
                          />
                        ) : null}
                        <div className="absolute right-3 bottom-3 left-3 font-display text-[22px] font-bold leading-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.35)]">
                          {inspiration.campaignName.trim() || "Your campaign"}
                        </div>
                      </div>
                      <div className="bg-white px-3 py-2.5 text-[11px] text-[#444]">
                        <p className="mb-1 font-bold text-[#222]">♡ Liked by your community</p>
                        <p>
                          <strong>yourteam</strong>{" "}
                          {summary.voiceTone !== "None"
                            ? `${summary.voiceTone} — `
                            : ""}
                          Soft CTA, warm and clear.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 border-t border-cos-border px-4 py-3 text-xs text-cos-muted">
                  <div className="flex justify-between gap-2">
                    <span>Inspiration</span>
                    <span className="font-semibold text-cos-text">
                      {summary.inspiration}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Logo</span>
                    <span className="font-semibold text-cos-text">
                      {summary.logo}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Colors</span>
                    <span className="font-semibold text-cos-text">
                      {summary.colors}
                    </span>
                  </div>
                  {!showClearConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      className="mt-1 w-full rounded-[12px] border border-cos-border px-3 py-2 text-xs font-semibold text-cos-muted transition hover:border-cos-brand-sage hover:text-cos-text"
                    >
                      Clear all selections
                    </button>
                  ) : (
                    <div className="mt-1 space-y-2 rounded-[12px] border border-cos-border bg-cos-bg/40 p-3">
                      <p>Reset inspiration, logo, colors, and tone?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleClearAll}
                          className="flex-1 rounded-full bg-cos-text px-2 py-1.5 text-xs font-semibold text-[#f6f2eb]"
                        >
                          Clear all
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(false)}
                          className="flex-1 rounded-full border border-cos-border px-2 py-1.5 text-xs font-semibold text-cos-text"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>

          {continueError && (
            <p
              className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {continueError}
            </p>
          )}
        </div>

      <CampaignBuilderFooter
        showBack={false}
        onContinue={() => {
          void handleSaveAndContinue();
        }}
        continueLabel="Save → Posts"
        continueLoading={isContinuing || isSaving}
      />

      <BackgroundLibraryPicker
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(asset) => {
          addInspirationFromLibrary(asset);
        }}
      />
    </div>
  );
}
