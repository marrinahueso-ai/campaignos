export default function VendorProfileLoading() {
  return (
    <div className="studio-page space-y-6 pb-12">
      <div className="h-4 w-40 animate-pulse rounded bg-cos-bg-alt" />
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-cos-bg-alt" />
        <div className="space-y-2">
          <div className="h-10 w-56 animate-pulse rounded-lg bg-cos-bg-alt" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-cos-bg-alt" />
        </div>
      </div>
      <div className="flex gap-2 border-b border-cos-border pb-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-8 w-20 animate-pulse rounded bg-cos-bg-alt"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-cos-bg-alt" />
        <div className="h-40 animate-pulse rounded-2xl bg-cos-bg-alt" />
      </div>
    </div>
  );
}
