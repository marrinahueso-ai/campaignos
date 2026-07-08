export default function FilesLoading() {
  return (
    <div className="animate-pulse space-y-6 pb-12">
      <div className="space-y-3">
        <div className="h-8 w-56 rounded-lg bg-cos-bg" />
        <div className="h-4 max-w-xl rounded bg-cos-bg" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-40 rounded-lg bg-cos-bg" />
        <div className="h-10 w-32 rounded-lg bg-cos-bg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-16 rounded-xl border border-cos-border bg-cos-card"
          />
        ))}
      </div>
    </div>
  );
}
