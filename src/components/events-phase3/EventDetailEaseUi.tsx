import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export function EaseSectionLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <p className="mb-3 flex flex-wrap items-baseline justify-between gap-3 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
      <span>{children}</span>
      {hint ? (
        <span className="text-[12px] font-semibold tracking-normal text-cos-muted normal-case">
          {hint}
        </span>
      ) : null}
    </p>
  );
}

export function EaseBox({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-cos-border bg-cos-card px-5 py-[18px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EaseBoxTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display text-xl font-semibold tracking-[-0.02em] text-cos-text">
      {children}
    </h3>
  );
}

export function EaseBoxDesc({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 mb-3.5 text-[13px] leading-snug text-cos-muted">
      {children}
    </p>
  );
}

export function EaseSplit({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
      {children}
    </div>
  );
}

export function EaseFocusCard({
  artClassName,
  art,
  children,
}: {
  artClassName?: string;
  art?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="grid overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)] md:grid-cols-[140px_1fr]">
      <div
        className={cn(
          "relative min-h-[120px] bg-gradient-to-br from-[#1e4a3a] via-[#6b8171] to-[#c4922e] md:min-h-[180px]",
          artClassName,
        )}
        aria-hidden
      >
        {art}
      </div>
      <div className="flex flex-col gap-2.5 px-[22px] pt-[22px] pb-[18px]">
        {children}
      </div>
    </article>
  );
}

export function EaseQueue({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

export function EaseRow({
  title,
  meta,
  status,
  statusTone = "open",
  onClick,
  as = "button",
}: {
  title: string;
  meta?: string;
  status?: string;
  statusTone?: "needs" | "open" | "done" | "sched";
  onClick?: () => void;
  as?: "button" | "div";
}) {
  const toneClass = {
    needs: "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]",
    open: "bg-[rgba(166,90,58,0.12)] text-[#a65a3a]",
    done: "bg-[rgba(42,122,134,0.12)] text-[#2a7a86]",
    sched: "bg-[rgba(196,146,46,0.16)] text-[#7a5a12]",
  }[statusTone];

  const body = (
    <>
      <span className="min-w-0">
        <strong className="mb-0.5 block text-sm font-bold text-cos-text">
          {title}
        </strong>
        {meta ? <p className="m-0 text-xs text-cos-muted">{meta}</p> : null}
      </span>
      {status ? (
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] whitespace-nowrap uppercase",
            toneClass,
          )}
        >
          {status}
        </span>
      ) : null}
    </>
  );

  const className =
    "grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-transparent bg-[rgba(255,252,247,0.55)] px-3.5 py-3 text-left text-inherit transition hover:border-cos-border hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)]";

  if (as === "div" || !onClick) {
    return (
      <div className={cn(className, "cursor-default hover:shadow-none")}>
        {body}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

export function EaseBtnPrimary({
  children,
  onClick,
  href,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const className =
    "inline-flex items-center gap-1.5 rounded-full bg-cos-text px-[18px] py-[11px] text-[13px] font-bold text-cos-card transition hover:-translate-y-px hover:bg-[#1a1714] disabled:opacity-60";
  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

export function EaseBtnSecondary({
  children,
  onClick,
  href,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const className =
    "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition hover:-translate-y-px disabled:opacity-60";
  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

export function EaseSoftActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-auto flex flex-wrap gap-2 pt-2">{children}</div>
  );
}

export function EaseChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warn" | "forest" | "draft";
}) {
  const toneClass = {
    neutral: "bg-[rgba(255,252,247,0.92)] text-cos-text",
    warn: "bg-[rgba(166,90,58,0.12)] text-[#a65a3a]",
    forest: "bg-[rgba(47,74,60,0.12)] text-[#2f4a3c]",
    draft: "bg-[rgba(166,90,58,0.95)] text-white",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] uppercase",
        toneClass,
      )}
    >
      {children}
    </span>
  );
}

export function EaseKpi({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-transparent bg-[rgba(255,252,247,0.65)] p-3.5">
      <strong className="block font-display text-[26px] font-semibold tracking-[-0.02em] text-cos-text">
        {value}
      </strong>
      <span className="text-xs font-semibold text-cos-muted">{label}</span>
    </div>
  );
}

export function EaseListRail({
  countLabel,
  sort,
  onSortChange,
  sortOptions,
  sortLabel = "Sort",
}: {
  countLabel?: string;
  sort: string;
  onSortChange: (value: string) => void;
  sortOptions: Array<{ id: string; label: string }>;
  sortLabel?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      {countLabel ? (
        <span className="text-xs font-semibold text-cos-muted">{countLabel}</span>
      ) : (
        <span aria-hidden className="min-w-0 flex-1" />
      )}
      <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-cos-muted">
        <span>{sortLabel}</span>
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          aria-label={`${sortLabel} approvals`}
          className="rounded-full border border-cos-border bg-[rgba(255,252,247,0.65)] px-3 py-1.5 text-xs font-bold text-cos-text"
        >
          {sortOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function EasePulseMini({
  tabs,
  activeId,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="mb-4 flex min-w-0 flex-nowrap gap-2 overflow-x-auto"
      role="tablist"
      aria-label="Approval filters"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "shrink-0 rounded-full border border-transparent px-3 py-1.5 text-xs font-bold transition",
              active
                ? "border-cos-border bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                : "bg-transparent text-cos-muted hover:text-cos-text",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? ` ${tab.count}` : ""}
          </button>
        );
      })}
    </div>
  );
}
