export default function ApprovalsLoading() {
  return (
    <div className="animate-pulse space-y-8 pb-12">
      <div className="space-y-3">
        <div className="h-10 w-72 rounded bg-cos-bg" />
        <div className="h-4 max-w-2xl rounded bg-cos-bg" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-40 rounded bg-cos-bg" />
        <div className="h-10 w-28 rounded bg-cos-bg" />
        <div className="h-10 w-64 rounded bg-cos-bg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-24 border border-cos-border bg-cos-card" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-9 w-28 rounded-full bg-cos-bg" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-20 border border-cos-border bg-cos-card"
          />
        ))}
      </div>
    </div>
  );
}
