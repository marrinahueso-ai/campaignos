import { Suspense } from "react";
import { getEventArtwork } from "@/lib/event-workspace/get-event-artwork";
import { UpNextWidget } from "@/components/today/widgets/UpNextWidget";
import type { TodayWhatsNext } from "@/types/today";

async function UpNextWithArtwork({
  whatsNext,
  organizationName,
}: {
  whatsNext: TodayWhatsNext;
  organizationName: string | null;
}) {
  const artwork = whatsNext.eventId
    ? await getEventArtwork(whatsNext.eventId)
    : null;

  return (
    <UpNextWidget
      whatsNext={whatsNext}
      artwork={artwork}
      organizationName={organizationName}
    />
  );
}

export function UpNextWidgetSuspense({
  whatsNext,
  organizationName = null,
}: {
  whatsNext: TodayWhatsNext;
  organizationName?: string | null;
}) {
  return (
    <Suspense
      fallback={
        <UpNextWidget
          whatsNext={whatsNext}
          artwork={null}
          organizationName={organizationName}
        />
      }
    >
      <UpNextWithArtwork
        whatsNext={whatsNext}
        organizationName={organizationName}
      />
    </Suspense>
  );
}
