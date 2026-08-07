import Link from "next/link";
import { AppImage } from "@/components/images/AppImage";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { TodayWhatsNext } from "@/types/today";
import { cn } from "@/lib/utils/cn";

interface WhatsNextSectionProps {
  whatsNext: TodayWhatsNext;
  artwork: HeroArtworkSelection | null;
}

export function WhatsNextSection({ whatsNext, artwork }: WhatsNextSectionProps) {
  const display = parseWhatsNextDisplay(whatsNext);
  const eventTitle = display.event ?? whatsNext.title;
  const showArtwork = hasDisplayableArtwork(artwork);
  const imageUrl = showArtwork ? artwork!.imageUrl : null;
  const ctaLabel = whatsNext.ctaLabel ?? "Open event";
  const metaParts = [display.action, display.due].filter(Boolean) as string[];

  return (
    <section>
      <div className="relative overflow-hidden rounded-2xl bg-cos-brand-navy shadow-sm">
        {!imageUrl ? (
          <div
            className="absolute inset-0 bg-gradient-to-br from-cos-brand-navy via-[#243352] to-cos-brand-sage"
            aria-hidden
          />
        ) : null}

        <div
          className={cn(
            "relative",
            imageUrl &&
              "grid grid-cols-1 sm:grid-cols-[10.5rem_1fr] md:grid-cols-[12rem_1fr]",
          )}
        >
          {imageUrl ? (
            <div className="relative aspect-square overflow-hidden sm:aspect-auto sm:min-h-full">
              <AppImage
                src={imageUrl}
                alt=""
                fill
                preset="hero"
                displayWidth={800}
                displayHeight={800}
                resize="cover"
                priority
                sizes="(max-width: 640px) 100vw, 12rem"
                className="object-cover object-center"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10 sm:bg-gradient-to-r sm:from-transparent sm:to-black/40"
                aria-hidden
              />
            </div>
          ) : null}

          <div
            className={cn(
              "relative flex flex-col justify-between gap-4 p-5 sm:p-6",
              imageUrl ? "min-h-0 sm:min-h-[10.5rem] md:min-h-[12rem]" : "min-h-[11rem]",
            )}
          >
            <span className="inline-flex w-fit rounded-md bg-cos-brand-sage-soft px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-cos-brand-sage uppercase">
              Up next
            </span>

            <div className="max-w-md space-y-2">
              <h2 className="font-display text-2xl leading-tight text-white sm:text-[1.75rem]">
                {eventTitle}
              </h2>
              {metaParts.length > 0 && (
                <p className="text-sm text-white/85">{metaParts.join(" · ")}</p>
              )}
              {whatsNext.href && (
                <div className="pt-0.5">
                  <Link
                    href={whatsNext.href}
                    className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-cos-brand-navy transition-opacity hover:opacity-90"
                  >
                    {ctaLabel}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
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
    return target.toLocaleDateString("en-US", { weekday: "long" });
  }
  return null;
}
