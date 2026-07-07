"use client";

import type { ArtworkTextPlan } from "@/lib/ai-artwork/types";

interface ArtworkTextPlanPanelProps {
  textPlan: ArtworkTextPlan;
  compact?: boolean;
}

function TextRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-cos-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-cos-text">{value}</dd>
    </div>
  );
}

export function ArtworkTextPlanPanel({ textPlan, compact = false }: ArtworkTextPlanPanelProps) {
  return (
    <aside
      className={`rounded-2xl border border-cos-border bg-cos-bg/40 ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-cos-text">Artwork Text Plan</h4>
        <p className="text-xs text-cos-muted">
          Verified event copy — add these as editable overlays in Hey Ralli or Canva. Not
          rendered into the generated image.
        </p>
      </div>
      <dl className="mt-4 space-y-3">
        <TextRow label="Headline" value={textPlan.headline} />
        <TextRow label="Subheadline" value={textPlan.subheadline} />
        <TextRow label="Date / time" value={textPlan.dateTime} />
        <TextRow label="Location" value={textPlan.location} />
        <TextRow label="CTA" value={textPlan.cta} />
        <TextRow label="Footer / branding" value={textPlan.footerBranding} />
      </dl>
    </aside>
  );
}
