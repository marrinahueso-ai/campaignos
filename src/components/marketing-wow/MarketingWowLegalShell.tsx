import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingWowFloatingNav } from "@/components/marketing-wow/MarketingWowFloatingNav";
import "./marketing-wow.css";

export function MarketingWowLegalShell({ children }: { children: ReactNode }) {
  return (
    <div className="mw">
      <div className="legal-shell">
        <div className="legal-top">
          <Link href="/" className="auth-logo">
            Hey Ralli
          </Link>
          <Link
            href="/"
            className="btn btn-soft"
            style={{ padding: "10px 16px", fontSize: 14 }}
          >
            Back to home
          </Link>
        </div>
        <article className="legal-doc">{children}</article>
      </div>
      <MarketingWowFloatingNav />
    </div>
  );
}
