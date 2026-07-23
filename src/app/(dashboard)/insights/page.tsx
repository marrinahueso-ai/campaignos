import { InsightsHub } from "@/components/insights/InsightsHub";
import { getInsightsPageData } from "@/lib/insights/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Insights & Analytics",
};

interface InsightsPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    range?: string;
  }>;
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const params = await searchParams;
  const data = await getInsightsPageData({
    from: params.from,
    to: params.to,
    range: params.range,
  });

  if (!data) {
    return (
      <div className="studio-page pb-12">
        <div className="cos-card px-6 py-12 text-center">
          <h1 className="font-display text-3xl text-cos-text">Insights &amp; Analytics</h1>
          <p className="mt-3 text-sm text-cos-muted">
            Set up your organization to start tracking social performance.
          </p>
        </div>
      </div>
    );
  }

  return <InsightsHub data={data} />;
}
