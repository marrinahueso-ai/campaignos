export default function TasksLoading() {
  return (
    <div className="animate-pulse pb-12">
      <div className="mb-8 space-y-3">
        <div className="h-3 w-20 rounded bg-cos-bg" />
        <div className="h-8 w-48 rounded-lg bg-cos-bg" />
        <div className="h-4 max-w-2xl rounded bg-cos-bg" />
        <div className="h-4 w-56 rounded bg-cos-bg" />
      </div>
      <div className="min-h-[16rem] rounded-2xl border border-cos-border bg-cos-card" />
    </div>
  );
}
