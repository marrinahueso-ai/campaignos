export default function EventsLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="h-10 w-48 rounded-lg bg-cos-bg" />
          <div className="h-4 max-w-xl rounded bg-cos-bg" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-cos-bg" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <div className="h-10 w-64 rounded-lg bg-cos-bg" />
          <div className="h-10 w-32 rounded-lg bg-cos-bg" />
          <div className="h-10 w-32 rounded-lg bg-cos-bg" />
        </div>
        <div className="h-10 w-40 rounded-lg bg-cos-bg" />
      </div>

      <div className="overflow-hidden rounded-xl border border-cos-border bg-white">
        {Array.from({ length: 2 }).map((_, monthIndex) => (
          <div
            key={monthIndex}
            className="flex items-center gap-3 border-b border-cos-border px-5 py-4 last:border-b-0"
          >
            <div className="h-4 w-4 rounded bg-cos-bg" />
            <div className="h-4 w-4 rounded bg-cos-bg" />
            <div className="h-6 w-32 rounded bg-cos-bg" />
            <div className="ml-auto h-7 w-7 rounded-full bg-cos-bg" />
          </div>
        ))}
      </div>
    </div>
  );
}
