interface TasksV2ComingSoonProps {
  label: string;
}

export function TasksV2ComingSoon({ label }: TasksV2ComingSoonProps) {
  return (
    <div className="border border-cos-border bg-cos-card py-16 text-center">
      <p className="font-display text-xl text-cos-text">{label}</p>
      <p className="mt-2 text-sm text-cos-muted">Coming soon — use Main Table for now.</p>
    </div>
  );
}
