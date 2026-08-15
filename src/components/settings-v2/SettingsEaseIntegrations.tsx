import Link from "next/link";
import { buildOAuthStartPath } from "@/lib/integrations/oauth";
import type { SettingsEaseIntegrationsData } from "@/lib/settings-v2/queries";

interface SettingsEaseIntegrationsProps {
  data: SettingsEaseIntegrationsData;
}

const btnPrimaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-none bg-[#2a2622] px-[18px] py-[11px] text-[13px] font-bold text-[#fffcf7] transition-transform duration-100 hover:-translate-y-px";

const btnSecondaryClassName =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[18px] py-[11px] text-[13px] font-bold text-[#2a2622] transition-transform duration-100 hover:-translate-y-px";

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "off" | "warn";
  children: React.ReactNode;
}) {
  return (
    <span
      className={
        tone === "ok"
          ? "inline-flex items-center gap-1.5 rounded-full bg-[rgba(47,74,60,0.1)] px-2.5 py-1 text-xs font-bold text-[#2f4a3c]"
          : tone === "warn"
            ? "inline-flex items-center gap-1.5 rounded-full bg-[rgba(166,124,0,0.14)] px-2.5 py-1 text-xs font-bold text-[#8a6700]"
            : "inline-flex items-center gap-1.5 rounded-full bg-[rgba(122,113,102,0.12)] px-2.5 py-1 text-xs font-bold text-[#7a7166]"
      }
    >
      {tone === "ok" ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}

function IntegrationLogoMark({
  kind,
}: {
  kind: "meta" | "gcal" | "canva";
}) {
  const styles: Record<typeof kind, string> = {
    meta: "bg-[linear-gradient(135deg,#1877f2,#c13584)] text-[#fffcf7]",
    gcal: "bg-[#2a7a86] text-[#fffcf7]",
    canva: "bg-[#7b61ff] text-[#fffcf7]",
  };
  const labels: Record<typeof kind, string> = {
    meta: "M",
    gcal: "G",
    canva: "C",
  };

  return (
    <div
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[13px] font-extrabold ${styles[kind]}`}
      aria-hidden
    >
      {labels[kind]}
    </div>
  );
}

function IntegrationRow({
  kind,
  title,
  description,
  actions,
}: {
  kind: "meta" | "gcal" | "canva";
  title: string;
  description: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(42,38,34,0.1)] py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        <IntegrationLogoMark kind={kind} />
        <div className="min-w-0">
          <h4 className="m-0 text-sm font-bold text-[#2a2622]">{title}</h4>
          <p className="mt-[3px] mb-0 max-w-[42ch] text-xs leading-[1.4] text-[#5c554c]">
            {description}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

export function SettingsEaseIntegrations({ data }: SettingsEaseIntegrationsProps) {
  const connectedCount = [
    data.meta.connected,
    data.googleCalendar.connected,
    data.canva.connected,
  ].filter(Boolean).length;

  const canvaConnectHref = data.canva.configured
    ? buildOAuthStartPath("canva", { returnTo: "/settings/canva" })
    : "/settings/canva";

  return (
    <section data-settings-ease="integrations">
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1
            className="m-0 text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Integrations
          </h1>
          <p className="mt-1.5 mb-0 max-w-[48ch] text-sm leading-snug text-[#5c554c]">
            Connect once per tool — approve what Facebook or Google shows, then
            Hey Ralli uses that connection across the app.
          </p>
        </div>
      </div>

      <div className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] px-[22px] py-5 shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
        <div className="mb-3.5">
          <h3
            className="m-0 text-xl font-semibold tracking-[-0.01em] text-[#2a2622]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            Available
          </h3>
          <p className="mt-1 mb-0 text-[13px] leading-snug text-[#5c554c]">
            {connectedCount} connected · Meta review–friendly labels
          </p>
        </div>

        <div className="flex flex-col">
          <IntegrationRow
            kind="meta"
            title="Facebook & Instagram"
            description="Connect your Facebook Page and linked Instagram account to publish posts, reply in inbox, and pull Insights."
            actions={
              <>
                <StatusPill
                  tone={
                    data.meta.reconnectRequired
                      ? "warn"
                      : data.meta.connected
                        ? "ok"
                        : "off"
                  }
                >
                  {data.meta.reconnectRequired
                    ? "Reconnect needed"
                    : data.meta.connected
                      ? "Connected"
                      : "Not connected"}
                </StatusPill>
                {data.meta.connected ? (
                  <Link href="/settings/meta" className={btnSecondaryClassName}>
                    Manage
                  </Link>
                ) : (
                  <Link
                    href={
                      data.meta.available
                        ? buildOAuthStartPath("meta", {
                            returnTo: "/settings/meta",
                          })
                        : "/settings/meta"
                    }
                    className={btnPrimaryClassName}
                  >
                    Connect
                  </Link>
                )}
              </>
            }
          />

          <IntegrationRow
            kind="gcal"
            title="Google Calendar"
            description="Sign in with Google to bring organization events in. File upload and import review stay on Calendar → Import."
            actions={
              <>
                <StatusPill tone={data.googleCalendar.connected ? "ok" : "off"}>
                  {data.googleCalendar.connected ? "Connected" : "Not connected"}
                </StatusPill>
                {data.googleCalendar.connected ? (
                  <Link
                    href="/settings/integrations/calendar"
                    className={btnSecondaryClassName}
                  >
                    Manage
                  </Link>
                ) : (
                  <Link
                    href={
                      data.googleCalendar.configured
                        ? buildOAuthStartPath("google", {
                            returnTo: "/settings/integrations/calendar",
                          })
                        : "/settings/integrations/calendar"
                    }
                    className={btnPrimaryClassName}
                  >
                    Connect
                  </Link>
                )}
              </>
            }
          />

          <IntegrationRow
            kind="canva"
            title="Canva"
            description="Import designs as inspiration images for Creative Setup."
            actions={
              <>
                <StatusPill tone={data.canva.connected ? "ok" : "off"}>
                  {data.canva.connected ? "Connected" : "Not connected"}
                </StatusPill>
                {data.canva.connected ? (
                  <Link href="/settings/canva" className={btnSecondaryClassName}>
                    Manage
                  </Link>
                ) : (
                  <a href={canvaConnectHref} className={btnPrimaryClassName}>
                    Connect Canva
                  </a>
                )}
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
