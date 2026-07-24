import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EventArtworkPreview } from "@/components/events/EventArtworkPreview";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { TodayWhatsNext } from "@/types/today";

interface WhatsNextSectionProps {
  whatsNext: TodayWhatsNext;
  artwork: HeroArtworkSelection | null;
}

export function WhatsNextSection({ whatsNext, artwork }: WhatsNextSectionProps) {
  const display = parseWhatsNextDisplay(whatsNext);
  const eventTitle = display.event ?? whatsNext.title;
  const showArtwork = hasDisplayableArtwork(artwork);

  return (
    <section>
      <div className="cos-card">
        <p className="cos-section-title">Up next</p>

        <div
          className={
            showArtwork
              ? "mt-4 grid gap-4 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] lg:items-center"
              : "mt-4"
          }
        >
          <div className="space-y-2">
            {display.event && (
              <p className="text-2xl font-semibold tracking-tight text-cos-text sm:text-3xl">
                {display.event}
              </p>
            )}
            <p
              className={
                display.event
                  ? "text-lg leading-relaxed text-cos-text/85"
                  : "text-2xl font-semibold tracking-tight text-cos-text sm:text-3xl"
              }
            >
              {display.action}
            </p>
            {display.due && (
              <p className="text-sm text-cos-muted">{display.due}</p>
            )}

            {whatsNext.href && whatsNext.ctaLabel && (
              <div className="pt-2">
                <Link
                  href={whatsNext.href}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cos-text px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:opacity-90 hover:shadow-sm"
                >
                  {whatsNext.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          {showArtwork && (
            <EventArtworkPreview
              artwork={artwork}
              eventTitle={eventTitle}
              variant="card"
              priority
              caption={
                artwork.source === "approved_asset" ? "Artwork ready" : null
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

function parseWhatsNextDisplay(whatsNext: TodayWhatsNext) {
  if (whatsNext.kind === "caught_up") {
    return {
      event: null,
      action: whatsNext.title,
      due: whatsNext.subtitle,
    };
  }

  const forMatch = whatsNext.title.match(/^(.+?) for (.+)$/);
  if (forMatch) {
    return {
      action: forMatch[1]!.trim(),
      event: forMatch[2]!.trim(),
      due: formatDueLabel(whatsNext.subtitle),
    };
  }

  if (whatsNext.kind === "event") {
    const openMatch = whatsNext.title.match(/^Open (.+) workspace$/);
    return {
      event: openMatch?.[1] ?? null,
      action: openMatch ? "Open this event when you're ready" : whatsNext.title,
      due: whatsNext.subtitle ? formatEventDue(whatsNext.subtitle) : null,
    };
  }

  return {
    event:
      whatsNext.subtitle && whatsNext.subtitle !== "Due today"
        ? whatsNext.subtitle
        : null,
    action: whatsNext.title,
    due: formatDueLabel(whatsNext.subtitle),
  };
}

function formatDueLabel(subtitle: string | null): string | null {
  if (!subtitle) return null;
  if (subtitle === "Due today") return "Due today";
  if (subtitle === "Tomorrow") return "Due tomorrow";
  return subtitle.startsWith("Due ") ? subtitle : `Due ${subtitle.toLowerCase()}`;
}

function formatEventDue(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T12:00:00`);
  const diff = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff > 1) return `Due in ${diff} days`;
  return null;
}
