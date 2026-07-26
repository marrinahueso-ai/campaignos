"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface CampaignBuilderFooterProps {
  onBack?: () => void;
  onContinue?: () => void;
  backLabel?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  className?: string;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  showBack?: boolean;
  showContinue?: boolean;
}

export function CampaignBuilderFooter({
  onBack,
  onContinue,
  backLabel = "Back",
  continueLabel = "Save & continue",
  continueDisabled = false,
  continueLoading = false,
  className,
  leftActions,
  rightActions,
  showBack = true,
  showContinue = true,
}: CampaignBuilderFooterProps) {
  return (
    <footer
      className={cn(
        "mt-6 flex flex-col-reverse gap-3 rounded-[22px] border border-cos-border/70 bg-cos-card px-4 py-4 shadow-[0_8px_28px_rgba(28,36,48,0.06)] sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {showBack && onBack && (
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            {backLabel}
          </Button>
        )}
        {leftActions}
      </div>
      <div className="flex items-center gap-3">
        {rightActions}
        {showContinue && onContinue && (
          <Button onClick={onContinue} disabled={continueDisabled || continueLoading}>
            {continueLabel}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        )}
      </div>
    </footer>
  );
}
