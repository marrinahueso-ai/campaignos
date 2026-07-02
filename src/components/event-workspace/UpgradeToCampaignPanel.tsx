"use client";

import { useState, useTransition } from "react";
import { Megaphone, Sparkles } from "lucide-react";
import { upgradeEventToCampaignAction } from "@/lib/calendar-import/actions";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useRouter } from "next/navigation";

interface UpgradeToCampaignPanelProps {
  eventId: string;
}

export function UpgradeToCampaignPanel({ eventId }: UpgradeToCampaignPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpgrade(strategy: "full_campaign" | "reminder_only") {
    setError(null);

    startTransition(async () => {
      const result = await upgradeEventToCampaignAction(eventId, strategy);

      if (!result.success) {
        setError(result.error ?? "Unable to start a campaign.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <Card className="border-cos-border bg-gradient-to-br from-cos-accent-soft/60 to-white">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cos-accent-soft">
            <Megaphone className="h-5 w-5 text-cos-accent" />
          </div>
          <div>
            <CardTitle className="text-lg">Turn this into a campaign later</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              This date is view-only on your calendar right now. If you decide you
              want reminders, artwork, or social posts later, start a campaign here.
            </CardDescription>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => handleUpgrade("full_campaign")}
            disabled={isPending}
          >
            <Sparkles className="h-4 w-4" />
            Start full campaign
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleUpgrade("reminder_only")}
            disabled={isPending}
          >
            Reminders only
          </Button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </CardHeader>
    </Card>
  );
}
