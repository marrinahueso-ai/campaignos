export default function CommunicationsLoading() {
  return (
    <div className="animate-pulse space-y-6 pb-12">
      <div className="space-y-2">
        <div className="h-10 w-72 rounded-lg bg-cos-bg" />
        <div className="h-4 w-96 max-w-full rounded bg-cos-bg" />
      </div>
      <div className="h-10 w-full rounded-full bg-cos-bg" />
      <div className="grid min-h-[24rem] gap-0 overflow-hidden rounded-2xl border border-cos-border lg:grid-cols-[20rem_minmax(0,1fr)_18rem]">
        <div className="hidden border-r border-cos-border bg-cos-card lg:block" />
        <div className="bg-cos-card" />
        <div className="hidden border-l border-cos-border bg-cos-card xl:block" />
      </div>
    </div>
  );
}
