import { CalendarSubscribeFeedPanel } from "@/components/calendar-import/CalendarSubscribeFeedPanel";
import { getSchoolYearSettingsData } from "@/lib/school-years/actions";

interface CalendarSubscribeFeedSectionProps {
  variant?: "card" | "plain";
}

export async function CalendarSubscribeFeedSection({
  variant = "card",
}: CalendarSubscribeFeedSectionProps) {
  const data = await getSchoolYearSettingsData();

  if (!data) {
    return (
      <div className="rounded-2xl border border-cos-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl text-cos-text">
          Calendar subscribe feed
        </h2>
        <p className="mt-2 text-sm text-cos-muted">
          Complete school setup first, then you can link and refresh your ICS
          calendar feed here.
        </p>
      </div>
    );
  }

  return <CalendarSubscribeFeedPanel initialData={data} variant={variant} />;
}
