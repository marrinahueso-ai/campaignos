"use client";

/** Six-dot drag affordance matching Hey Ralli calendar cards. */
export function DemoGrip({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        "grid shrink-0 grid-cols-2 gap-0.5 self-center p-0.5 text-[var(--cos-muted)]"
      }
      aria-hidden
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="h-0.5 w-0.5 rounded-full bg-current sm:h-1 sm:w-1"
        />
      ))}
    </span>
  );
}
