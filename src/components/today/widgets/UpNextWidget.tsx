import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { TodayWhatsNext } from "@/types/today";

interface UpNextWidgetProps {
  whatsNext: TodayWhatsNext;
  artwork: HeroArtworkSelection | null;
  organizationName?: string | null;
  /** True while artwork is still streaming in — avoid the navy empty-state flash. */
  artworkLoading?: boolean;
}

export function UpNextWidget({
  whatsNext,
  artwork,
  organizationName = null,
  artworkLoading = false,
}: UpNextWidgetProps) {
  const display = parseWhatsNextDisplay(whatsNext);
  const eventTitle = display.event ?? whatsNext.title;
  const showArtwork = hasDisplayableArtwork(artwork);
  const imageUrl = showArtwork ? artwork!.imageUrl : null;
  const ctaLabel = whatsNext.ctaLabel ?? "Open event";
  const metaLine = [
    display.due,
    display.action,
    organizationName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <DashboardWidgetCard
      icon={CalendarDays}
      title="Up Next"
      className="overflow-hidden"
    >
      <div className="flex h-full flex-col gap-5 sm:flex-row sm:items-stretch sm:gap-6">
        <div className="relative mx-auto aspect-square w-full max-w-[18rem] shrink-0 overflow-hidden rounded-2xl bg-cos-bg-alt shadow-[0_12px_28px_rgba(42,38,34,0.14)] ring-1 ring-black/[0.06] sm:mx-0 sm:max-w-none sm:basis-[min(100%,17.5rem)]">
          {imageUrl ? (
            isOptimizableImageUrl(imageUrl) ? (
              <Image
                src={imageUrl}
                alt=""
                fill
                priority
                sizes="(max-width: 640px) 18rem, 17.5rem"
                className="bg-cos-bg-alt object-cover object-center"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full bg-cos-bg-alt object-cover object-center"
              />
            )
          ) : artworkLoading ? (
            <div
              className="h-full w-full animate-pulse bg-cos-bg-alt"
              aria-hidden
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-cos-brand-navy via-[#243352] to-cos-brand-sage px-6 text-center">
              <p className="font-display text-2xl leading-snug text-white sm:text-3xl">
                {eventTitle}
              </p>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 text-center sm:text-left">
          <div className="space-y-2">
            <p className="font-display text-2xl leading-tight text-cos-text sm:text-3xl">
              {eventTitle}
            </p>
            {metaLine ? (
              <p className="text-sm leading-relaxed text-cos-muted">{metaLine}</p>
            ) : null}
          </div>

          {whatsNext.href ? (
            <Link
              href={whatsNext.href}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cos-dark px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:mt-auto sm:w-auto sm:self-start sm:px-6"
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              {ctaLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </DashboardWidgetCard>
  );
}

function isOptimizableImageUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

function parseWhatsNextDisplay(whatsNext: TodayWhatsNext) {
  if (whatsNext.kind === "caught_up") {
    return {
      event: whatsNext.title,
      action: whatsNext.subtitle,
      due: null as string | null,
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
      event: openMatch?.[1] ?? whatsNext.title,
      action: null as string | null,
      due: whatsNext.subtitle ? formatEventDue(whatsNext.subtitle) : null,
    };
  }

  return {
    event:
      whatsNext.subtitle && whatsNext.subtitle !== "Due today"
        ? whatsNext.subtitle
        : whatsNext.title,
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
  if (diff > 1) {
    return target.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return null;
}
