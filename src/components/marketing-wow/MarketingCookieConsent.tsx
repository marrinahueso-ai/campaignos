"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "heyralli-cookie-consent";

type ConsentValue = "accepted" | "essential";

export function MarketingCookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== "accepted" && stored !== "essential") {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function choose(value: ConsentValue) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore quota / private mode
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-bar show" role="dialog" aria-label="Cookie notice">
      <p>
        We use essential cookies to keep you signed in, plus optional analytics
        to improve Hey Ralli. See{" "}
        <Link href="/privacy" className="btn-text">
          Privacy
        </Link>{" "}
        for details.
      </p>
      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: "10px 16px", fontSize: 14 }}
          onClick={() => choose("accepted")}
        >
          Accept
        </button>
        <button
          type="button"
          className="btn btn-ghost-dark"
          style={{ padding: "10px 16px", fontSize: 14 }}
          onClick={() => choose("essential")}
        >
          Essential only
        </button>
      </div>
    </div>
  );
}
