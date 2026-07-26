"use client";

import type { ReactNode } from "react";

export function SettingsBox({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-cos-border bg-cos-card p-4 shadow-[0_8px_28px_rgba(28,36,48,0.06)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl text-cos-text">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-cos-muted">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
