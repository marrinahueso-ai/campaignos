export default function EventWorkspaceLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="rounded-2xl border border-cos-border bg-cos-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="h-8 w-64 max-w-full rounded-lg bg-cos-bg" />
            <div className="h-4 w-48 rounded bg-cos-bg" />
            <div className="h-4 w-72 max-w-full rounded bg-cos-bg" />
          </div>
          <div className="h-32 w-full max-w-[12rem] rounded-xl bg-cos-bg sm:shrink-0" />
        </div>
      </div>

      <div className="h-28 rounded-2xl border border-cos-border bg-cos-card" />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-9 w-28 rounded-full bg-cos-bg" />
          ))}
        </div>
        <div className="min-h-[16rem] rounded-2xl border border-cos-border bg-cos-card" />
      </div>
    </div>
  );
}
