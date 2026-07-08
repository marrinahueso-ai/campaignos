export default function PublishingLoading() {
  return (
    <div className="animate-pulse space-y-8 pb-12">
      <div className="space-y-3">
        <div className="h-8 w-40 rounded-lg bg-cos-bg" />
        <div className="h-4 max-w-lg rounded bg-cos-bg" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[12rem] rounded-2xl border border-cos-border bg-cos-card"
          />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-cos-border bg-cos-card" />
    </div>
  );
}
