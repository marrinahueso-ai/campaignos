export default function InsightsLoading() {
  return (
    <div className="animate-pulse space-y-8 pb-12">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-cos-bg" />
        <div className="h-10 w-80 max-w-full rounded bg-cos-bg" />
        <div className="h-4 max-w-xl rounded bg-cos-bg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[7rem] border border-cos-border bg-cos-card"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-h-[20rem] border border-cos-border bg-cos-card" />
        <div className="min-h-[20rem] border border-cos-border bg-cos-card" />
      </div>
    </div>
  );
}
