"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AppImage } from "@/components/images/AppImage";
import {
  SETTINGS_EASE_BRANDING_SECTIONS,
  brandingEaseDirectRoute,
  brandingSectionHref,
  type SettingsEaseBrandingHubData,
  type SettingsEaseBrandingSection,
} from "@/lib/settings-v2/settings-ease-branding-section";

interface SettingsEaseBrandingProps {
  section: SettingsEaseBrandingSection;
  data: SettingsEaseBrandingHubData;
  schoolYearPanel: ReactNode;
}

const frauncesStyle = {
  fontFamily: "var(--font-fraunces), Georgia, serif",
} as const;

const softCardClassName =
  "rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]";

const btnPrimaryClassName =
  "inline-flex items-center justify-center gap-1.5 rounded-full border-none bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px";

const SECTION_LABELS: Record<SettingsEaseBrandingSection, string> = {
  hub: "Hub",
  "ai-inbox": "AI Inbox",
  playbook: "Communication Plan",
  "colors-logos": "Colors & Logos",
  "school-year": "School Year",
};

function replaceBrandingSection(section: SettingsEaseBrandingSection) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.pathname = "/settings/branding";
  if (section === "hub") {
    url.searchParams.delete("section");
  } else {
    url.searchParams.set("section", section);
  }
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "off" | "warn";
  children: ReactNode;
}) {
  const className =
    tone === "ok"
      ? "inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-1 text-xs font-bold text-[#2f4a3c]"
      : tone === "warn"
        ? "inline-flex items-center gap-1.5 rounded-full bg-[rgba(196,146,46,0.16)] px-2.5 py-1 text-xs font-bold text-[#7a5a12]"
        : "inline-flex items-center gap-1.5 rounded-full bg-[rgba(122,113,102,0.12)] px-2.5 py-1 text-xs font-bold text-[#7a7166]";
  return <span className={className}>{children}</span>;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-[rgba(42,38,34,0.1)] py-[11px] text-sm last:border-b-0">
      <span className="text-[#7a7166]">{label}</span>
      <span className="text-right font-semibold text-[#2a2622]">{children}</span>
    </div>
  );
}

