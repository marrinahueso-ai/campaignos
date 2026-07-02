"use client";

import type { ReactNode } from "react";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { BRAND_KIT_SECTIONS } from "@/lib/creative-assets/constants";
import type { BrandKitItem } from "@/lib/creative-assets/types";
import type { BrandAssets } from "@/types";


interface BrandKitSectionProps {
  brandAssets: BrandAssets | null;
  brandKitItems: BrandKitItem[];
  organizationVoice: string | null;
  canManage: boolean;
}

export function BrandKitSection({
  brandAssets,
  brandKitItems,
  organizationVoice,
  canManage,
}: BrandKitSectionProps) {
  const itemsByCategory = new Map<string, BrandKitItem[]>();
  for (const item of brandKitItems) {
    const list = itemsByCategory.get(item.category) ?? [];
    list.push(item);
    itemsByCategory.set(item.category, list);
  }

  return (
    <section id="brand-kit" className="scroll-mt-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-cos-text">Brand Kit</h2>
        <p className="mt-1 text-sm text-cos-muted">
          Organization-wide assets used across every campaign.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {BRAND_KIT_SECTIONS.map((section) => (
          <article
            key={section.category}
            className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-cos-text">{section.label}</h3>
            <p className="mt-1 text-xs text-cos-muted">{section.description}</p>

            <div className="mt-4 space-y-3">
              {renderBrandSectionContent(
                section.category,
                brandAssets,
                itemsByCategory.get(section.category) ?? [],
                organizationVoice,
              )}

              {canManage && (
                <p className="text-xs text-cos-muted">
                  Upload and replace controls connect in a future admin pass.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function renderBrandSectionContent(
  category: string,
  brandAssets: BrandAssets | null,
  items: BrandKitItem[],
  organizationVoice: string | null,
): ReactNode {
  if (category === "school_logo" && brandAssets?.schoolLogo) {
    return (
      <BrandPreviewRow label="School logo" url={brandAssets.schoolLogo} />
    );
  }

  if (category === "pto_logo" && brandAssets?.ptoLogo) {
    return <BrandPreviewRow label="PTO logo" url={brandAssets.ptoLogo} />;
  }

  if (category === "color" && brandAssets) {
    return (
      <div className="flex flex-wrap gap-3">
        {brandAssets.primaryColor && (
          <ColorSwatch label="Primary" value={brandAssets.primaryColor} />
        )}
        {brandAssets.secondaryColor && (
          <ColorSwatch label="Secondary" value={brandAssets.secondaryColor} />
        )}
      </div>
    );
  }

  if (category === "font" && brandAssets?.fontFamily) {
    return <p className="text-sm text-cos-text">{brandAssets.fontFamily}</p>;
  }

  if (category === "brand_voice" && organizationVoice) {
    return (
      <p className="text-sm leading-relaxed text-cos-muted">{organizationVoice}</p>
    );
  }

  if (items.length > 0) {
    return (
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="text-sm text-cos-text">
            {item.label}
            {item.filename ? ` — ${item.filename}` : ""}
            {item.valueText ? `: ${item.valueText}` : ""}
          </li>
        ))}
      </ul>
    );
  }

  return <p className="text-sm text-cos-muted">No items yet.</p>;
}

function BrandPreviewRow({ label, url }: { label: string; url: string }) {
  const resolved = resolveAssetImageUrl(url);
  return (
    <div className="flex items-center gap-3">
      {resolved && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolved} alt={label} className="h-12 w-12 rounded-lg object-contain" />
      )}
      <span className="text-sm text-cos-text">{label}</span>
    </div>
  );
}

function ColorSwatch({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-8 w-8 rounded-lg border border-cos-border"
        style={{ backgroundColor: value }}
      />
      <div className="text-xs">
        <p className="font-medium text-cos-text">{label}</p>
        <p className="text-cos-muted">{value}</p>
      </div>
    </div>
  );
}
