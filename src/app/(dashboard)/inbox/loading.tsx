export default function InboxLoading() {
  return (
    <div className="animate-pulse space-y-6 pb-12">
      <div className="h-8 w-32 rounded-lg bg-cos-bg" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="min-h-[24rem] rounded-2xl border border-cos-border bg-cos-card" />
        <div className="min-h-[24rem] rounded-2xl border border-cos-border bg-cos-card" />
      </div>
    </div>
  );
}
