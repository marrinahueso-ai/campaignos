"use client";

import { useRef } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { useCampaignBuilder } from "@/components/campaign-builder-v2/CampaignBuilderProvider";
import { CampaignBuilderFooter } from "@/components/campaign-builder-v2/CampaignBuilderFooter";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
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
  } = useCampaignBuilder();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { inspiration } = session;
  const visibleImages = inspiration.inspirationImages.slice(0, 5);
  const extraCount = Math.max(0, inspiration.inspirationImages.length - 5);

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
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
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