function LogoPreview({
  url,
  alt,
}: {
  url: string | null;
  alt: string;
}) {
  if (!url) {
    return (
      <span className="text-right font-semibold text-[#2a2622]">
        Not uploaded
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[rgba(42,38,34,0.1)] bg-white"
      data-settings-ease="logo-thumb"
    >
      <AppImage
        src={url}
        alt={alt}
        width={56}
        height={56}
        preset="thumb"
        displayWidth={128}
        displayHeight={128}
        resize="contain"
        className="h-full w-full object-contain object-center p-1"
        sizes="56px"
      />
    </span>
  );
}

function SoftCard({
  title,
  description,
  headerAside,
  children,
  className,
}: {
  title: string;
  description: string;
  headerAside?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${softCardClassName} ${className ?? ""}`}>
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h3
            className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
            style={frauncesStyle}
          >
            {title}
          </h3>
          <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
            {description}
          </p>
        </div>
        {headerAside}
      </div>
      {children}
    </div>
  );
}

function HubTileIcon({
  kind,
}: {
  kind: "inbox" | "playbook" | "colors" | "year";
}) {
  const className = "h-[18px] w-[18px]";
  switch (kind) {
    case "inbox":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path
            d="M4 6h16v12H4z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="m4 7 8 6 8-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "playbook":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path
            d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M5 4v16a3 3 0 0 1 3-3h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "colors":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <circle
            cx="12"
            cy="12"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle
            cx="12"
            cy="12"
            r="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M12 4v2M12 18v2M4 12h2M18 12h2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "year":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M3 10h18M8 3v4M16 3v4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );
  }
}

function HubTile({
  kind,
  title,
  description,
  meta,
  linkLabel,
  href,
  onOpen,
  wide,
}: {
  kind: "inbox" | "playbook" | "colors" | "year";
  title: string;
  description: string;
  meta: ReactNode;
  linkLabel: string;
  href?: string;
  onOpen?: () => void;
  wide?: boolean;
}) {
  const className = `w-full rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 text-left shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(42,38,34,0.12)] ${wide ? "sm:col-span-2" : ""}`;
  const body = (
    <>
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-[rgba(47,74,60,0.1)] text-[#2f4a3c]">
        <HubTileIcon kind={kind} />
      </div>
      <h3
        className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
        style={frauncesStyle}
      >
        {title}
      </h3>
      <p className="mt-1.5 mb-0 text-[13px] leading-snug text-[#5c554c]">
        {description}
      </p>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        {meta}
        <span className="text-[13px] font-bold text-[#2f4a3c]">{linkLabel}</span>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onOpen} className={className}>
      {body}
    </button>
  );
}

export function SettingsEaseBranding({
  section,
  data,
  schoolYearPanel,
}: SettingsEaseBrandingProps) {
  const [activeSection, setActiveSection] =
    useState<SettingsEaseBrandingSection>(section);

  function setSection(next: SettingsEaseBrandingSection) {
    setActiveSection(next);
    replaceBrandingSection(next);
  }

  const orgName =
    data.organizationShortName === "Not set up"
      ? "your school"
      : data.organizationShortName;

  return (
    <section className="settings-ease-branding" data-settings-ease="branding">
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1
            className="m-0 text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2a2622]"
            style={frauncesStyle}
          >
            Branding
          </h1>
          <p className="mt-1.5 mb-0 max-w-[52ch] text-sm leading-snug text-[#5c554c]">
            How {orgName} looks and plans the year — inbox sources,
            communication plans, brand kit, and school year in one calm home.
          </p>
        </div>
      </div>

      <div
        className="mb-[18px] flex flex-wrap gap-2"
        role="tablist"
        aria-label="Branding sections"
      >
        {SETTINGS_EASE_BRANDING_SECTIONS.map((id) => {
          const directHref = brandingEaseDirectRoute(id);
          const active = !directHref && activeSection === id;
          const className = active
            ? "rounded-full border-[1.5px] border-[#2f4a3c] bg-[#2f4a3c] px-4 py-2 text-[13px] font-bold text-[#f6f2eb] transition-transform duration-100 hover:-translate-y-px"
            : "rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[rgba(246,242,235,0.7)] px-4 py-2 text-[13px] font-bold text-[#5c554c] transition-transform duration-100 hover:-translate-y-px hover:text-[#2a2622]";

          if (directHref) {
            return (
              <Link
                key={id}
                href={directHref}
                role="tab"
                aria-selected={false}
                className={className}
              >
                {SECTION_LABELS[id]}
              </Link>
            );
          }

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={className}
              onClick={() => setSection(id)}
            >
              {SECTION_LABELS[id]}
            </button>
          );
        })}
      </div>

      {activeSection === "hub" ? (
        <div
          className="grid grid-cols-1 gap-3.5 sm:grid-cols-2"
          data-branding-panel="hub"
        >
          <HubTile
            kind="inbox"
            title="AI Inbox"
            description="Named sources and links so Inbox AI can match questions to the right school page."
            meta={
              <StatusPill tone={data.inboxSourcesCount > 0 ? "ok" : "off"}>
                {data.inboxSourcesCount === 1
                  ? "1 source"
                  : `${data.inboxSourcesCount} sources`}
              </StatusPill>
            }
            linkLabel="Manage sources →"
            href={brandingSectionHref("ai-inbox")}
          />
          <HubTile
            kind="playbook"
            title="Communication Plan"
            description="Communication Plans and countdown plans assigned by event type."
            meta={
              <StatusPill tone={data.playbookCount > 0 ? "ok" : "off"}>
                {data.playbookCount === 1
                  ? "1 communication plan"
                  : `${data.playbookCount} communication plans`}
              </StatusPill>
            }
            linkLabel="Open library →"
            href={brandingSectionHref("playbook")}
          />
          <HubTile
            kind="colors"
            title="Branding Colors and Logos"
            description="Brand kit — PTO + school logos, colors, mascot. Same surface as onboarding Edit branding."
            meta={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-3.5 w-3.5 rounded"
                  style={{ background: data.primaryColor }}
                  aria-hidden
                />
                <span
                  className="h-3.5 w-3.5 rounded"
                  style={{ background: data.accentColor }}
                  aria-hidden
                />
              </span>
            }
            linkLabel="Edit brand kit →"
            onOpen={() => setSection("colors-logos")}
          />
          <HubTile
            kind="year"
            title="School Year"
            description="Active year scopes calendar, events, and import review — still here, nested under Branding."
            meta={
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(47,74,60,0.14)] bg-[rgba(47,74,60,0.08)] px-3.5 py-2 text-[13px] font-bold text-[#2f4a3c]">
                Active · {data.schoolYearLabel}
              </span>
            }
            linkLabel="Manage year →"
            onOpen={() => setSection("school-year")}
            wide
          />
        </div>
      ) : null}

      {activeSection === "colors-logos" ? (
        <div
          className="grid grid-cols-1 gap-3.5 lg:grid-cols-2"
          data-branding-panel="colors-logos"
        >
          <SoftCard
            title="Brand kit"
            description="Maps to shipped /onboarding/brand?standalone=1 — Edit branding from Organization today."
            headerAside={
              <Link
                href="/onboarding/brand?standalone=1"
                className={btnPrimaryClassName}
              >
                Edit branding
              </Link>
            }
          >
            <DetailRow label="Primary">
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-3.5 w-3.5 rounded"
                  style={{ background: data.primaryColor }}
                  aria-hidden
                />
                {data.primaryColor.toUpperCase()}
              </span>
            </DetailRow>
            <DetailRow label="Accent">
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-3.5 w-3.5 rounded"
                  style={{ background: data.accentColor }}
                  aria-hidden
                />
                {data.accentColor.toUpperCase()}
              </span>
            </DetailRow>
            <DetailRow label="Font style">{data.fontStyle}</DetailRow>
            <DetailRow label="Mascot">{data.mascotLabel}</DetailRow>
          </SoftCard>
          <SoftCard
            title="Logos"
            description="PTO + school marks used when creators opt into brand kit."
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-[rgba(42,38,34,0.1)] py-[11px] text-sm">
              <span className="text-[#7a7166]">PTO logo</span>
              <LogoPreview url={data.ptoLogoUrl} alt="PTO logo" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-[11px] text-sm">
              <span className="text-[#7a7166]">School logo</span>
              <LogoPreview url={data.schoolLogoUrl} alt="School logo" />
            </div>
            <p className="mt-3.5 mb-0 text-[13px] leading-snug text-[#5c554c]">
              Artwork guidance: logo / brand colors are explicit opt-in in Create
              with AI — the kit is not auto-applied.
            </p>
          </SoftCard>
        </div>
      ) : null}

      {activeSection === "school-year" ? (
        <div data-branding-panel="school-year">{schoolYearPanel}</div>
      ) : null}
    </section>
  );
}
