export default function TasksLoading() {
  return (
    <div className="animate-pulse pb-12">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="h-8 w-32 rounded-lg bg-cos-bg" />
          <div className="h-4 max-w-2xl rounded bg-cos-bg" />
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
          <div className="h-20 rounded border border-cos-border bg-cos-card" />
          <div className="h-20 rounded border border-cos-border bg-cos-card" />
          <div className="h-20 rounded border border-cos-border bg-cos-card" />
        </div>
      </div>
      <div className="mb-6 h-10 rounded border border-cos-border bg-cos-card" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-h-[20rem] rounded border border-cos-border bg-cos-card" />
        <div className="hidden min-h-[12rem] rounded border border-cos-border bg-cos-card xl:block" />
      </div>
    </div>
  );
}
