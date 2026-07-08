export default function InsightsLoading() {
  return (
    <div className="animate-pulse space-y-8 pb-12">
      <div className="space-y-3">
        <div className="h-8 w-36 rounded-lg bg-cos-bg" />
        <div className="h-4 max-w-xl rounded bg-cos-bg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[10rem] rounded-2xl border border-cos-border bg-cos-card"
          />
        ))}
      </div>
    </div>
  );
}
