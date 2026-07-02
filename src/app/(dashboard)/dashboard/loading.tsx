export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1400px] animate-pulse pb-12">
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-x-10">
        <div className="min-w-0 flex-1 space-y-6 lg:max-w-[calc((100%-2.5rem)*8/12)]">
          <div className="h-24 rounded-2xl bg-cos-bg" />
          <div className="h-40 rounded-2xl border border-cos-border bg-cos-card" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-36 rounded-2xl border border-cos-border bg-cos-card" />
            <div className="h-36 rounded-2xl border border-cos-border bg-cos-card" />
          </div>
          <div className="h-48 rounded-2xl border border-cos-border bg-cos-card" />
        </div>
        <div className="mt-8 hidden w-full space-y-4 lg:mt-0 lg:block lg:w-[calc((100%-2.5rem)*4/12)]">
          <div className="h-56 rounded-2xl border border-cos-border bg-cos-card" />
          <div className="h-40 rounded-2xl border border-cos-border bg-cos-card" />
        </div>
      </div>
    </div>
  );
}
