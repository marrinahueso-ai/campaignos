"use client";

import Link from "next/link";
import { useRef } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { CampaignBuilderFooter } from "@/components/campaign-builder-v2/CampaignBuilderFooter";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { isNoBrandKit, NO_BRAND_KIT_GUIDANCE } from "@/lib/campaign-builder-v2/brand-kit";
import { cn } from "@/lib/utils/cn";

export function InspirationStep() {
  const {
    session,
    updateInspiration,
    selectCampaign,
    addInspirationImage,
    removeInspirationImage,
    goToStep,
    playbookOptions,
    brandKitOptions,
    voiceToneOptions,
    campaignOptions,
    logoOptions,
    schoolColors,
    inspirationUploadError,
    clearInspirationUploadError,
  } = useCampaignBuilder();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { inspiration } = session;
  const visibleImages = inspiration.inspirationImages.slice(0, 5);
  const extraCount = Math.max(0, inspiration.inspirationImages.length - 5);
  const hasSchoolColors = Boolean(
    schoolColors.primary || schoolColors.secondary,
  );
  const selectedLogo = logoOptions.find(
    (logo) => logo.id === inspiration.selectedLogoId,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-8">
        <div className="studio-page space-y-8">
          <header>
            <h1 className="font-display text-4xl text-cos-text">
              Build Campaign with AI
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-cos-muted">
              Set your campaign foundation — name, dates, inspiration, and brand
              voice — so AI can generate on-brand milestones and content.
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
              onChange={(e) => updateInspiration({ playbookId: e.target.value })}
            >
              {playbookOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </div>

          <section className="space-y-4">
            <div>
              <h2 className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                Upload inspiration
              </h2>
              <p className="mt-1 text-sm text-cos-muted">
                Share posters, flyers, or mood images to guide AI artwork style.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) {
                    addInspirationImage(file);
                  }
                }}
                className={cn(
                  "flex min-h-[10rem] flex-col items-center justify-center border border-dashed border-cos-border bg-cos-bg/30 px-6 py-8 text-center transition-colors",
                  "hover:border-cos-accent hover:bg-cos-bg/50",
                )}
              >
                <Upload className="h-8 w-8 text-cos-muted" strokeWidth={1.25} />
                <p className="mt-3 text-sm font-medium text-cos-text">
                  Drag & drop
                </p>
                <p className="mt-1 text-xs text-cos-muted">
                  PNG, JPG up to 10 MB
                </p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    addInspirationImage(file);
                  }
                }}
              />

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {visibleImages.length === 0 && (
                  <div className="col-span-full flex min-h-[8rem] items-center justify-center border border-dashed border-cos-border bg-cos-bg/20 px-4 text-center text-xs text-cos-muted">
                    No inspiration images yet — upload posters or flyers to guide
                    AI style
                  </div>
                )}
                {visibleImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-[3/4] overflow-hidden border border-cos-border bg-cos-card"
                    title={image.label}
                  >
                    <button
                      type="button"
                      aria-label={`Remove ${image.label}`}
                      onClick={() => removeInspirationImage(image.id)}
                      className="absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-cos-card/90 text-cos-muted shadow-sm transition-colors hover:bg-cos-card hover:text-cos-text"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    {image.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.previewUrl}
                        alt={image.label}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center border border-dashed border-cos-border px-2 text-center text-[10px] text-cos-muted">
                        {image.label}
                      </div>
                    )}
                  </div>
                ))}
                {extraCount > 0 && (
                  <button
                    type="button"
                    className="flex aspect-[3/4] flex-col items-center justify-center border border-dashed border-cos-border bg-cos-bg/20 text-center transition-colors hover:border-cos-accent"
                  >
                    <ImagePlus
                      className="h-5 w-5 text-cos-muted"
                      strokeWidth={1.5}
                    />
                    <span className="mt-1 text-xs font-medium text-cos-text">
                      +{extraCount}
                    </span>
                    <span className="text-[10px] text-cos-muted">View all</span>
                  </button>
                )}
              </div>
            </div>
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

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <Select
                label="Brand kit"
                value={inspiration.brandKitId}
                onChange={(e) => updateInspiration({ brandKitId: e.target.value })}
              >
                {brandKitOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
              {isNoBrandKit(inspiration.brandKitId) && (
                <p className="text-xs text-cos-muted">{NO_BRAND_KIT_GUIDANCE}</p>
              )}
              <p className="text-xs text-cos-muted">
                Brand kit settings flow into AI artwork prompts when a kit is selected.
              </p>
            </div>
            <Select
              label="Voice / Tone"
              value={inspiration.voiceTone}
              onChange={(e) => updateInspiration({ voiceTone: e.target.value })}
            >
              {voiceToneOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>

          <section className="space-y-4">
            <div>
              <h2 className="text-xs font-medium tracking-[0.12em] text-cos-muted uppercase">
                School brand assets
              </h2>
              <p className="mt-1 text-sm text-cos-muted">
                Choose a stored logo and school colors to guide AI artwork.
              </p>
            </div>

            {logoOptions.length > 0 ? (
              <div className="space-y-3">
                <label className="inline-flex items-center gap-2 text-sm text-cos-text">
                  <input
                    type="checkbox"
                    checked={inspiration.includeLogoInArtwork}
                    onChange={(event) =>
                      updateInspiration({
                        includeLogoInArtwork: event.target.checked,
                        selectedLogoId:
                          event.target.checked && !inspiration.selectedLogoId
                            ? (logoOptions[0]?.id ?? null)
                            : inspiration.selectedLogoId,
                      })
                    }
                    className="h-4 w-4 rounded border-cos-border"
                  />
                  Include logo in artwork
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {logoOptions.map((logo) => {
                    const selected = inspiration.selectedLogoId === logo.id;
                    const disabled = !inspiration.includeLogoInArtwork;
                    return (
                      <button
                        key={logo.id}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          updateInspiration({
                            selectedLogoId: selected ? null : logo.id,
                            includeLogoInArtwork: true,
                          })
                        }
                        className={cn(
                          "flex items-center gap-3 border px-3 py-3 text-left transition-colors",
                          disabled && "cursor-not-allowed opacity-50",
                          selected && inspiration.includeLogoInArtwork
                            ? "border-cos-dark bg-cos-bg-alt"
                            : "border-cos-border bg-cos-card hover:border-cos-accent/50",
                        )}
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
                      </button>
                    );
                  })}
                </div>

                {inspiration.includeLogoInArtwork && selectedLogo && (
                  <p className="text-xs text-cos-muted">
                    AI will reference {selectedLogo.label} when generating artwork.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded border border-dashed border-cos-border bg-cos-bg/20 px-4 py-5">
                <p className="text-sm text-cos-muted">
                  No logos in your brand kit yet. Upload logos in Settings to guide
                  AI artwork.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href="/settings/school-setup"
                    className="text-sm font-medium text-cos-text underline hover:no-underline"
                  >
                    Organization branding
                  </Link>
                  <Link
                    href="/settings/ai-brain"
                    className="text-sm font-medium text-cos-text underline hover:no-underline"
                  >
                    AI Brain brand kit
                  </Link>
                </div>
              </div>
            )}

            {hasSchoolColors ? (
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-cos-text">
                  <input
                    type="checkbox"
                    checked={inspiration.useSchoolColors}
                    onChange={(event) =>
                      updateInspiration({ useSchoolColors: event.target.checked })
                    }
                    className="h-4 w-4 rounded border-cos-border"
                  />
                  Use school colors in AI artwork
                </label>
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
            ) : (
              <div className="rounded border border-dashed border-cos-border bg-cos-bg/20 px-4 py-4">
                <p className="text-sm text-cos-muted">
                  No school colors saved yet.{" "}
                  <Link
                    href="/settings/school-setup"
                    className="font-medium text-cos-text underline hover:no-underline"
                  >
                    Add brand colors in Organization settings
                  </Link>
                  .
                </p>
              </div>
            )}
          </section>

          <Textarea
            label="Global AI guidance"
            value={inspiration.globalAiGuidance}
            onChange={(e) =>
              updateInspiration({ globalAiGuidance: e.target.value })
            }
            rows={5}
            placeholder="Describe the look, feel, and messaging style for this campaign..."
          />
        </div>
      </div>

      <CampaignBuilderFooter
        showBack={false}
        onContinue={() => goToStep("milestones")}
      />
    </div>
  );
}
