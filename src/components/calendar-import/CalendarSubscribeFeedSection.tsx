import { CalendarSubscribeFeedPanel } from "@/components/calendar-import/CalendarSubscribeFeedPanel";
import { getSchoolYearSettingsData } from "@/lib/school-years/actions";
import { cn } from "@/lib/utils/cn";

interface CalendarSubscribeFeedSectionProps {
  variant?: "card" | "plain" | "ease";
}

export async function CalendarSubscribeFeedSection({
  variant = "card",
}: CalendarSubscribeFeedSectionProps) {
  const data = await getSchoolYearSettingsData();
  const ease = variant === "ease";

  if (!data) {
    return (
      <div
        className={cn(
          ease
            ? "rounded-[22px] border border-cos-border bg-cos-card p-[22px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
            : "rounded-2xl border border-cos-border bg-white p-6 shadow-sm",
        )}
      >
        <h2
          className={cn(
            "font-display text-cos-text",
            ease
              ? "text-[22px] font-semibold tracking-[-0.02em]"
              : "text-xl",
          )}
        >
          Calendar subscribe feed
        </h2>
        <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-cos-muted">
          Complete school setup first, then you can link and refresh your ICS
          calendar feed here.
        </p>
      </div>
    );
  }

  return (
    <CalendarSubscribeFeedPanel
      initialData={data}
      variant={variant === "ease" ? "ease" : variant}
    />
  );
}
