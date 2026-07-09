interface TasksV2OwnerAvatarProps {
  name: string | null;
  initials: string | null;
}

export function TasksV2OwnerAvatar({ name, initials }: TasksV2OwnerAvatarProps) {
  if (initials) {
    return (
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2a2622] text-[10px] font-semibold text-[#f6f2eb]"
        title={name ?? undefined}
      >
        {initials}
      </span>
    );
  }

  if (name) {
    return (
      <span className="truncate text-sm text-cos-text" title={name}>
        {name}
      </span>
    );
  }

  return <span className="text-sm text-cos-muted">—</span>;
}
