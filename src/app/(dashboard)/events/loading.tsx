export default function EventsLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex flex-col gap-4 border-b border-cos-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-cos-bg" />
          <div className="h-8 w-40 rounded-lg bg-cos-bg" />
          <div className="h-4 max-w-2xl rounded bg-cos-bg" />
          <div className="h-4 max-w-xl rounded bg-cos-bg" />
        </div>
        <div className="h-10 w-40 rounded-lg bg-cos-bg" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <div className="h-10 w-64 rounded-lg bg-cos-bg" />
          <div className="h-10 w-32 rounded-lg bg-cos-bg" />
          <div className="h-10 w-32 rounded-lg bg-cos-bg" />
        </div>
        <div className="h-10 w-40 rounded-lg bg-cos-bg" />
      </div>

      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, monthIndex) => (
          <div key={monthIndex} className="space-y-3">
            <div className="h-6 w-36 rounded bg-cos-bg" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, eventIndex) => (
                <div
                  key={eventIndex}
                  className="h-24 rounded-2xl border border-cos-border bg-cos-card"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
