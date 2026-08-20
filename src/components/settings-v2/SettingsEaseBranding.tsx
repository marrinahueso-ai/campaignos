"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AppImage } from "@/components/images/AppImage";
import {
  SETTINGS_EASE_BRANDING_HUB_TILES,
  SETTINGS_EASE_BRANDING_SECTIONS,
  brandingEaseDirectRoute,
  brandingSectionHref,
  type SettingsEaseBrandingHubData,
  type SettingsEaseBrandingHubTile,
  type SettingsEaseBrandingHubTileKind,
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
  kind: SettingsEaseBrandingHubTileKind;
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

function hubTileMeta(
  tile: SettingsEaseBrandingHubTile,
  data: SettingsEaseBrandingHubData,
): ReactNode {
  switch (tile.id) {
    case "ai-inbox":
      return (
        <StatusPill tone={data.inboxSourcesCount > 0 ? "ok" : "off"}>
          {data.inboxSourcesCount === 1
            ? "1 source"
            : data.inboxSourcesCount === 0
              ? "No sources yet"
              : `${data.inboxSourcesCount} sources`}
        </StatusPill>
      );
    case "playbook":
      return (
        <StatusPill tone={data.playbookCount > 0 ? "ok" : "off"}>
          {data.playbookCount === 1
            ? "1 plan"
            : data.playbookCount === 0
              ? "No plans yet"
              : `${data.playbookCount} plans`}
        </StatusPill>
      );
    case "colors-logos":
      return (
        <StatusPill tone={data.brandKitReady ? "ok" : "off"}>
          {data.brandKitReady ? "Colors set" : "Add colors"}
        </StatusPill>
      );
    case "school-year":
      return (
        <StatusPill tone="ok">{data.schoolYearLabel}</StatusPill>
      );
  }
}

function HubTile({
  tile,
  meta,
  href,
  onOpen,
}: {
  tile: SettingsEaseBrandingHubTile;
  meta: ReactNode;
  href: string;
  onOpen?: () => void;
}) {
  return (
    <Link
      href={href}
      data-branding-hub-tile={tile.id}
      className="flex h-full flex-col rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 text-left shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(42,38,34,0.12)]"
      onClick={
        onOpen
          ? (event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              event.preventDefault();
              onOpen();
            }
          : undefined
      }
    >
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-[rgba(47,74,60,0.1)] text-[#2f4a3c]">
        <HubTileIcon kind={tile.kind} />
      </div>
      <h3
        className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
        style={frauncesStyle}
      >
        {tile.title}
      </h3>
      <p className="mt-1.5 mb-0 text-[13px] leading-snug text-[#5c554c]">
        {tile.description}
      </p>
      <div className="mt-3.5">{meta}</div>
    </Link>
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
            How {orgName} looks and how the year is planned.
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
          className="grid grid-cols-1 items-stretch gap-3.5 sm:grid-cols-2"
          data-branding-panel="hub"
          data-branding-hub="tiles"
        >
          {SETTINGS_EASE_BRANDING_HUB_TILES.map((tile) => {
            const directHref = brandingEaseDirectRoute(tile.id);
            return (
              <HubTile
                key={tile.id}
                tile={tile}
                href={brandingSectionHref(tile.id)}
                meta={hubTileMeta(tile, data)}
                onOpen={directHref ? undefined : () => setSection(tile.id)}
              />
            );
          })}
        </div>
      ) : null}

      {activeSection === "colors-logos" ? (
        <div
          className="grid grid-cols-1 gap-3.5 lg:grid-cols-2"
          data-branding-panel="colors-logos"
        >
          <SoftCard
            title="Brand kit"
            description="Your colors, logos, and mascot. Change them with Edit branding."
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
            description="PTO and school marks you can add when you create posts or flyers."
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
              Logos and colors are optional in Create with AI — they are not
              added automatically.
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
