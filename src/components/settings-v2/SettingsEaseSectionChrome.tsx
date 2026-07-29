import Link from "next/link";
import type { ReactNode } from "react";

const frauncesStyle = {
  fontFamily: "var(--font-fraunces), Georgia, serif",
} as const;

interface SettingsEaseSectionChromeProps {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
  "data-settings-ease"?: string;
}

/**
 * Light cream/Fraunces chrome for Branding-linked settings pages
 * (AI Brain, Inbox AI, Communication Plans) that still host denser editors inside.
 */
export function SettingsEaseSectionChrome({
  title,
  description,
  backHref = "/settings/branding",
  backLabel = "← Branding",
  actions,
  children,
  "data-settings-ease": dataAttr,
}: SettingsEaseSectionChromeProps) {
  return (
    <section data-settings-ease={dataAttr}>
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <Link
            href={backHref}
            className="mb-2 inline-flex text-[13px] font-bold text-[#2f4a3c] hover:text-[#2a2622]"
          >
            {backLabel}
          </Link>
          <h1
            className="m-0 text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2a2622]"
            style={frauncesStyle}
          >
            {title}
          </h1>
          <p className="mt-1.5 mb-0 max-w-[52ch] text-sm leading-snug text-[#5c554c]">
            {description}
          </p>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export const settingsEaseSoftCardClassName =
  "rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]";

export const settingsEasePrimaryBtnClassName =
  "inline-flex items-center justify-center gap-1.5 rounded-full border-none bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px";
