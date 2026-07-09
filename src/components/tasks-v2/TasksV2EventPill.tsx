import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface TasksV2EventPillProps {
  title: string;
  accentColor: string;
  href?: string;
  className?: string;
}

export function TasksV2EventPill({
  title,
  accentColor,
  href,
  className,
}: TasksV2EventPillProps) {
  const pill = (
    <span
      className={cn(
        "inline-flex max-w-[10rem] truncate rounded-full px-2.5 py-1 text-[11px] font-semibold",
        className,
      )}
      style={{
        backgroundColor: `${accentColor}22`,
        color: accentColor,
      }}
    >
      {title}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-80">
        {pill}
      </Link>
    );
  }

  return pill;
}
