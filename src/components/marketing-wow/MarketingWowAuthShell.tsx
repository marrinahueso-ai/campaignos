import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingWowFloatingNav } from "@/components/marketing-wow/MarketingWowFloatingNav";
import "./marketing-wow.css";

interface MarketingWowAuthShellProps {
  imageSrc: string;
  visualTitle: string;
  visualSupport: string;
  /** Wider panel for plan chooser cards. */
  wide?: boolean;
  children: ReactNode;
}

export function MarketingWowAuthShell({
  imageSrc,
  visualTitle,
  visualSupport,
  wide = false,
  children,
}: MarketingWowAuthShellProps) {
  return (
    <div className="mw">
      <div className="auth-shell">
        <aside className="auth-visual" aria-hidden="true">
          {/* Native img matches mockup layout (absolute cover) without Next Image wrappers. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt="" />
          <div className="auth-visual-veil" />
          <div className="auth-visual-copy">
            <h2>{visualTitle}</h2>
            <p>{visualSupport}</p>
          </div>
        </aside>
        <div className="auth-panel">
          <div className={wide ? "auth-card auth-card--wide" : "auth-card"}>
            <Link href="/" className="auth-logo">
              Hey Ralli
            </Link>
            {children}
          </div>
        </div>
      </div>
      <MarketingWowFloatingNav />
    </div>
  );
}

export function MarketingWowLegalLinks() {
  return (
    <div className="legal-links">
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
      <a href="mailto:hello@heyralli.com">Support</a>
    </div>
  );
}
