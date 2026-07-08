import { Suspense } from "react";
import { getEventArtwork } from "@/lib/event-workspace/get-event-artwork";
import { WhatsNextSection } from "@/components/today/WhatsNextSection";
import type { TodayWhatsNext } from "@/types/today";

async function WhatsNextWithArtwork({ whatsNext }: { whatsNext: TodayWhatsNext }) {
  const artwork = whatsNext.eventId
    ? await getEventArtwork(whatsNext.eventId)
    : null;

  return <WhatsNextSection whatsNext={whatsNext} artwork={artwork} />;
}

export function WhatsNextSectionSuspense({ whatsNext }: { whatsNext: TodayWhatsNext }) {
  return (
    <Suspense
      fallback={<WhatsNextSection whatsNext={whatsNext} artwork={null} />}
    >
      <WhatsNextWithArtwork whatsNext={whatsNext} />
    </Suspense>
  );
}
