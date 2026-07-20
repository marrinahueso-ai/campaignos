"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { CampaignBuilderFooter } from "@/components/campaign-builder-v2/CampaignBuilderFooter";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
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
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cos-border bg-cos-bg text-xs font-medium text-cos-text">
        {number}
      </span>
      <div>
        <h2 className="text-sm font-medium text-cos-text">{title}</h2>
        <p className="mt-0.5 text-xs text-cos-muted">{description}</p>
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
        "flex items-center gap-3 border px-3 py-3 text-left transition-colors",
        disabled && "cursor-not-allowed opacity-50",
        selected
          ? "border-cos-dark bg-cos-bg-alt"
          : "border-cos-border bg-cos-card hover:border-cos-accent/50",
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
    addInspirationImage,
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-8">
        <div className="studio-page space-y-8">
          <header>
            <h1 className="font-display text-4xl text-cos-text">
              Your Creative Setup
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-cos-muted">
              Tell AI what to use — or skip. You’re in control.
            </p>
            <p className="mt-2 max-w-2xl text-xs text-cos-muted">
              These choices will guide artwork created for this campaign’s
              milestones. You can still adjust an individual milestone later.
            </p>
          </header>

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
              label="Playbook"
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
                          "Could not update playbook milestones.",
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

          {playbookError && (
            <p
              className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {playbookError}
            </p>
          )}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-8">
              {/* 1. Inspiration */}
              <section className="space-y-4 border border-cos-border bg-cos-card p-5">
                <SectionHeader
                  number={1}
                  title="Inspiration"
                  description={
                    canUploadArtwork
                      ? "Optional. Upload posters, flyers, or mood images — add notes per image if you like."
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
                      <button
                        type="button"
                        aria-label="Upload inspiration images"
                        onClick={() => inspirationInputRef.current?.click()}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const files = Array.from(
                            event.dataTransfer.files ?? [],
                          );
                          for (const file of files) {
                            if (file.type.startsWith("image/")) {
                              addInspirationImage(file);
                            }
                          }
                        }}
                        className={cn(
                          "flex min-h-[9rem] flex-col items-center justify-center border border-dashed border-cos-border bg-cos-bg/30 px-4 py-6 text-center transition-colors",
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
                      </button>
                      <input
                        ref={inspirationInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        aria-label="Choose inspiration images"
                        className="hidden"
                        onChange={(event) => {
                          const files = Array.from(event.target.files ?? []);
                          for (const file of files) {
                            addInspirationImage(file);
                          }
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
                      <button
                        type="button"
                        onClick={() => inspirationInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-text underline hover:no-underline"
                      >
                        <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Add images
                      </button>
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
              <section className="space-y-4 border border-cos-border bg-cos-card p-5">
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
                      href="/settings/school-setup"
                      className="font-medium text-cos-text underline hover:no-underline"
                    >
                      Add logos in Organization settings
                    </Link>
                    {canUploadArtwork ? " or upload one here." : "."}
                  </p>
                )}
              </section>

              {/* 3. Colors */}
              <section className="space-y-4 border border-cos-border bg-cos-card p-5">
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
                          ? "Use saved school colors"
                          : "No school colors saved",
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
              <section className="space-y-4 border border-cos-border bg-cos-card p-5">
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

              {/* 5. Notes to AI */}
              <section className="space-y-4 border border-cos-border bg-cos-card p-5">
                <SectionHeader
                  number={5}
                  title="Notes to AI"
                  description="Optional. Extra guidance for this campaign — left blank means unused."
                />
                <Textarea
                  label="Notes to AI"
                  value={inspiration.globalAiGuidance}
                  onChange={(e) =>
                    updateInspiration({ globalAiGuidance: e.target.value })
                  }
                  rows={5}
                  placeholder="Anything else AI should know for this campaign…"
                />
              </section>
            </div>

            {/* Summary sidebar */}
            <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
              <div className="border border-cos-border bg-cos-card p-5">
                <h2 className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                  Your Selections
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-cos-muted">Inspiration</dt>
                    <dd className="text-right font-medium text-cos-text">
                      {summary.inspiration}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-cos-muted">Logo</dt>
                    <dd className="text-right font-medium text-cos-text">
                      {summary.logo}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-cos-muted">Colors</dt>
                    <dd className="text-right font-medium text-cos-text">
                      {summary.colors}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-cos-muted">Voice & Tone</dt>
                    <dd className="text-right font-medium text-cos-text">
                      {summary.voiceTone}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-cos-muted">Notes to AI</dt>
                    <dd className="text-right font-medium text-cos-text">
                      {summary.notesToAI}
                    </dd>
                  </div>
                </dl>

                {!showClearConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="mt-5 w-full border border-cos-border px-3 py-2 text-xs font-medium text-cos-muted transition-colors hover:border-cos-accent hover:text-cos-text"
                  >
                    Clear All Selections
                  </button>
                ) : (
                  <div className="mt-5 space-y-2 border border-cos-border bg-cos-bg/40 p-3">
                    <p className="text-xs text-cos-muted">
                      Reset inspiration, logo, colors, tone, and notes to None?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="flex-1 bg-cos-text px-2 py-1.5 text-xs font-medium text-[#f6f2eb]"
                      >
                        Clear all
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(false)}
                        className="flex-1 border border-cos-border px-2 py-1.5 text-xs font-medium text-cos-text"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>

          {continueError && (
            <p
              className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {continueError}
            </p>
          )}
        </div>
      </div>

      <CampaignBuilderFooter
        showBack={false}
        onContinue={() => {
          void handleSaveAndContinue();
        }}
        continueLabel="Save & Continue to Milestones"
        continueLoading={isContinuing || isSaving}
      />
    </div>
  );
}
