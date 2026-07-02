interface EventDetailsChangedNoticeProps {
  className?: string;
}

export function EventDetailsChangedNotice({
  className = "",
}: EventDetailsChangedNoticeProps) {
  return (
    <p
      className={`rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 ${className}`.trim()}
      role="status"
    >
      Event details changed. Draft again if you want updated wording.
    </p>
  );
}
