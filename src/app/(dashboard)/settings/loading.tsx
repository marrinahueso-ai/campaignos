export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-16 animate-pulse rounded-md bg-cos-bg-alt" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-md bg-cos-bg-alt" />
        <div className="h-40 animate-pulse rounded-md bg-cos-bg-alt" />
      </div>
      <div className="h-64 animate-pulse rounded-md bg-cos-bg-alt" />
    </div>
  );
}
