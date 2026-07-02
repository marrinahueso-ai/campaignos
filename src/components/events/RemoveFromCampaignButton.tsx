"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarOff } from "lucide-react";
import { removeFromCampaignsAction } from "@/lib/events/actions";
import { Button } from "@/components/ui/Button";

interface RemoveFromCampaignButtonProps {
  eventId: string;
  eventTitle: string;
}

export function RemoveFromCampaignButton({
  eventId,
  eventTitle,
}: RemoveFromCampaignButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRemove() {
    const confirmed = window.confirm(
      `Remove "${eventTitle}" from Campaigns?\n\nIt will stay on your calendar as a view-only date. You can turn it back into a campaign anytime from the event page.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await removeFromCampaignsAction(eventId);

      if (!result.success) {
        setError(result.error ?? "Unable to remove from campaigns.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-cos-muted hover:text-cos-text"
        disabled={pending}
        onClick={handleRemove}
      >
        <CalendarOff className="h-4 w-4" />
        {pending ? "Removing…" : "Calendar only"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
