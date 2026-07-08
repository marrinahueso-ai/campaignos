export default function CampaignBuilderLoading() {
  return (
    <div className="-mx-4 -my-8 flex min-h-[calc(100vh-var(--cos-dashboard-header-height))] animate-pulse flex-col lg:-mx-8 lg:-my-10">
      <div className="flex items-center justify-between border-b border-cos-border bg-cos-card px-4 py-4 lg:px-8">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-cos-bg" />
          <div className="h-4 w-32 rounded bg-cos-bg" />
        </div>
        <div className="h-12 w-12 rounded-full bg-cos-bg" />
      </div>
      <div className="flex gap-2 border-b border-cos-border px-4 py-3 lg:px-8">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-8 w-24 rounded-full bg-cos-bg" />
        ))}
      </div>
      <div className="flex-1 bg-cos-bg p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-6 w-48 rounded bg-cos-bg-alt" />
          <div className="h-40 rounded-2xl border border-cos-border bg-cos-card" />
          <div className="h-32 rounded-2xl border border-cos-border bg-cos-card" />
        </div>
      </div>
    </div>
  );
}
