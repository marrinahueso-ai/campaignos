"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { updateCampaignFileAction } from "@/lib/campaign-files/actions";
import {
  CAMPAIGN_FILE_CATEGORIES,
  CAMPAIGN_FILE_PLATFORMS,
} from "@/lib/campaign-files/constants";
import type {
  CampaignFile,
  CampaignFileCategory,
  CampaignFilePlatform,
} from "@/types/campaign-files";
import { cn } from "@/lib/utils/cn";

interface FileEditDialogProps {
  file: CampaignFile;
  onClose: () => void;
}

export function FileEditDialog({ file, onClose }: FileEditDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(file.name);
  const [category, setCategory] = useState<CampaignFileCategory>(file.category);
  const [platforms, setPlatforms] = useState<CampaignFilePlatform[]>(file.platforms);
  const [error, setError] = useState<string | null>(null);

  function togglePlatform(platform: CampaignFilePlatform) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((value) => value !== platform)
        : [...current, platform],
    );
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateCampaignFileAction(file.id, file.eventId, {
        name,
        category,
        platforms,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-edit-title"
    >
      <div className="w-full max-w-lg border border-cos-border bg-cos-card shadow-lg">
        <div className="flex items-center justify-between border-b border-cos-border px-5 py-4">
          <h2 id="file-edit-title" className="font-display text-xl text-cos-text">
            Edit file details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-cos-muted hover:text-cos-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium tracking-wide text-cos-muted uppercase">
              File name
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium tracking-wide text-cos-muted uppercase">
              Category
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as CampaignFileCategory)}
              className="w-full border border-cos-border bg-cos-bg px-3 py-2 text-sm text-cos-text"
            >
              {CAMPAIGN_FILE_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium tracking-wide text-cos-muted uppercase">
              Platforms
            </legend>
            <div className="flex flex-wrap gap-2">
              {CAMPAIGN_FILE_PLATFORMS.map((option) => {
                const active = platforms.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => togglePlatform(option.value)}
                    className={cn(
                      "border px-2.5 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
                        : "border-cos-border bg-cos-bg text-cos-muted hover:text-cos-text",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-cos-border px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
