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
}

export function UpNextWidget({
  whatsNext,
  artwork,
  organizationName = null,
}: UpNextWidgetProps) {
  const display = parseWhatsNextDisplay(whatsNext);
  const eventTitle = display.event ?? whatsNext.title;
  const showArtwork = hasDisplayableArtwork(artwork);
  const imageUrl = showArtwork ? artwork!.imageUrl : null;
  const ctaLabel = whatsNext.ctaLabel ?? "Open campaign";
  const metaLine = [display.due, organizationName].filter(Boolean).join(" · ");

  return (
    <DashboardWidgetCard icon={CalendarDays} title="Up Next">
      <div className="flex h-full flex-col gap-4">
        <div className="relative mx-auto aspect-square w-full max-w-[11rem] overflow-hidden rounded-xl bg-cos-card ring-1 ring-black/[0.04]">
          {imageUrl ? (
            isOptimizableImageUrl(imageUrl) ? (
              <Image
                src={imageUrl}
                alt=""
                fill
                priority
                sizes="11rem"
                className="object-cover object-center"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover object-center"
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-cos-brand-navy via-[#243352] to-cos-brand-sage px-4 text-center">
              <p className="font-display text-lg leading-snug text-white">
                {eventTitle}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1 text-center sm:text-left">
          <p className="font-display text-xl leading-snug text-cos-text">
            {eventTitle}
          </p>
          {metaLine ? (
            <p className="text-xs text-cos-muted">{metaLine}</p>
          ) : display.action ? (
            <p className="text-xs text-cos-muted">{display.action}</p>
          ) : null}
        </div>

        {whatsNext.href ? (
          <Link
            href={whatsNext.href}
            className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cos-dark px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {ctaLabel}
          </Link>
        ) : null}
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
