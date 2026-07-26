import { redirect } from "next/navigation";

export const metadata = {
  title: "Calendar Review",
};

interface CalendarReviewPageProps {
  searchParams: Promise<{ import?: string }>;
}

/** Canonical review UX lives on Calendar → Review tab. */
export default async function CalendarReviewPage({
  searchParams,
}: CalendarReviewPageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams({ tab: "review" });
  if (params.import) {
    qs.set("import", params.import);
  }
  redirect(`/calendar?${qs.toString()}`);
}
