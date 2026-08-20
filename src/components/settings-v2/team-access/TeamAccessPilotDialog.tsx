"use client";

import type { ReactNode } from "react";
import { TeamAccessBodyPortal } from "@/components/settings-v2/team-access/TeamAccessBodyPortal";
import { cn } from "@/lib/utils/cn";

interface TeamAccessPilotDialogProps {
  onClose: () => void;
  labelledBy?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Viewport-centered Team & Access pop-out (Add member, Role, person profile).
 * Sizes to content up to 90vh; body scroll stays inside the card.
 */
export function TeamAccessPilotDialog({
  onClose,
  labelledBy,
  children,
  className,
}: TeamAccessPilotDialogProps) {
  return (
    <TeamAccessBodyPortal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-[rgba(32,27,23,0.4)] backdrop-blur-[4px]"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className={cn(
            "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[3rem] border border-[#e5e1d8] bg-white shadow-2xl",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </TeamAccessBodyPortal>
  );
}
