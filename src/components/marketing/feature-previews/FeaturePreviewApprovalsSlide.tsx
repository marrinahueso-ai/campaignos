import { CheckCircle2 } from "lucide-react";
import {
  PREVIEW_EVENT_TITLE,
  PREVIEW_PRESIDENT_NAME,
  PREVIEW_SCHOOL_NAME,
  PREVIEW_USER_FULL_NAME,
  PREVIEW_USER_ROLE,
} from "@/lib/marketing/feature-preview-fixtures";

const PREVIEW_COMMITTEES = [
  "Spring Book Fair",
  "Family Picnic",
  "Spirit Afternoon",
] as const;

export function FeaturePreviewApprovalsSlide() {
  return (
    <div className="space-y-4">
      <header>
        <p className="studio-eyebrow">Configure</p>
        <h2 className="font-display text-3xl text-cos-text">Organization Workspace</h2>
        <p className="mt-1 text-sm text-cos-muted">{PREVIEW_SCHOOL_NAME} PTO</p>
      </header>

      <div className="cos-card bg-cos-bg/30">
        <p className="font-display text-2xl text-cos-text">Upload roster</p>
        <p className="mt-2 text-sm text-cos-muted">
          Import VP roles and committees from your board Excel file.
        </p>
      </div>

      <div className="border border-cos-border bg-cos-card">
        <div className="flex items-start justify-between gap-3 border-b border-cos-border px-4 py-4">
          <div>
            <p className="font-display text-2xl text-cos-text">President</p>
            <p className="mt-1 text-sm text-cos-muted">
              {PREVIEW_PRESIDENT_NAME} · 8 committees
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Filled
          </span>
        </div>
        <div className="space-y-3 p-4">
          {PREVIEW_COMMITTEES.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between gap-3 border border-cos-border px-3 py-2.5"
            >
              <span className="text-sm text-cos-text">{name}</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                Filled
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="cos-card">
        <p className="cos-section-title">Needs your review</p>
        <div className="mt-3 flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-cos-muted" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-cos-text">
              {PREVIEW_EVENT_TITLE} · Feed caption
            </p>
            <p className="mt-1 text-sm text-cos-muted">
              Waiting on {PREVIEW_USER_ROLE} — {PREVIEW_USER_FULL_NAME}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
