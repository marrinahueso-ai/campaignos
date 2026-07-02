"use client";

import { useEffect, useState } from "react";
import { RoleSimulator } from "@/components/dev/RoleSimulator";
import { CommunicationCard } from "@/components/event-workspace/CommunicationCard";
import { CommunicationPreviewDialog } from "@/components/event-workspace/CommunicationPreviewDialog";
import { EventDetailsChangedNotice } from "@/components/event-workspace/EventDetailsChangedNotice";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { AiAssistantStatus } from "@/lib/ai";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { CommunicationItem } from "@/types/event-workspace";

interface CommunicationsHubSectionProps {
  eventId: string;
  communications: CommunicationItem[];
  userRole: CampaignRole;
  showRoleSimulator?: boolean;
  aiStatus: AiAssistantStatus;
  eventDetailsChanged?: boolean;
}

export function CommunicationsHubSection({
  eventId,
  communications,
  userRole,
  showRoleSimulator = false,
  aiStatus,
  eventDetailsChanged = false,
}: CommunicationsHubSectionProps) {
  const [items, setItems] = useState(communications);
  const [previewItem, setPreviewItem] = useState<CommunicationItem | null>(null);

  useEffect(() => {
    setItems(communications);
  }, [communications]);

  function handleDraftUpdated(itemId: string, draftText: string) {
    setItems((current) =>
      current.map((entry) =>
        entry.id === itemId
          ? { ...entry, latestContent: draftText, status: "generated" }
          : entry,
      ),
    );
    setPreviewItem((current) =>
      current?.id === itemId
        ? { ...current, latestContent: draftText, status: "generated" }
        : current,
    );
  }

  return (
    <>
      <Card padding="none" className="overflow-hidden">
        <CardHeader className="border-b border-cos-border px-6 py-5">
          <CardTitle>Drafts & messages</CardTitle>
          <CardDescription>
            Review each channel, draft copy, and mark things ready when they look good.
          </CardDescription>
        </CardHeader>

        {eventDetailsChanged && (
          <div className="border-b border-cos-border px-6 pb-5">
            <EventDetailsChangedNotice />
          </div>
        )}

        {showRoleSimulator && (
          <div className="border-b border-cos-border px-6 pb-5">
            <RoleSimulator
              currentRole={userRole}
              eventPath={`/events/${eventId}`}
            />
          </div>
        )}

        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <CommunicationCard
              key={item.id}
              eventId={eventId}
              item={item}
              userRole={userRole}
              aiAvailable={aiStatus.available}
              aiUnavailableReason={aiStatus.reason}
              onPreview={setPreviewItem}
              onDraftUpdated={handleDraftUpdated}
            />
          ))}
        </div>
      </Card>

      {previewItem && (
        <CommunicationPreviewDialog
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </>
  );
}
