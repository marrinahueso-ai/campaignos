"use client";

import type { GeneratedPostAsset } from "@/lib/campaign-files/generated-post-assets";
import { cn } from "@/lib/utils/cn";

function statusLabel(status: GeneratedPostAsset["status"]): string | null {
  if (status === "posted") return "Posted";
  if (status === "scheduled") return "Scheduled";
  return null;
}

function statusClassName(status: GeneratedPostAsset["status"]): string {
  if (status === "posted") {
    return "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]";
  }
  return "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]";
}

function openAsset(asset: GeneratedPostAsset) {
  if (!asset.imageUrl) return;
  window.open(asset.imageUrl, "_blank", "noopener,noreferrer");
}

export function GeneratedPostAssetsSection({
  assets,
}: {
  assets: GeneratedPostAsset[];
}) {
  if (assets.length === 0) {
    return null;
  }

  return (
    <div className="mt-7 rounded-[22px] border border-cos-border bg-[rgba(255,252,247,0.65)] p-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h3 className="font-display text-lg font-semibold text-cos-text">
          Generated for posts
        </h3>
        <p className="text-xs font-semibold text-cos-muted">
          Read-only · from campaign artwork
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
        {assets.map((asset) => {
          const label = statusLabel(asset.status);
          return (
            <article
              key={asset.id}
              className="overflow-hidden rounded-[14px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
            >
              <button
                type="button"
                onClick={() => openAsset(asset)}
                disabled={!asset.imageUrl}
                className={cn(
                  "block w-full text-left",
                  asset.imageUrl ? "cursor-pointer" : "cursor-default",
                )}
              >
                <div
                  className="aspect-square bg-[linear-gradient(160deg,#1e4a3a_0%,#4a6b58_50%,#c4922e_100%)] bg-cover bg-center"
                  style={
                    asset.imageUrl
                      ? { backgroundImage: `url(${asset.imageUrl})` }
                      : undefined
                  }
                />
                <div className="p-2.5">
                  <strong className="mb-1.5 block text-xs leading-snug font-bold text-cos-text">
                    {asset.label}
                  </strong>
                  {label ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-[0.05em] uppercase",
                        statusClassName(asset.status),
                      )}
                    >
                      {label}
                    </span>
                  ) : null}
                </div>
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
